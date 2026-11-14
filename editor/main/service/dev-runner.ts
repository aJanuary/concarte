import type { ChildProcess } from "child_process";
import { createRequire } from "module";
import { createServer } from "net";
import { join } from "path";
import {
  exitCode,
  spawnSiteProcess,
  type SiteProcessOptions,
} from "./site-process.ts";

export type DevRunnerOptions = SiteProcessOptions & {
  /** Runs before the first start, e.g. to make the site copy. */
  prepare?: (log: (text: string) => void) => Promise<void>;
  /** Overridable so tests don't run a real Next server. */
  commands?: (
    siteRoot: string,
    eventDir: string,
    port: number,
  ) => { once: string[][]; long: string[][] };
};

export type DevStart = { ok: true; url: string } | { ok: false; error: string };

const READY_TIMEOUT = 120_000;
const LOG_LIMIT = 20_000;

function defaultCommands(siteRoot: string, eventDir: string, port: number) {
  const require = createRequire(join(siteRoot, "package.json"));
  const tsx = require.resolve("tsx/cli");
  return {
    once: [[tsx, "scripts/generate.ts"]],
    long: [
      [
        tsx,
        "watch",
        "--include",
        join(eventDir, "**", "*"),
        "scripts/generate.ts",
      ],
      [
        require.resolve("next/dist/bin/next"),
        "dev",
        "-p",
        String(port),
        "-H",
        "127.0.0.1",
      ],
    ],
  };
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function killTree(child: ChildProcess) {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }
  try {
    // Children are their own process group, so tsx's own child goes too.
    process.kill(process.platform === "win32" ? child.pid : -child.pid);
  } catch {
    child.kill();
  }
}

/** Runs the site's dev server (`pnpm dev`) for the open event. */
export function createDevRunner(options: DevRunnerOptions) {
  const { siteRoot } = options;
  let children: ChildProcess[] = [];
  let running: { eventDir: string; url: string } | undefined;
  let starting: Promise<DevStart> | undefined;
  let log = "";

  const append = (text: string) => {
    log = (log + text).slice(-LOG_LIMIT);
  };

  function spawnNode(args: string[], eventDir: string): ChildProcess {
    const child = spawnSiteProcess(options, args, eventDir, append, {
      detached: process.platform !== "win32",
    });
    children.push(child);
    return child;
  }

  function runOnce(args: string[], eventDir: string): Promise<number> {
    append(`> ${args.slice(1).join(" ")}\n`);
    return exitCode(spawnNode(args, eventDir), append);
  }

  async function waitForServer(url: string, exited: Promise<string>) {
    const deadline = Date.now() + READY_TIMEOUT;
    while (Date.now() < deadline) {
      const failure = await Promise.race([
        exited,
        new Promise<undefined>((resolve) => setTimeout(resolve, 250)),
      ]);
      if (failure !== undefined) {
        throw new Error(failure);
      }
      try {
        await fetch(url, { signal: AbortSignal.timeout(2000) });
        return;
      } catch {
        // not listening yet
      }
    }
    throw new Error("The dev server didn't start in time");
  }

  async function launch(eventDir: string): Promise<DevStart> {
    log = "";
    try {
      await options.prepare?.(append);
      const port = await freePort();
      const url = `http://127.0.0.1:${port}/`;
      const plan = (options.commands ?? defaultCommands)(
        siteRoot,
        eventDir,
        port,
      );
      for (const args of plan.once) {
        if ((await runOnce(args, eventDir)) !== 0) {
          throw new Error("Generating the site's files failed");
        }
      }
      const exited = new Promise<string>((resolve) => {
        for (const args of plan.long) {
          const child = spawnNode(args, eventDir);
          child.on("error", (e) => resolve(e.message));
          child.on("close", () => {
            children = children.filter((c) => c !== child);
            resolve("The dev server stopped unexpectedly");
            // Without either half the preview is broken, so stop the other.
            if (running) {
              void stop();
            }
          });
        }
      });
      await waitForServer(url, exited);
      running = { eventDir, url };
      return { ok: true, url };
    } catch (e) {
      // Stack frames would crowd out the message naming what went wrong.
      const tail = log
        .trim()
        .split("\n")
        .filter((line) => !/^\s+at /.test(line))
        .slice(-8)
        .join("\n");
      await stop();
      return {
        ok: false,
        error: `${(e as Error).message}${tail ? `\n${tail}` : ""}`,
      };
    }
  }

  /** Starts the dev server unless it's already serving this event. */
  async function start(eventDir: string): Promise<DevStart> {
    if (running && running.eventDir === eventDir) {
      return { ok: true, url: running.url };
    }
    if (starting) {
      return starting;
    }
    await stop();
    starting = launch(eventDir).finally(() => {
      starting = undefined;
    });
    return starting;
  }

  async function stop(): Promise<void> {
    running = undefined;
    const closing = children;
    children = [];
    await Promise.all(
      closing.map(
        (child) =>
          new Promise<void>((resolve) => {
            if (child.exitCode !== null || child.signalCode !== null) {
              resolve();
              return;
            }
            child.once("close", () => resolve());
            killTree(child);
          }),
      ),
    );
  }

  return { start, stop, url: () => running?.url };
}

export type DevRunner = ReturnType<typeof createDevRunner>;
