import { selectableIds, type SvgTreeNode } from "./tree.ts";
import { roomRef, type Config } from "./schema.ts";

export type Issue = {
  severity: "error" | "warning";
  message: string;
  mapSrc?: string;
  ref?: string;
  field?: "id" | "label" | "link" | "area" | "src";
};

/**
 * Checks a config before it is saved. `trees` holds the parsed SVG of each map
 * by `src`; checks that need an SVG are skipped for maps without one.
 */
export function validateConfig(
  config: Config,
  trees: Record<string, SvgTreeNode[] | undefined> = {},
): Issue[] {
  const issues: Issue[] = [];
  const error = (issue: Omit<Issue, "severity">) =>
    issues.push({ ...issue, severity: "error" });
  const warning = (issue: Omit<Issue, "severity">) =>
    issues.push({ ...issue, severity: "warning" });

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
    const refs: string[] = [];
    for (const room of map.rooms) {
      const ref = roomRef(room);
      const name = room.label || room.id || ref || "(unnamed)";
      if (ref !== undefined) {
        refs.push(ref);
      }
      if (room.id.trim() === "") {
        error({
          message: `Room "${name}" on map "${where}" has no id`,
          mapSrc: map.src,
          ref,
          field: "id",
        });
      } else if (roomIds.has(room.id)) {
        error({
          message: `Room id "${room.id}" is used more than once on map "${where}"`,
          mapSrc: map.src,
          ref,
          field: "id",
        });
      }
      roomIds.add(room.id);
      if (room.label.trim() === "") {
        error({
          message: `Room "${name}" on map "${where}" has no label`,
          mapSrc: map.src,
          ref,
          field: "label",
        });
      }
      if (
        room.searchable !== undefined &&
        typeof room.searchable !== "boolean"
      ) {
        error({
          message: `Room "${name}" on map "${where}" has a searchable value that is not true or false`,
          mapSrc: map.src,
          ref,
        });
      }
      if (
        room.link &&
        (room.link.href.trim() === "" || room.link.title.trim() === "")
      ) {
        error({
          message: `Room "${name}" has a link that needs both an address and a title`,
          mapSrc: map.src,
          ref,
          field: "link",
        });
      }
    }

    const tree = trees[map.src];
    if (tree) {
      const known = selectableIds(tree);
      for (const ref of refs) {
        if (!known.has(ref)) {
          warning({
            message: `No element with id "${ref}" in ${map.src}`,
            mapSrc: map.src,
            ref,
            field: "area",
          });
        }
      }
    }
  }
  return issues;
}
