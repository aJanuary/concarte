import type { ChildProcess } from "child_process";
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
import type { BuildState } from "../../shared/api.ts";
import { ASSETS_DIR, CONFIG_FILE } from "../../shared/schema.ts";
import {
  exitCode,
  spawnSiteProcess,
  type SiteProcessOptions,
} from "./site-process.ts";

export type Command = { args: string[]; env?: Record<string, string> };

export type BuildRunnerOptions = SiteProcessOptions & {
  onChange: (state: BuildState) => void;
  /** Runs before each build, e.g. to make the site copy; logs what it does. */
  prepare?: (log: (text: string) => void) => Promise<void>;
  /** Overridable so tests don't run a real Next build. */
  commands?: (siteRoot: string) => Command[];
};

const BUILD_INFO = ".concarte-build.json";

function defaultCommands(siteRoot: string): Command[] {
  const require = createRequire(join(siteRoot, "package.json"));
  return [
    { args: [require.resolve("tsx/cli"), "scripts/generate.ts"] },
    { args: [require.resolve("next/dist/bin/next"), "build"] },
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
  const assets = join(eventDir, ASSETS_DIR);
  const newest = Math.max(
    statSync(join(eventDir, CONFIG_FILE)).mtimeMs,
    existsSync(assets) ? newestChange(assets) : 0,
  );
  return newest > builtAt ? "stale" : "fresh";
}

export function createBuildRunner(options: BuildRunnerOptions) {
  const { siteRoot, onChange } = options;
  let state: BuildState = { status: "idle", log: "" };
  let child: ChildProcess | undefined;
  let cancelled = false;

  const update = (patch: Partial<BuildState>) => {
    state = { ...state, ...patch };
    onChange(state);
  };
  const append = (text: string) => update({ log: state.log + text });

  function run(command: Command, eventDir: string): Promise<number> {
    child = spawnSiteProcess(options, command.args, eventDir, append, {
      env: command.env,
    });
    return exitCode(child, append);
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
