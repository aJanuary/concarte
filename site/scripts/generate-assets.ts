#!/usr/bin/env tsx
import { runGenerators } from "./lib/cli.ts";
import { generateAssets } from "./lib/generators.ts";

await runGenerators([generateAssets]);
