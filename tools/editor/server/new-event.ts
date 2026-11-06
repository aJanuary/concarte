import { existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { basename, join } from "path";
import { minimalConfig } from "./minimal-config.ts";
import { serializeConfig } from "./serialize.ts";

// Left behind by file managers; not the user's content.
const IGNORED = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

export type NewEventResult =
  | { ok: true }
  | { ok: false; reason: "not-empty" | "has-config"; message: string };

/** Writes a minimal event into an empty folder. */
export async function createEvent(dir: string): Promise<NewEventResult> {
  if (existsSync(join(dir, "concarte.json"))) {
    return {
      ok: false,
      reason: "has-config",
      message: "That folder already contains an event.",
    };
  }
  const existing = existsSync(dir)
    ? readdirSync(dir).filter((name) => !IGNORED.has(name))
    : [];
  if (existing.length > 0) {
    return {
      ok: false,
      reason: "not-empty",
      message: "Choose an empty folder for a new event.",
    };
  }
  mkdirSync(join(dir, "assets"), { recursive: true });
  const configPath = join(dir, "concarte.json");
  writeFileSync(configPath, serializeConfig(minimalConfig(basename(dir))));
  writeFileSync(join(dir, ".gitignore"), "dist/\ndist.new/\n");
  return { ok: true };
}
