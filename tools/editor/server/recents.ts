import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

const LIMIT = 10;

export function readRecents(file: string): string[] {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string")
      : [];
  } catch {
    return [];
  }
}

/** Puts `dir` first, removing any earlier occurrence. */
export function addRecent(file: string, dir: string): string[] {
  const recents = [dir, ...readRecents(file).filter((p) => p !== dir)].slice(
    0,
    LIMIT,
  );
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(recents));
  return recents;
}

export function removeRecent(file: string, dir: string): string[] {
  const recents = readRecents(file).filter((p) => p !== dir);
  writeFileSync(file, JSON.stringify(recents));
  return recents;
}

export type RecentEntry = { path: string; exists: boolean };

export function describeRecents(file: string): RecentEntry[] {
  return readRecents(file).map((path) => ({ path, exists: existsSync(path) }));
}
