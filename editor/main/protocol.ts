import { normalize, join, sep } from "path";

/** The scheme the window's page and the open event's files are served on. */
export const SCHEME = "concarte";
const HOST = "app";
export const ORIGIN = `${SCHEME}://${HOST}`;
/** Not /assets/, which is where the built UI keeps its own files. */
const EVENT_ASSETS = "/event-assets/";

export type Resolved = {
  file: string;
  /** Event files change on disk while the editor is open. */
  kind: "ui" | "event-asset";
};

/**
 * The file a request on the app's scheme is for, or undefined when there is
 * none. UI files are confined to `uiDir`, and event files to the open event's
 * assets by `resolveAsset`.
 */
export function resolveRequest(
  url: string,
  options: {
    uiDir: string;
    /** Undefined when no event is open or the asset doesn't exist. */
    resolveAsset: (path: string) => string | undefined;
  },
): Resolved | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  // Not parsed.origin: Node's URL treats every custom scheme as opaque.
  if (parsed.protocol !== `${SCHEME}:` || parsed.host !== HOST) {
    return undefined;
  }
  const { pathname } = parsed;
  if (pathname.startsWith(EVENT_ASSETS)) {
    const file = options.resolveAsset(pathname.slice(EVENT_ASSETS.length));
    return file ? { file, kind: "event-asset" } : undefined;
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const file = normalize(
    join(options.uiDir, decoded === "/" ? "index.html" : decoded),
  );
  return file.startsWith(options.uiDir + sep)
    ? { file, kind: "ui" }
    : undefined;
}
