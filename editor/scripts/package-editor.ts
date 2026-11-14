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
const core = join(root, "core");
const stage = join(root, "build", "editor-package");
const output = join(root, "build", "editor-dist");

type Manifest = {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function manifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

function run(command: string, args: string[], cwd = editor) {
  // pnpm is a .cmd shim on Windows, which needs a shell to launch.
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

run("pnpm", ["exec", "tsx", "scripts/build-editor-app.ts", stage]);

// Tests need vitest, which isn't part of a build.
const notTest = (source: string) => !source.endsWith(".test.ts");

for (const path of [
  "app",
  "scripts",
  "next.config.mjs",
  "postcss.config.mjs",
]) {
  cpSync(join(site, path), join(stage, path), {
    recursive: true,
    filter: notTest,
  });
}

// Lets the installed editor tell whether its copy of the site is current.
writeFileSync(join(stage, "build-id.txt"), String(Date.now()));

// A flat node_modules exposes every transitive @types package, and tsconfig
// includes all visible ones implicitly, including some that are broken alone.
const tsconfig = JSON.parse(
  readFileSync(join(site, "tsconfig.json"), "utf8"),
) as { compilerOptions: Record<string, unknown> };
tsconfig.compilerOptions.types = ["node", "react", "react-dom"];
writeFileSync(join(stage, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

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

// The editor itself is bundled, so the app's node_modules only has to build
// the site: everything the site and core declare. The site's development
// dependencies are included because the build compiles its sources.
const dependencies: Record<string, string> = {};
for (const from of [site, core]) {
  const { dependencies: runtime, devDependencies: development } =
    manifest(from);
  for (const [name, range] of Object.entries({ ...development, ...runtime })) {
    if (!range.startsWith("workspace:")) {
      dependencies[name] = installed(name, from);
    }
  }
}

// The stage is installed outside the workspace, so the overrides in
// pnpm-workspace.yaml have to be carried over: without them resolution picks
// the versions they exist to avoid, which aren't in the lockfile.
const overrides = JSON.parse(
  execFileSync("pnpm", ["config", "get", "overrides", "--json"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  }),
) as Record<string, string> | null;

writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: "concarte-editor",
      productName: "ConCarte Editor",
      version: manifest(root).version,
      description: "Editor for ConCarte event maps",
      author: "ConCarte",
      type: "module",
      main: "main.mjs",
      dependencies,
      pnpm: { overrides: overrides ?? {} },
    },
    null,
    2,
  ),
);

// Seeded with the repository's lockfile so resolution reuses the locked
// versions of every transitive dependency rather than whatever the registry
// serves today.
cpSync(join(root, "pnpm-lock.yaml"), join(stage, "pnpm-lock.yaml"));
const installFlags = [
  // The stage sits inside the repository but is a project of its own.
  "--ignore-workspace",
  "--ignore-scripts",
];
run("pnpm", ["install", "--lockfile-only", ...installFlags], stage);

// Resolution only prefers locked versions; fail if it had to go beyond them.
const lockedPackages = (file: string) =>
  new Set(
    [
      ...readFileSync(file, "utf8").matchAll(
        /^ {2}'?([^\s'][^\n]*?)'?:\n {4}resolution:/gm,
      ),
    ].map((match) => match[1]),
  );
const known = lockedPackages(join(root, "pnpm-lock.yaml"));
const unlocked = [...lockedPackages(join(stage, "pnpm-lock.yaml"))].filter(
  (name) => !known.has(name),
);
if (unlocked.length > 0) {
  throw new Error(
    `Not in the repository lockfile; run pnpm install: ${unlocked.join(", ")}`,
  );
}

// A flat node_modules: symlinks don't survive being copied to every OS.
run(
  "pnpm",
  ["install", "--frozen-lockfile", "--node-linker=hoisted", ...installFlags],
  stage,
);

// The one dependency that doesn't come from the registry.
cpSync(core, join(stage, "node_modules", "@concarte", "core"), {
  recursive: true,
  filter: (source) =>
    notTest(source) && !source.startsWith(join(core, "node_modules")),
});

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
