import type { Config } from "../shared/schema.ts";

/** The theme of the example event, so a new event starts readable. */
const THEME: Config["theme"] = {
  background: "#eeece6",
  "control-background": "white",
  "highlight-background": "#e3e0d8",
  border: "#d6d2c8",
  "primary-text": "rgb(43, 43, 43)",
  "secondary-text": "rgb(100 116 139)",
  accent: "rgb(8,114,50)",
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
