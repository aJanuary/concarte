#!/usr/bin/env tsx
// Runs all generators. Used directly for one-off generation (`pnpm generate`)
// and as the entry point for `tsx watch` (`pnpm dev`), which re-imports this
// (and everything it imports) whenever a dependency changes.
import "./generate-config.js";
import "./generate-theme-css.js";
