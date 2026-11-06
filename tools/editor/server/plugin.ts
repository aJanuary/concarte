import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "fs";
import { readdir } from "fs/promises";
import type { IncomingMessage, ServerResponse } from "http";
import { join, normalize, relative, sep, extname } from "path";
import type { Plugin } from "vite";
import {
  ASSET_CHANGED_EVENT,
  type LoadResponse,
  type SaveRequest,
  type SaveResponse,
} from "../shared/api.ts";
import type { Config } from "../shared/schema.ts";
import { validateConfig } from "../shared/validate.ts";
import { checkConfig } from "./checks.ts";
import { serializeConfig } from "./serialize.ts";

type Options = {
  eventName: string;
  eventDir: string;
  assetsDir: string;
  root: string;
};

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function listLocales(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.slice(0, -".json".length))
        .sort()
    : [];
}

async function listAssets(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"),
    )
    .sort();
}

function resolveAsset(
  assetsDir: string,
  requested: string,
): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    return undefined;
  }
  const full = normalize(join(assetsDir, decoded));
  if (!full.startsWith(assetsDir + sep) || !existsSync(full)) {
    return undefined;
  }
  return statSync(full).isFile() ? full : undefined;
}

export function editorApi(options: Options): Plugin {
  const { eventName, eventDir, assetsDir, root } = options;
  const configPath = join(eventDir, "config.ts");

  return {
    name: "concarte-editor-api",
    // The editor must never exist outside the dev server.
    apply: "serve",
    configureServer(server) {
      async function loadConfig(): Promise<LoadResponse> {
        const base = {
          eventName,
          eventDir: relative(root, eventDir),
          locales: listLocales(join(root, "app", "messages")),
        };
        if (!existsSync(configPath)) {
          return {
            ...base,
            mtime: 0,
            config: null,
            errors: [
              `No config found at ${relative(root, configPath)}. Set CONCARTE_EVENT to the name of a directory in events/.`,
            ],
          };
        }
        const mtime = statSync(configPath).mtimeMs;
        const loaded = server.moduleGraph.getModuleById(configPath);
        if (loaded) {
          server.moduleGraph.invalidateModule(loaded);
        }
        let config: Config;
        try {
          config = (await server.ssrLoadModule(configPath)).default as Config;
        } catch (e) {
          return {
            ...base,
            mtime,
            config: null,
            errors: [`The config could not be loaded: ${(e as Error).message}`],
          };
        }
        const errors = checkConfig(config, (src) => {
          const file = resolveAsset(assetsDir, src.replace(/^\/+/, ""));
          if (!file) {
            return false;
          }
          try {
            readFileSync(file);
            return true;
          } catch {
            return false;
          }
        });
        return {
          ...base,
          mtime,
          config: errors.length > 0 ? null : config,
          errors,
        };
      }

      async function saveConfig(
        req: IncomingMessage,
        res: ServerResponse,
      ): Promise<void> {
        if (!req.headers["content-type"]?.startsWith("application/json")) {
          sendJson(res, 415, { error: "Expected application/json" });
          return;
        }
        const body = JSON.parse(await readBody(req)) as SaveRequest;
        const respond = (status: number, payload: SaveResponse) =>
          sendJson(res, status, payload);

        const errors = validateConfig(body.config)
          .filter((issue) => issue.severity === "error")
          .map((issue) => issue.message);
        if (errors.length > 0) {
          respond(400, { ok: false, reason: "invalid", errors });
          return;
        }
        const source = await serializeConfig(body.config, configPath);
        // No await between this check and the write, so only another process
        // can slip in; serializing is slow, which is why it comes first.
        if (!body.force && statSync(configPath).mtimeMs !== body.mtime) {
          respond(409, { ok: false, reason: "conflict" });
          return;
        }
        // Rename so a crash mid-write can't leave a truncated config.
        const tmpPath = `${configPath}.tmp`;
        writeFileSync(tmpPath, source);
        renameSync(tmpPath, configPath);
        respond(200, { ok: true, mtime: statSync(configPath).mtimeMs });
      }

      // The assets directory is outside the Vite root, so it isn't watched
      // until added.
      server.watcher.add(assetsDir);
      const notifyAsset = (file: string) => {
        const path = relative(assetsDir, file).split(sep).join("/");
        if (!path.startsWith("..")) {
          server.ws.send({
            type: "custom",
            event: ASSET_CHANGED_EVENT,
            data: path,
          });
        }
      };
      server.watcher.on("change", notifyAsset);
      server.watcher.on("unlink", notifyAsset);

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        try {
          if (url.pathname === "/api/config" && req.method === "GET") {
            sendJson(res, 200, await loadConfig());
          } else if (url.pathname === "/api/config" && req.method === "PUT") {
            await saveConfig(req, res);
          } else if (url.pathname === "/api/assets" && req.method === "GET") {
            sendJson(res, 200, await listAssets(assetsDir));
          } else if (
            url.pathname.startsWith("/assets/") &&
            req.method === "GET"
          ) {
            const file = resolveAsset(
              assetsDir,
              url.pathname.slice("/assets/".length),
            );
            if (!file) {
              res.statusCode = 404;
              res.end();
              return;
            }
            res.setHeader(
              "Content-Type",
              MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
            );
            res.setHeader("Cache-Control", "no-cache");
            res.end(readFileSync(file));
          } else {
            next();
          }
        } catch (e) {
          sendJson(res, 500, { error: (e as Error).message });
        }
      });
    },
  };
}
