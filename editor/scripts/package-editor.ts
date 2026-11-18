#!/usr/bin/env tsx
// Packages the editor as a desktop app for the current platform.
//
// The editor's Build runs the site's own build, so the app carries the site
// and the node_modules it needs, packed into one archive that the editor
// unpacks before its first Build.
//
//   pnpm editor:package [--dir]     --dir skips the installer, for testing
import { execFileSync } from "child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { create as createArchive } from "tar";
import { fileURLToPath } from "url";
import { SITE_ARCHIVE } from "../main/site-copy.ts";

const editor = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(editor, "..");
const site = join(root, "site");
const stage = join(root, "build", "editor-package");
const siteStage = join(root, "build", "editor-package-site");
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
rmSync(siteStage, { recursive: true, force: true });

// The site's files (its package.json's "files") and everything its build
// needs, core included, installed from the repository's lockfile. A flat
// node_modules: the archive is unpacked as is on every OS.
run(
  "pnpm",
  [
    "--filter",
    "@concarte/site",
    "deploy",
    "--config.node-linker=hoisted",
    // Hard links into pnpm's store would be archived as links, which tar
    // stalls on and which would unpack as links on users' machines.
    "--config.package-import-method=copy",
    "--ignore-scripts",
    siteStage,
  ],
  root,
);

// A flat node_modules exposes every transitive @types package, and tsconfig
// includes all visible ones implicitly, including some that are broken alone.
const tsconfig = JSON.parse(
  readFileSync(join(site, "tsconfig.json"), "utf8"),
) as { compilerOptions: Record<string, unknown> };
tsconfig.compilerOptions.types = ["node", "react", "react-dom"];
writeFileSync(
  join(siteStage, "tsconfig.json"),
  JSON.stringify(tsconfig, null, 2),
);

// The bundler empties its output directory, so it goes first.
run("pnpm", ["exec", "tsx", "scripts/build-editor-app.ts", stage]);

await createArchive(
  {
    gzip: true,
    file: join(stage, SITE_ARCHIVE),
    cwd: siteStage,
    portable: true,
    // The editor resolves the site's tools directly rather than through
    // .bin, whose symlinks don't unpack everywhere.
    filter: (path) =>
      !path.endsWith(".map") && !/(^|\/)node_modules\/\.bin(\/|$)/.test(path),
  },
  readdirSync(siteStage),
);
rmSync(siteStage, { recursive: true, force: true });

// Read before the first Build has unpacked the site.
cpSync(join(site, "app", "messages"), join(stage, "app", "messages"), {
  recursive: true,
});

// Lets the installed editor tell whether its copy of the site is current.
writeFileSync(join(stage, "build-id.txt"), String(Date.now()));

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
  `-c.directories.output=${output}`,
  "--publish",
  "never",
  ...targets,
]);

console.log(`Packaged the editor into ${output}`);
