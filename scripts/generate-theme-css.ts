#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { eventDir, loadEventConfig } from "./lib/event.js";
import { green } from "./lib/console-color.js";

async function main() {
  const config = await loadEventConfig();

  const themeCss = `@theme {
  ${Object.entries(config.theme)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join("\n")}
  }
  `;

  const outputDir = join(process.cwd(), "generated");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "theme.css");
  writeFileSync(outputPath, themeCss, "utf-8");

  console.log(
    ` ${green("✓")} Generated generated/theme.css from ${eventDir}/concarte.json`,
  );
}

main();
