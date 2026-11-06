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
  | { ok: false; reason: "conflict" };

/** Server-sent event names of `/api/events`. */
export const SSE_ASSET_CHANGED = "asset-changed";
export const SSE_BUILD = "build";

export type RecentEvent = { path: string; exists: boolean };

export type SessionResponse = {
  /** Whether Build and Preview are available in this host. */
  canBuild: boolean;
  event: { dir: string; name: string } | null;
  recents: RecentEvent[];
};

export type BuildState = {
  status: "idle" | "running" | "succeeded" | "failed" | "cancelled";
  log: string;
};

export type BuildResponse = BuildState & {
  /** Whether dist/ is missing, older than the event's files, or current. */
  freshness: "missing" | "stale" | "fresh";
};

/** The saved config has errors, so there is nothing valid to build. */
export type InvalidConfigResponse = {
  ok: false;
  reason: "invalid";
  errors: string[];
};

export type BuildStartResponse = BuildResponse | InvalidConfigResponse;

export type PreviewResponse =
  | { ok: true; url: string }
  | InvalidConfigResponse
  | { ok: false; reason: "no-event" }
  | { ok: false; reason: "failed"; error: string };

export type ImportSvgResponse = { asset: string } | { error: string };

export type FaviconResponse = { ok: true } | { error: string };
