import { ChildProcess, spawn } from "child_process";
import {
  cpSync,
  existsSync,
  readdirSync,
  rmSync,
  renameSync,
  statSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { createRequire } from "module";
import { join } from "path";
import type { BuildState } from "../shared/api.ts";

export type Command = { args: string[]; env?: Record<string, string> };

export type BuildRunnerOptions = {
  /** A writable copy of the site. */
  siteRoot: string;
  /** Node, or the Electron binary acting as Node. */
  nodePath: string;
  onChange: (state: BuildState) => void;
  /** Runs before each build, e.g. to make the site copy; logs what it does. */
  prepare?: (log: (text: string) => void) => Promise<void>;
  /** Overridable so tests don't run a real Next build. */
  commands?: (siteRoot: string) => Command[];
};

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
const BUILD_INFO = ".concarte-build.json";

function defaultCommands(siteRoot: string): Command[] {
  const require = createRequire(join(siteRoot, "package.json"));
  return [
    { args: [require.resolve("tsx/cli"), "scripts/generate.ts"] },
    // Turbopack runs PostCSS in a `node` it finds on PATH, which the
    // packaged editor can't rely on; webpack runs it in-process.
    { args: [require.resolve("next/dist/bin/next"), "build", "--webpack"] },
  ];
}

function newestChange(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(entry.parentPath, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestChange(path));
    } else {
      newest = Math.max(newest, statSync(path).mtimeMs);
    }
  }
  return newest;
}

/** Whether `dist/` is missing or older than the config or the assets. */
export function buildFreshness(
  eventDir: string,
): "missing" | "stale" | "fresh" {
  const info = join(eventDir, "dist", BUILD_INFO);
  if (!existsSync(info)) {
    return "missing";
  }
  const { builtAt } = JSON.parse(readFileSync(info, "utf8")) as {
    builtAt: number;
  };
  const assets = join(eventDir, "assets");
  const newest = Math.max(
    statSync(join(eventDir, "concarte.json")).mtimeMs,
    existsSync(assets) ? newestChange(assets) : 0,
  );
  return newest > builtAt ? "stale" : "fresh";
}

export function createBuildRunner(options: BuildRunnerOptions) {
  const { siteRoot, nodePath, onChange } = options;
  let state: BuildState = { status: "idle", log: "" };
  let child: ChildProcess | undefined;
  let cancelled = false;

  const update = (patch: Partial<BuildState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };
  const append = (text: string) =>
    update({ log: state.log + text.replace(ANSI, "") });

  function run(command: Command, eventDir: string): Promise<number> {
    return new Promise((resolve) => {
      child = spawn(nodePath, command.args, {
        cwd: siteRoot,
        env: {
          ...process.env,
          ...command.env,
          ELECTRON_RUN_AS_NODE: "1",
          CONCARTE_EVENT_DIR: eventDir,
          NEXT_TELEMETRY_DISABLED: "1",
          FORCE_COLOR: "0",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout?.on("data", (chunk) => append(String(chunk)));
      child.stderr?.on("data", (chunk) => append(String(chunk)));
      child.on("error", (e) => {
        append(`${e.message}\n`);
        resolve(1);
      });
      child.on("close", (code) => resolve(code ?? 1));
    });
  }

  /** Returns false if a build is already running. */
  function start(eventDir: string): boolean {
    if (state.status === "running") {
      return false;
    }
    cancelled = false;
    state = { status: "running", log: "" };
    onChange(state);
    void execute(eventDir);
    return true;
  }

  async function execute(eventDir: string): Promise<void> {
    try {
      await options.prepare?.(append);
      const out = join(siteRoot, "out");
      rmSync(out, { recursive: true, force: true });
      for (const command of (options.commands ?? defaultCommands)(siteRoot)) {
        append(`> ${command.args.slice(1).join(" ")}\n`);
        const code = await run(command, eventDir);
        if (cancelled) {
          update({ status: "cancelled" });
          return;
        }
        if (code !== 0) {
          update({ status: "failed" });
          return;
        }
      }
      // Copied beside dist/ and renamed, so a failed copy leaves the previous
      // build intact.
      const dist = join(eventDir, "dist");
      const next = join(eventDir, "dist.new");
      rmSync(next, { recursive: true, force: true });
      cpSync(out, next, { recursive: true });
      writeFileSync(
        join(next, BUILD_INFO),
        JSON.stringify({ builtAt: Date.now() }),
      );
      rmSync(dist, { recursive: true, force: true });
      renameSync(next, dist);
      append(`\nBuilt ${dist}\n`);
      update({ status: "succeeded" });
    } catch (e) {
      append(`${(e as Error).message}\n`);
      update({ status: "failed" });
    }
  }

  function cancel() {
    if (state.status === "running" && child) {
      cancelled = true;
      child.kill();
    }
  }

  return { start, cancel, state: () => state };
}
