#!/usr/bin/env tsx
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import config from "../app/config.js";
import { green } from "./lib/console-color.js";

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

console.log(` ${green("✓")} Generated generated/theme.css from app/config.ts`);
