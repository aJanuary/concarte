#!/usr/bin/env tsx
// Packages the editor as a desktop app for the current platform.
//
// The app directory doubles as a copy of the site (the editor's Build runs
// the site's own build) so it gets its own package.json and node_modules,
// holding what the site's build needs.
//
//   pnpm editor:package [--dir]     --dir skips the installer, for testing
import { execFileSync } from "child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const editor = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(editor, "..");
const site = join(root, "site");
const stage = join(root, "build", "editor-package");
const bundle = join(root, "build", "editor-package-bundle");
const output = join(root, "build", "editor-dist");

function run(command: string, args: string[], cwd = editor) {
  // pnpm is a .cmd shim on Windows, which needs a shell to launch.
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

// Pinned to what the repository has installed, so a package built today
// matches the one that was tested.
function installed(name: string, from: string): string {
  const file = join(from, "node_modules", name, "package.json");
  if (!existsSync(file)) {
    throw new Error(`${name} is not installed; run pnpm install`);
  }
  return (JSON.parse(readFileSync(file, "utf8")) as { version: string })
    .version;
}

rmSync(stage, { recursive: true, force: true });

// The site's files (its package.json's "files") and everything its build
// needs, core included, installed from the repository's lockfile. The editor
// itself is bundled, so it adds nothing here. A flat node_modules: symlinks
// don't survive being copied to every OS.
run(
  "pnpm",
  [
    "--filter",
    "@concarte/site",
    "deploy",
    "--config.node-linker=hoisted",
    "--ignore-scripts",
    stage,
  ],
  root,
);

// Bundled separately because deploy needs an empty directory and the bundler
// empties its own.
run("pnpm", ["exec", "tsx", "scripts/build-editor-app.ts", bundle]);
cpSync(bundle, stage, { recursive: true });
rmSync(bundle, { recursive: true, force: true });

// Lets the installed editor tell whether its copy of the site is current.
writeFileSync(join(stage, "build-id.txt"), String(Date.now()));

// A flat node_modules exposes every transitive @types package, and tsconfig
// includes all visible ones implicitly, including some that are broken alone.
const tsconfig = JSON.parse(
  readFileSync(join(site, "tsconfig.json"), "utf8"),
) as { compilerOptions: Record<string, unknown> };
tsconfig.compilerOptions.types = ["node", "react", "react-dom"];
writeFileSync(join(stage, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

// The editor runs the site's scripts directly, so the app's manifest only
// describes the app.
writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: "concarte-editor",
      productName: "ConCarte Editor",
      version: (
        JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
          version: string;
        }
      ).version,
      description: "Editor for ConCarte event maps",
      author: "ConCarte",
      type: "module",
      main: "main.mjs",
    },
    null,
    2,
  ),
);

// One 512px PNG in electron-builder's build resources; it converts it for
// macOS and Windows.
mkdirSync(join(stage, "build"), { recursive: true });
cpSync(join(editor, "packaging", "icon.png"), join(stage, "build", "icon.png"));

const electronVersion = installed("electron", editor);
const targets = process.argv.includes("--dir") ? ["--dir"] : [];
run("pnpm", [
  "exec",
  "electron-builder",
  "--projectDir",
  stage,
  "--config",
  join(editor, "packaging", "electron-builder.yml"),
  `-c.electronVersion=${electronVersion}`,
  `-c.afterPack=${join(editor, "packaging", "copy-node-modules.cjs")}`,
  `-c.directories.output=${output}`,
  "--publish",
  "never",
  ...targets,
]);

console.log(`Packaged the editor into ${output}`);
