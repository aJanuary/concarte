import type { Config } from "./config.types.ts";
import { migrateConfig } from "./migrate-config.ts";

type Check = (value: unknown, path: string, problems: string[]) => void;

const string: Check = (value, path, problems) => {
  if (typeof value !== "string") {
    problems.push(`${path} must be text`);
  }
};

const boolean: Check = (value, path, problems) => {
  if (typeof value !== "boolean") {
    problems.push(`${path} must be true or false`);
  }
};

const optional =
  (check: Check): Check =>
  (value, path, problems) => {
    if (value !== undefined) {
      check(value, path, problems);
    }
  };

const list =
  (check: Check): Check =>
  (value, path, problems) => {
    if (!Array.isArray(value)) {
      problems.push(`${path} must be a list`);
      return;
    }
    value.forEach((item, index) => check(item, `${path}[${index}]`, problems));
  };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const keyPath = (path: string, key: string) =>
  /^[A-Za-z_]\w*$/.test(key) ? `${path}.${key}` : `${path}["${key}"]`;

// Unknown keys are refused rather than ignored: the editor writes back only
// the keys it knows, so loading a file from a newer version would silently
// drop whatever that version added.
const object =
  (fields: Record<string, Check>): Check =>
  (value, path, problems) => {
    if (!isObject(value)) {
      problems.push(`${path} must be an object`);
      return;
    }
    for (const [key, check] of Object.entries(fields)) {
      check(value[key], keyPath(path, key), problems);
    }
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(fields, key)) {
        problems.push(`${keyPath(path, key)} is not a known setting`);
      }
    }
  };

// The site and the editor only draw SVGs, and rooms are elements within them.
const svgPath: Check = (value, path, problems) => {
  if (typeof value !== "string" || !value.toLowerCase().endsWith(".svg")) {
    problems.push(`${path} must be the path of an SVG file`);
  }
};

const room = object({
  id: string,
  label: string,
  aliases: optional(list(string)),
  description: optional(string),
  link: optional(object({ href: string, title: string })),
  searchable: optional(boolean),
  shape: string,
});

const map = object({
  id: string,
  label: string,
  src: svgPath,
  overlays: optional(list(object({ id: string, label: string, src: svgPath }))),
  rooms: list(room),
});

/** The theme colours, in the order they are written out. */
export const THEME_KEYS = [
  "background",
  "control-background",
  "highlight-background",
  "border",
  "primary-text",
  "secondary-text",
  "accent",
  "highlighted-room-background",
  "disabled",
] as const satisfies readonly (keyof Config["theme"])[];

const config = object({
  eventName: string,
  locale: string,
  basePath: optional(string),
  description: string,
  attributions: optional(list(string)),
  // Whether each is a colour is left to validateConfig, so a file with a
  // mistyped colour still opens in the editor to be fixed.
  theme: object(Object.fromEntries(THEME_KEYS.map((key) => [key, string]))),
  filters: optional(list(string)),
  defaultMap: optional(string),
  maps: list(map),
});

/**
 * Where `value` doesn't have the structure of a `Config`; empty when it does.
 * Says nothing about whether the values make sense: see `validateConfig`.
 * That maps and overlays are SVG files counts as structure, since the format
 * has no place for any other kind.
 */
export function configShapeProblems(value: unknown): string[] {
  const problems: string[] = [];
  config(value, "config", problems);
  return problems.map((problem) => problem.replace(/^config\./, ""));
}

export type ParsedConfig =
  { ok: true; config: Config } | { ok: false; errors: string[] };

/**
 * Reads the text of a config file, refusing anything that isn't a `Config`.
 * Older formats are brought up to date first.
 */
export function parseConfig(source: string): ParsedConfig {
  let value: unknown;
  try {
    value = migrateConfig(JSON.parse(source));
  } catch (error) {
    return {
      ok: false,
      errors: [
        `not valid JSON (${error instanceof Error ? error.message : String(error)})`,
      ],
    };
  }
  const errors = configShapeProblems(value);
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, config: value as Config };
}
