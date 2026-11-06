import type { Config } from "./schema.ts";

export type LoadResponse = {
  eventName: string;
  eventDir: string;
  mtime: number;
  errors: string[];
  locales: string[];
  config: Config | null;
};

export type SaveRequest = {
  config: Config;
  mtime: number;
  force?: boolean;
};

export type SaveResponse =
  | { ok: true; mtime: number }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "invalid"; errors: string[] };

/** Vite HMR custom event sent when a file under the assets directory changes. */
export const ASSET_CHANGED_EVENT = "concarte:asset-changed";
