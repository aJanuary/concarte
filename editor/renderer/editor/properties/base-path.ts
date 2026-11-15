/**
 * The canonical form of a base path as typed: one leading `/`, no trailing or
 * repeated `/`, and undefined for the root. Characters the config doesn't
 * allow are kept, so validation can point them out.
 */
export function normalizeBasePath(typed: string): string | undefined {
  const segments = typed
    .trim()
    .split("/")
    .filter((s) => s !== "");
  return segments.length === 0 ? undefined : `/${segments.join("/")}`;
}
