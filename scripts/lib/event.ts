import { existsSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import type { Config } from "../../app/config.types";

const root = process.cwd();

export const eventName = process.env.CONCARTE_EVENT || "default";
export const eventDir = join(root, "events", eventName);
export const assetsDir = join(eventDir, "assets");

export async function loadEventConfig(): Promise<Config> {
  const configPath = join(eventDir, "config.ts");
  if (!existsSync(configPath)) {
    console.error(
      `No config found at events/${eventName}/config.ts. ` +
        `Set CONCARTE_EVENT to the name of a directory in events/.`,
    );
    process.exit(1);
  }
  return (await import(pathToFileURL(configPath).href)).default;
}
