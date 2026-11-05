import { roomRef, type Room } from "./schema.ts";

export type SvgTreeNode = {
  /** Unique within a tree; `id` when there is one, otherwise a path. */
  key: string;
  id: string | null;
  tag: string;
  isGroup: boolean;
  children: SvgTreeNode[];
};

export const SHAPE_TAGS = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
]);

export function walk(
  nodes: SvgTreeNode[],
  visit: (node: SvgTreeNode, ancestors: SvgTreeNode[]) => void,
  ancestors: SvgTreeNode[] = [],
) {
  for (const node of nodes) {
    visit(node, ancestors);
    walk(node.children, visit, [...ancestors, node]);
  }
}

export function findNode(
  nodes: SvgTreeNode[],
  key: string,
): { node: SvgTreeNode; ancestors: SvgTreeNode[] } | undefined {
  let found: { node: SvgTreeNode; ancestors: SvgTreeNode[] } | undefined;
  walk(nodes, (node, ancestors) => {
    if (!found && node.key === key) {
      found = { node, ancestors };
    }
  });
  return found;
}

export function selectableIds(nodes: SvgTreeNode[]): Set<string> {
  const ids = new Set<string>();
  walk(nodes, (node) => {
    if (node.id !== null) {
      ids.add(node.id);
    }
  });
  return ids;
}

/**
 * Orders rooms by where their element appears in the SVG, parents before
 * descendants. The map draws rooms in array order and a click picks the
 * topmost one, so this is what lets a room inside a room group be clicked:
 * it comes later and so is drawn above. Rooms with no element in the tree go
 * last, by label.
 */
export function sortRoomsByTree(
  rooms: Room[],
  tree: SvgTreeNode[] | undefined,
): Room[] {
  if (!tree) {
    return rooms;
  }
  const position = new Map<string, number>();
  walk(tree, (node) => {
    if (node.id !== null && !position.has(node.id)) {
      position.set(node.id, position.size);
    }
  });
  const positionOf = (room: Room) => {
    const ref = roomRef(room);
    return ref === undefined
      ? Number.POSITIVE_INFINITY
      : (position.get(ref) ?? Number.POSITIVE_INFINITY);
  };
  return [...rooms].sort((a, b) => {
    const pa = positionOf(a);
    const pb = positionOf(b);
    if (pa === pb) {
      return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
    }
    return pa < pb ? -1 : 1;
  });
}

export function selectableParent(
  nodes: SvgTreeNode[],
  id: string,
): string | undefined {
  const found = findNode(nodes, id);
  if (!found) {
    return undefined;
  }
  for (let i = found.ancestors.length - 1; i >= 0; i--) {
    const ancestorId = found.ancestors[i].id;
    if (ancestorId !== null) {
      return ancestorId;
    }
  }
  return undefined;
}

export function filterTree(
  nodes: SvgTreeNode[],
  matches: (node: SvgTreeNode) => boolean,
): SvgTreeNode[] {
  const result: SvgTreeNode[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, matches);
    if (matches(node) || children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}
