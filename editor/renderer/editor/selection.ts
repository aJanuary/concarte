export type Selection =
  | { kind: "event" }
  | { kind: "map"; mapSrc: string }
  | { kind: "node"; mapSrc: string; key: string };

export type MapSelection = Exclude<Selection, { kind: "event" }>;

export function isOnMap(selection: Selection): selection is MapSelection {
  return selection.kind !== "event";
}

export function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "map" && b.kind === "map") {
    return a.mapSrc === b.mapSrc;
  }
  if (a.kind === "node" && b.kind === "node") {
    return a.mapSrc === b.mapSrc && a.key === b.key;
  }
  return true;
}

/** What to select to show where an issue is, if it is anywhere on a map. */
export function selectionForIssue(issue: {
  mapSrc?: string;
  shape?: string;
  themeKey?: string;
}): Selection | undefined {
  if (issue.themeKey) {
    return { kind: "event" };
  }
  if (issue.mapSrc && issue.shape) {
    return { kind: "node", mapSrc: issue.mapSrc, key: issue.shape };
  }
  return issue.mapSrc ? { kind: "map", mapSrc: issue.mapSrc } : undefined;
}
