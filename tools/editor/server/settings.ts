import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";
import {
  mergeStored,
  parseSettings,
  validUpdate,
  type Settings,
} from "../shared/settings.ts";

function readStored(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

export function readSettings(file: string): Settings {
  return parseSettings(readStored(file));
}

/** Saves the valid parts of `update` and returns the resulting settings. */
export function updateSettings(file: string, update: unknown): Settings {
  const stored = mergeStored(readStored(file), validUpdate(update));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(stored, null, 2));
  return parseSettings(stored);
}
