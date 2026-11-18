#!/usr/bin/env tsx
// Bundles the editor app (main process, preload script, UI) into an output
// directory, `build/editor` unless given as the first argument.
import { execFileSync } from "child_process";
import { build as esbuild } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, rmSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { build as vite } from "vite";
import type { BuildInfo } from "../shared/build-info.ts";

const editor = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(editor, "..", "build", "editor"));

/** The commit being built, or null outside a git checkout. */
function commit(): string | null {
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: editor, encoding: "utf8" }).trim();
  try {
    const hash = git("rev-parse", "--short", "HEAD");
    return git("status", "--porcelain") === "" ? hash : `${hash}-dirty`;
  } catch {
    return null;
  }
}

const buildInfo: BuildInfo = {
  version: (
    JSON.parse(readFileSync(join(editor, "..", "package.json"), "utf8")) as {
      version: string;
    }
  ).version,
  commit: commit(),
  date: new Date().toISOString(),
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const common = {
  bundle: true,
  platform: "node",
  target: "node22",
  logLevel: "warning",
} as const;

await esbuild({
  ...common,
  entryPoints: [join(editor, "main", "main.ts")],
  outfile: join(out, "main.mjs"),
  format: "esm",
  external: ["electron"],
  banner: {
    js: `import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);`,
  },
});

// The window icon on Linux; the installers get theirs from electron-builder.
copyFileSync(join(editor, "packaging", "icon.png"), join(out, "icon.png"));

await esbuild({
  ...common,
  entryPoints: [join(editor, "preload", "preload.cts")],
  outfile: join(out, "preload.cjs"),
  format: "cjs",
  external: ["electron"],
});

await vite({
  configFile: join(editor, "vite.config.ts"),
  logLevel: "warn",
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  build: {
    outDir: join(out, "ui"),
    emptyOutDir: true,
    // Served from local disk inside Electron, so bundle size costs no download
    chunkSizeWarningLimit: 2000,
  },
});

console.log(`Built the editor app into ${out}`);
