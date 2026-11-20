/**
 * The canonical form of a site address as typed: no surrounding space or
 * trailing `/`, a path with one leading `/` and no repeated `/`, and
 * undefined for the root. Anything the config doesn't allow is kept, so
 * validation can point it out.
 */
export function normalizeSiteUrl(typed: string): string | undefined {
  const trimmed = typed.trim();
  if (!trimmed.startsWith("/")) {
    return trimmed.replace(/\/+$/, "") || undefined;
  }
  const segments = trimmed.split("/").filter((s) => s !== "");
  return segments.length === 0 ? undefined : `/${segments.join("/")}`;
}
