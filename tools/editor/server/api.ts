import type { IncomingMessage, ServerResponse } from "http";
import { basename, extname, join } from "path";
import { readFileSync } from "fs";
import {
  type BuildResponse,
  type FaviconResponse,
  type ImportSvgResponse,
  type PreviewResponse,
  type SaveRequest,
  type SessionResponse,
} from "../shared/api.ts";
import { buildFreshness } from "./build-runner.ts";
import type { EditorHost } from "./editor-host.ts";
import { FaviconError, SvgImportError } from "./event-store.ts";

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

// Not /assets/, which is where the built editor UI keeps its own files.
const EVENT_ASSETS = "/event-assets/";
const MAX_UPLOAD = 20 * 1024 * 1024;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit = MAX_UPLOAD): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("The request is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * The API writes to the user's files, so it must not be reachable by other
 * websites: a page open in the same browser can send requests to localhost.
 * Checking Host defeats DNS rebinding, and Origin defeats cross-site requests.
 */
export function isTrustedRequest(req: IncomingMessage): boolean {
  const host = req.headers.host ?? "";
  const hostname = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  if (!LOCAL_HOSTS.has(hostname)) {
    return false;
  }
  const origin = req.headers.origin;
  return origin === undefined || origin === `http://${host}`;
}

/** Returns a handler that answers `/api/*` and `/assets/*`, or false. */
export function createApi(host: EditorHost) {
  const streams = new Set<ServerResponse>();
  host.subscribe((event, data) => {
    for (const res of streams) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  });

  function buildResponse(): BuildResponse {
    const state = host.runner?.state() ?? { status: "idle", log: "" };
    const store = host.store();
    return {
      ...state,
      freshness: store ? buildFreshness(store.eventDir) : "missing",
    } as BuildResponse;
  }

  return async function handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;
    if (!path.startsWith("/api/") && !path.startsWith(EVENT_ASSETS)) {
      return false;
    }
    if (!isTrustedRequest(req)) {
      sendJson(res, 403, { error: "Forbidden" });
      return true;
    }
    try {
      const store = host.store();
      const method = req.method;

      if (path === "/api/session" && method === "GET") {
        const body: SessionResponse = {
          canBuild: host.canBuild,
          event: store
            ? { dir: store.eventDir, name: basename(store.eventDir) }
            : null,
          recents: host.recents(),
        };
        sendJson(res, 200, body);
        return true;
      }

      if (path === "/api/events" && method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write(": connected\n\n");
        streams.add(res);
        req.on("close", () => streams.delete(res));
        return true;
      }

      if (path === "/api/build") {
        if (!host.runner) {
          sendJson(res, 404, { error: "Building is not available here" });
        } else if (method === "GET") {
          sendJson(res, 200, buildResponse());
        } else if (method === "POST" && store) {
          const errors = await store.validate();
          if (errors.length > 0) {
            sendJson(res, 422, { ok: false, reason: "invalid", errors });
            return true;
          }
          // A build and the dev server would both write to .next.
          await host.dev?.stop();
          const started = host.runner.start(store.eventDir);
          sendJson(res, started ? 202 : 409, buildResponse());
        } else if (method === "DELETE") {
          host.runner.cancel();
          sendJson(res, 200, buildResponse());
        } else {
          sendJson(res, 405, { error: "Method not allowed" });
        }
        return true;
      }

      if (path === "/api/preview" && method === "POST") {
        let body: PreviewResponse;
        if (!store || !host.dev) {
          body = { ok: false, reason: "no-event" };
        } else {
          const errors = await store.validate();
          if (errors.length > 0) {
            body = { ok: false, reason: "invalid", errors };
          } else {
            const result = await host.dev.start(store.eventDir);
            if (result.ok) {
              host.openUrl(result.url);
              body = { ok: true, url: result.url };
            } else {
              body = { ok: false, reason: "failed", error: result.error };
            }
          }
        }
        sendJson(res, 200, body);
        return true;
      }

      if (path === "/api/reveal-dist" && method === "POST" && store) {
        host.reveal(join(store.eventDir, "dist"));
        sendJson(res, 200, { ok: true });
        return true;
      }

      if (!store) {
        sendJson(res, 409, { error: "No event is open" });
        return true;
      }

      if (path === "/api/reveal-asset" && method === "POST") {
        const file = store.resolveAsset(url.searchParams.get("path") ?? "");
        if (!file) {
          sendJson(res, 404, { error: "That file doesn't exist" });
          return true;
        }
        host.showFile(file);
        sendJson(res, 200, { ok: true });
      } else if (path === "/api/config" && method === "GET") {
        sendJson(res, 200, await store.load());
      } else if (path === "/api/config" && method === "PUT") {
        if (!req.headers["content-type"]?.startsWith("application/json")) {
          sendJson(res, 415, { error: "Expected application/json" });
          return true;
        }
        const body = JSON.parse(
          (await readBody(req)).toString("utf8"),
        ) as SaveRequest;
        const { status, response } = await store.save(body);
        sendJson(res, status, response);
      } else if (path === "/api/assets" && method === "GET") {
        sendJson(res, 200, await store.listAssets());
      } else if (path === "/api/assets" && method === "POST") {
        const name = url.searchParams.get("name") ?? "map.svg";
        try {
          const body: ImportSvgResponse = store.importSvg(
            name,
            await readBody(req),
          );
          sendJson(res, 200, body);
        } catch (e) {
          if (!(e instanceof SvgImportError)) {
            throw e;
          }
          sendJson(res, 400, { error: e.message } satisfies ImportSvgResponse);
        }
      } else if (path === "/api/favicon" && method === "PUT") {
        try {
          store.setFavicon(await readBody(req));
          sendJson(res, 200, { ok: true } satisfies FaviconResponse);
        } catch (e) {
          if (!(e instanceof FaviconError)) {
            throw e;
          }
          sendJson(res, 400, { error: e.message } satisfies FaviconResponse);
        }
      } else if (path === "/api/favicon" && method === "DELETE") {
        store.removeFavicon();
        sendJson(res, 200, { ok: true } satisfies FaviconResponse);
      } else if (path.startsWith(EVENT_ASSETS) && method === "GET") {
        const file = store.resolveAsset(path.slice(EVENT_ASSETS.length));
        if (!file) {
          res.statusCode = 404;
          res.end();
          return true;
        }
        res.setHeader(
          "Content-Type",
          MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
        );
        res.setHeader("Cache-Control", "no-cache");
        res.end(readFileSync(file));
      } else {
        res.statusCode = 404;
        res.end();
      }
    } catch (e) {
      sendJson(res, 500, { error: (e as Error).message });
    }
    return true;
  };
}
