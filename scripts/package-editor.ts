#!/usr/bin/env tsx
// Packages the editor as a desktop app for the current platform.
//
// The app directory doubles as a copy of the site (the editor's Build runs
// the site's own build) so it gets its own package.json and node_modules,
// holding exactly what the editor and the site's build need at runtime.
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

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(root, "build", "editor-package");
const output = join(root, "build", "editor-dist");

const rootPackage = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as {
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

// Needed at runtime by the editor, or by the site's build (tailwind, the
// type check, the generate scripts).
const FROM_DEV = [
  "@tailwindcss/postcss",
  "@types/mdast",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "@types/unist",
  "postcss",
  "prettier",
  "remark",
  "tailwindcss",
  "tsx",
  "typescript",
  "unist-util-visit",
];

function run(command: string, args: string[], cwd = root) {
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

for (const path of ["app", "next.config.mjs", "postcss.config.mjs"]) {
  cpSync(join(root, path), join(stage, path), { recursive: true });
}
cpSync(join(root, "scripts"), join(stage, "scripts"), {
  recursive: true,
  // Tests need vitest, and the rest of the tooling isn't part of a build.
  filter: (source) =>
    !source.endsWith(".test.ts") &&
    !/scripts[/\\](build-editor-app|package-editor|validate-use-links)\.ts$/.test(
      source,
    ),
});

// Lets the installed editor tell whether its copy of the site is current.
writeFileSync(join(stage, "build-id.txt"), String(Date.now()));

// A flat node_modules exposes every transitive @types package, and tsconfig
// includes all visible ones implicitly, including some that are broken alone.
const tsconfig = JSON.parse(
  readFileSync(join(root, "tsconfig.json"), "utf8"),
) as { compilerOptions: Record<string, unknown> };
tsconfig.compilerOptions.types = ["node", "react", "react-dom"];
writeFileSync(join(stage, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

// Pinned to what the repository has installed, so a package built today
// matches the one that was tested.
function installed(name: string): string {
  const file = join(root, "node_modules", name, "package.json");
  if (!existsSync(file)) {
    throw new Error(`${name} is not installed; run pnpm install`);
  }
  return (JSON.parse(readFileSync(file, "utf8")) as { version: string })
    .version;
}

const dependencies: Record<string, string> = {};
for (const name of [...Object.keys(rootPackage.dependencies), ...FROM_DEV]) {
  dependencies[name] = installed(name);
}

writeFileSync(
  join(stage, "package.json"),
  JSON.stringify(
    {
      name: "concarte-editor",
      productName: "ConCarte Editor",
      version: rootPackage.version,
      description: "Editor for ConCarte event maps",
      author: "ConCarte",
      type: "module",
      main: "main.mjs",
      dependencies,
    },
    null,
    2,
  ),
);

// A flat node_modules: symlinks don't survive being copied to every OS.
run(
  "pnpm",
  ["install", "--node-linker=hoisted", "--ignore-scripts", "--no-lockfile"],
  stage,
);

// One 512px PNG in electron-builder's build resources; it converts it for
// macOS and Windows.
mkdirSync(join(stage, "build"), { recursive: true });
cpSync(
  join(root, "tools", "editor", "app", "icon.png"),
  join(stage, "build", "icon.png"),
);

const electronVersion = installed("electron");
const targets = process.argv.includes("--dir") ? ["--dir"] : [];
run("pnpm", [
  "exec",
  "electron-builder",
  "--projectDir",
  stage,
  "--config",
  join(root, "tools", "editor", "app", "electron-builder.yml"),
  `-c.electronVersion=${electronVersion}`,
  `-c.afterPack=${join(root, "tools", "editor", "app", "copy-node-modules.cjs")}`,
  `-c.directories.output=${output}`,
  "--publish",
  "never",
  ...targets,
]);

console.log(`Packaged the editor into ${output}`);
