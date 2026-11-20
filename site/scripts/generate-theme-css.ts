#!/usr/bin/env tsx
import { runGenerators } from "./lib/cli.ts";
import { generateThemeCss } from "./lib/generators.ts";

await runGenerators([generateThemeCss]);
