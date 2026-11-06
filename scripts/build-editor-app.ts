#!/usr/bin/env tsx
// Bundles the editor app (main process, preload script, UI) into an output
// directory, `build/editor` unless given as the first argument.
import { build as esbuild } from "esbuild";
import { copyFileSync, mkdirSync, rmSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { build as vite } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? join(root, "build", "editor"));
const editor = join(root, "tools", "editor");

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
  entryPoints: [join(editor, "app", "main.ts")],
  outfile: join(out, "main.mjs"),
  format: "esm",
  // prettier loads its parsers dynamically, so it stays a real dependency.
  external: ["electron", "prettier"],
  banner: {
    js: `import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);`,
  },
});

// The window icon on Linux; the installers get theirs from electron-builder.
copyFileSync(join(editor, "app", "icon.png"), join(out, "icon.png"));

await esbuild({
  ...common,
  entryPoints: [join(editor, "app", "preload.cts")],
  outfile: join(out, "preload.cjs"),
  format: "cjs",
  external: ["electron"],
});

await vite({
  configFile: join(editor, "vite.config.ts"),
  logLevel: "warn",
  build: {
    outDir: join(out, "ui"),
    emptyOutDir: true,
    // Served from local disk inside Electron, so bundle size costs no download
    chunkSizeWarningLimit: 2000,
  },
});

console.log(`Built the editor app into ${out}`);
