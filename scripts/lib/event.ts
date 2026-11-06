import { existsSync, readFileSync } from "fs";
import { basename, join, resolve } from "path";
import type { Config } from "../../app/config.types.ts";

const root = process.cwd();

// An absolute folder takes precedence so that an event can live outside the
// repository, which is how the packaged editor builds.
const explicitDir = process.env.CONCARTE_EVENT_DIR;

export const eventName = explicitDir
  ? basename(resolve(explicitDir))
  : process.env.CONCARTE_EVENT || "default";
export const eventDir = explicitDir
  ? resolve(explicitDir)
  : join(root, "events", eventName);
export const assetsDir = join(eventDir, "assets");

/** The event folder as it should appear in messages. */
export const eventLabel = explicitDir ? eventDir : `events/${eventName}`;

export async function loadEventConfig(): Promise<Config> {
  const configPath = join(eventDir, "concarte.json");
  if (!existsSync(configPath)) {
    console.error(
      `No config found at ${eventLabel}/concarte.json. ` +
        `Set CONCARTE_EVENT to the name of a directory in events/.`,
    );
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as Config;
  } catch (error) {
    console.error(
      `${eventLabel}/concarte.json could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
