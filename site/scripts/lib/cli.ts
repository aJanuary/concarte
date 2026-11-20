import { green } from "./console-color.ts";
import { EventError, eventDirFromEnv } from "./event.ts";
import type { Generator } from "./generators.ts";

/**
 * Runs generators for the event in `CONCARTE_EVENT_DIR` against the site in
 * the working directory, as the `pnpm generate*` scripts do.
 * `--preview-images` renders link preview images, which only a build needs.
 */
export async function runGenerators(generators: Generator[]): Promise<void> {
  try {
    const target = {
      eventDir: eventDirFromEnv(),
      siteRoot: process.cwd(),
      previewImages: process.argv.includes("--preview-images"),
    };
    for (const generate of generators) {
      console.log(` ${green("✓")} ${await generate(target)}`);
    }
  } catch (error) {
    if (!(error instanceof EventError)) {
      throw error;
    }
    console.error(error.message);
    process.exit(1);
  }
}
