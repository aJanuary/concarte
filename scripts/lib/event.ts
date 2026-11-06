import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import type { Config } from "../../app/config.types.ts";

const configuredDir = process.env.CONCARTE_EVENT_DIR;

if (!configuredDir) {
  console.error(
    "CONCARTE_EVENT_DIR must be set to the folder containing the event's " +
      "concarte.json and assets/.",
  );
  process.exit(1);
}

export const eventDir = resolve(configuredDir);
export const assetsDir = join(eventDir, "assets");

export async function loadEventConfig(): Promise<Config> {
  const configPath = join(eventDir, "concarte.json");
  if (!existsSync(configPath)) {
    console.error(`No config found at ${configPath}.`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf-8")) as Config;
  } catch (error) {
    console.error(
      `${configPath} could not be read: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
