import { spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { delimiter, join } from "path";

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

export type SiteProcessOptions = {
  /** A writable copy of the site. */
  siteRoot: string;
  /** Node, or the Electron binary acting as Node. */
  nodePath: string;
};

/**
 * Makes a folder holding a `node` command that runs `nodePath`, for PATH.
 *
 * Turbopack runs PostCSS in whatever `node` is on PATH, and a machine with
 * only the editor installed has none. Not on Windows: Turbopack would only
 * find a real node.exe there, so the site's Next config avoids needing one.
 */
export function nodeLauncherDir(
  { siteRoot, nodePath }: SiteProcessOptions,
  platform = process.platform,
): string | undefined {
  if (platform === "win32") {
    return undefined;
  }
  // Out of node_modules/.bin, which package scripts put on PATH: there the
  // launcher would start the editor for anything that ran `node`.
  const dir = join(siteRoot, "node_modules", ".cache", "concarte-node");
  const file = join(dir, "node");
  const quoted = `'${nodePath.replaceAll("'", `'\\''`)}'`;
  const script = `#!/bin/sh\nELECTRON_RUN_AS_NODE=1 exec ${quoted} "$@"\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== script) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, script, { mode: 0o755 });
  }
  return dir;
}

/**
 * Runs one of the site's own scripts (generate, next) against an event,
 * passing its output to `onOutput` as plain text.
 */
export function spawnSiteProcess(
  options: SiteProcessOptions,
  args: string[],
  eventDir: string,
  onOutput: (text: string) => void,
  spawnOptions: { detached?: boolean; env?: Record<string, string> } = {},
): ChildProcess {
  const launcherDir = nodeLauncherDir(options);
  const child = spawn(options.nodePath, args, {
    cwd: options.siteRoot,
    detached: spawnOptions.detached,
    env: {
      ...process.env,
      ...spawnOptions.env,
      ...(launcherDir && {
        PATH: [launcherDir, process.env.PATH].filter(Boolean).join(delimiter),
      }),
      ELECTRON_RUN_AS_NODE: "1",
      CONCARTE_EVENT_DIR: eventDir,
      NEXT_TELEMETRY_DISABLED: "1",
      FORCE_COLOR: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const forward = (chunk: unknown) => onOutput(String(chunk).replace(ANSI, ""));
  child.stdout?.on("data", forward);
  child.stderr?.on("data", forward);
  return child;
}

/** Resolves with the exit code, or 1 if the process couldn't be started. */
export function exitCode(
  child: ChildProcess,
  onOutput: (text: string) => void,
): Promise<number> {
  return new Promise((resolve) => {
    child.on("error", (e) => {
      onOutput(`${e.message}\n`);
      resolve(1);
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}
