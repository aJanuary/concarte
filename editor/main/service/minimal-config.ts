import type { Config } from "../../shared/schema.ts";

/** The theme of the example event, so a new event starts readable. */
const THEME: Config["theme"] = {
  background: "#eeece6",
  "control-background": "#ffffff",
  "highlight-background": "#e3e0d8",
  border: "#d6d2c8",
  "primary-text": "#2b2b2b",
  "secondary-text": "#64748b",
  accent: "#087232",
  "highlighted-room-background": "#08723266",
  disabled: "#cbd5e1",
};

export function minimalConfig(eventName: string): Config {
  return {
    eventName,
    locale: "en",
    description: `An interactive map of ${eventName}.`,
    theme: { ...THEME },
    maps: [],
  };
}
