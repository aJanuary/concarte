/** App-wide preferences, kept per machine rather than per event. */

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export type Settings = {
  appearance: { theme: Theme };
};

export type SettingsUpdate = {
  [Section in keyof Settings]?: Partial<Settings[Section]>;
};

export const DEFAULT_SETTINGS: Settings = {
  appearance: { theme: "system" },
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Keeps only the recognised, valid values in `raw`. */
export function validUpdate(raw: unknown): SettingsUpdate {
  const update: SettingsUpdate = {};
  const theme = record(record(raw).appearance).theme;
  if (THEMES.includes(theme as Theme)) {
    update.appearance = { theme: theme as Theme };
  }
  return update;
}

/** Fills anything missing or invalid in `raw` from the defaults. */
export function parseSettings(raw: unknown): Settings {
  const valid = validUpdate(raw);
  return {
    appearance: { ...DEFAULT_SETTINGS.appearance, ...valid.appearance },
  };
}

/**
 * Applies `update` to the stored object, keeping keys this version doesn't
 * know: a newer version of the app may have written them.
 */
export function mergeStored(
  stored: unknown,
  update: SettingsUpdate,
): Record<string, unknown> {
  const result = { ...record(stored) };
  for (const [section, values] of Object.entries(update)) {
    result[section] = { ...record(result[section]), ...values };
  }
  return result;
}
