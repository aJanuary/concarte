#!/usr/bin/env tsx
// Runs all generators. Used directly for one-off generation (`pnpm generate`)
// and as the entry point for `tsx watch` (`pnpm dev`), which re-runs it
// whenever the event's files change.
import { runGenerators } from "./lib/cli.ts";
import { generators } from "./lib/generators.ts";

runGenerators(generators);
