import { THEME_KEYS } from "./config-shape.ts";
import type { Config } from "./config.types.ts";
import { isHexColor } from "./hex-color.ts";
import { resolveShape, type SvgDocument } from "./shape-resolver.ts";

export type Issue = {
  severity: "error" | "warning";
  message: string;
  mapSrc?: string;
  shape?: string;
  field?: "basePath" | "id" | "label" | "link" | "shape" | "src";
  /** The theme colour the issue is with. */
  themeKey?: keyof Config["theme"];
};

// Resolving applies transforms and flattens curves, and the editor validates on
// each edit, so the outcome is remembered for as long as the document lives.
const shapeProblems = new WeakMap<SvgDocument, Map<string, string | null>>();

/** Why the build can't resolve element `id` into an area, or null if it can. */
function shapeProblem(document: SvgDocument, id: string): string | null {
  let known = shapeProblems.get(document);
  if (!known) {
    known = new Map();
    shapeProblems.set(document, known);
  }
  let problem = known.get(id);
  if (problem === undefined) {
    try {
      resolveShape(document, id);
      problem = null;
    } catch (error) {
      problem = error instanceof Error ? error.message : String(error);
    }
    known.set(id, problem);
  }
  return problem;
}

const BASE_PATH = /^(\/[A-Za-z0-9._~-]+)+$/;

/**
 * Finds problems in a config. `documents` holds the parsed SVG of each map by
 * `src`; checks that need an SVG are skipped for maps without one.
 */
export function validateConfig(
  config: Config,
  documents: Record<string, SvgDocument | undefined> = {},
): Issue[] {
  const issues: Issue[] = [];
  const error = (issue: Omit<Issue, "severity">) =>
    issues.push({ ...issue, severity: "error" });
  const warning = (issue: Omit<Issue, "severity">) =>
    issues.push({ ...issue, severity: "warning" });

  if (
    config.basePath !== undefined &&
    config.basePath !== "" &&
    !BASE_PATH.test(config.basePath)
  ) {
    error({
      message: `The base path "${config.basePath}" must start with "/", not end with "/", and use only letters, digits, ".", "_", "~" and "-" between the slashes`,
      field: "basePath",
    });
  }

  for (const key of THEME_KEYS) {
    const color = config.theme[key];
    if (!isHexColor(color)) {
      error({
        message: `The theme color "${key}" must be a hex color like #1a2b3c, or #1a2b3c80 to make it translucent, not "${color}"`,
        themeKey: key,
      });
    }
  }

  if (
    config.defaultMap !== undefined &&
    !config.maps.some((m) => m.id === config.defaultMap)
  ) {
    error({ message: `The default map "${config.defaultMap}" does not exist` });
  }

  const mapIds = new Set<string>();
  for (const map of config.maps) {
    const where = map.label || map.id || map.src;
    if (map.id.trim() === "") {
      error({
        message: `Map "${where}" has no id`,
        mapSrc: map.src,
        field: "id",
      });
    } else if (mapIds.has(map.id)) {
      error({
        message: `Map id "${map.id}" is used more than once`,
        mapSrc: map.src,
        field: "id",
      });
    }
    mapIds.add(map.id);
    if (map.label.trim() === "") {
      error({
        message: `Map "${where}" has no label`,
        mapSrc: map.src,
        field: "label",
      });
    }

    for (const overlay of map.overlays ?? []) {
      if (overlay.id.trim() === "" || overlay.label.trim() === "") {
        error({
          message: `An overlay on map "${where}" needs an id and a label`,
          mapSrc: map.src,
        });
      }
    }

    const roomIds = new Set<string>();
    const document = documents[map.src];
    for (const room of map.rooms) {
      const shape = room.shape;
      const name = room.label || room.id || shape || "(unnamed)";
      if (room.id.trim() === "") {
        error({
          message: `Room "${name}" on map "${where}" has no id`,
          mapSrc: map.src,
          shape,
          field: "id",
        });
      } else if (roomIds.has(room.id)) {
        error({
          message: `Room id "${room.id}" is used more than once on map "${where}"`,
          mapSrc: map.src,
          shape,
          field: "id",
        });
      }
      roomIds.add(room.id);
      if (room.label.trim() === "") {
        error({
          message: `Room "${name}" on map "${where}" has no label`,
          mapSrc: map.src,
          shape,
          field: "label",
        });
      }
      if (
        room.link &&
        (room.link.href.trim() === "" || room.link.title.trim() === "")
      ) {
        error({
          message: `Room "${name}" has a link that needs both an address and a title`,
          mapSrc: map.src,
          shape,
          field: "link",
        });
      }
      const problem = document ? shapeProblem(document, shape) : null;
      if (problem !== null) {
        error({
          message: `The shape of room "${name}" on map "${where}" can't be used: ${problem}`,
          mapSrc: map.src,
          shape,
          field: "shape",
        });
      }
    }
  }
  return issues;
}
