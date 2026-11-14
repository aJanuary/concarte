#!/usr/bin/env tsx
import { runGenerators } from "./lib/cli.ts";
import { generateConfig } from "./lib/generators.ts";

runGenerators([generateConfig]);
