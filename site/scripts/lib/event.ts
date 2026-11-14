import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { CONFIG_FILE, parseConfig, type Config } from "@concarte/core";

/** A problem with the event that its author can fix; the message says how. */
export class EventError extends Error {}

/** The event folder selected by `CONCARTE_EVENT_DIR`. */
export function eventDirFromEnv(): string {
  const configured = process.env.CONCARTE_EVENT_DIR;
  if (!configured) {
    throw new EventError(
      "CONCARTE_EVENT_DIR must be set to the folder containing the event's " +
        `${CONFIG_FILE} and assets/.`,
    );
  }
  return resolve(configured);
}

export function loadEventConfig(eventDir: string): Config {
  const configPath = join(eventDir, CONFIG_FILE);
  if (!existsSync(configPath)) {
    throw new EventError(`No config found at ${configPath}.`);
  }
  const parsed = parseConfig(readFileSync(configPath, "utf-8"));
  if (!parsed.ok) {
    throw new EventError(
      `${configPath} could not be loaded:\n` +
        parsed.errors.map((error) => `  - ${error}`).join("\n"),
    );
  }
  return parsed.config;
}
