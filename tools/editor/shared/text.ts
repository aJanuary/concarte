import { dedent } from "../../../app/text-utils.ts";

// The runtime dedents and trims markdown on load. dedent throws on text with
// no non-blank line, so blank text is handled first.
export const tidyText = (value: string) =>
  value.trim() === "" ? "" : dedent(value).trim();
