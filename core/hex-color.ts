// Six or eight digits only: shorthands are easy to mistype, and every value
// ends up verbatim in the site's generated CSS and map styles.
const HEX_COLOR = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Whether `value` is a theme colour: `#rrggbb`, or `#rrggbbaa` with alpha. */
export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/**
 * The theme colour `text` stands for, written the one way the editor saves
 * it: with `#`, in lowercase, and without an alpha that is fully opaque.
 * Undefined if it isn't a colour.
 */
export function normalizeHexColor(text: string): string | undefined {
  const trimmed = text.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!isHexColor(withHash)) {
    return undefined;
  }
  const lower = withHash.toLowerCase();
  return lower.length === 9 && lower.endsWith("ff") ? lower.slice(0, 7) : lower;
}
