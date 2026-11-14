import { green } from "./console-color.ts";
import { EventError, eventDirFromEnv } from "./event.ts";
import type { Generator } from "./generators.ts";

/**
 * Runs generators for the event in `CONCARTE_EVENT_DIR` against the site in
 * the working directory, as the `pnpm generate*` scripts do.
 */
export function runGenerators(generators: Generator[]): void {
  try {
    const target = { eventDir: eventDirFromEnv(), siteRoot: process.cwd() };
    for (const generate of generators) {
      console.log(` ${green("✓")} ${generate(target)}`);
    }
  } catch (error) {
    if (!(error instanceof EventError)) {
      throw error;
    }
    console.error(error.message);
    process.exit(1);
  }
}
