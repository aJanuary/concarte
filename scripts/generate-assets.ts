#!/usr/bin/env tsx
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "fs";
import { join } from "path";
import { assetsDir, eventDir } from "./lib/event.js";
import { green } from "./lib/console-color.js";

const root = process.cwd();
const publicDir = join(root, "public");

if (!existsSync(assetsDir)) {
  console.error(`No assets directory at ${eventDir}/assets.`);
  process.exit(1);
}

// Wiped first so files from a previously selected event don't leak into the build
rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(assetsDir, publicDir, { recursive: true });

// Next only picks up the favicon from the app directory
const favicon = join(publicDir, "favicon.ico");
if (existsSync(favicon)) {
  renameSync(favicon, join(root, "app", "favicon.ico"));
}

console.log(` ${green("✓")} Copied ${eventDir}/assets to public/`);
