import type { Config } from "./schema";

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
