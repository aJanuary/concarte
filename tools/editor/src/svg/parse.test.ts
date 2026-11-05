import { DOMParser } from "linkedom";
import { describe, expect, it } from "vitest";
import {
  filterTree,
  findNode,
  selectableParent,
  sortRoomsByTree,
} from "../../shared/tree";
import { buildTree } from "./parse";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg">
  <defs><path id="in-defs" d="M0 0"/></defs>
  <rect id="bg" width="10" height="10"/>
  <g id="wing">
    <path id="hall" d="M0 0"/>
    <g>
      <path id="inner" d="M0 0"/>
      <path d="M1 1"/>
    </g>
  </g>
  <g id="empty"><text>hi</text></g>
  <g id="dealers"><rect id="stall-1"/><rect id="stall-2"/></g>
  <text id="label">Label</text>
</svg>`;

const root = new DOMParser().parseFromString(svg, "image/svg+xml")
  .documentElement as unknown as Parameters<typeof buildTree>[0];
const tree = buildTree(root);

describe("buildTree", () => {
  it("keeps groups and shapes and skips definitions, text and empty groups", () => {
    expect(tree.map((n) => n.id)).toEqual(["bg", "wing", "dealers"]);
  });

  it("keeps shapes without an id, marked as unselectable", () => {
    const inner = findNode(tree, "inner")!;
    expect(inner.ancestors.map((a) => a.id)).toEqual(["wing", null]);
    const anonymous = inner.ancestors[1].children[1];
    expect(anonymous.id).toBeNull();
    expect(anonymous.key).not.toBe("");
  });

  it("gives every node a distinct key", () => {
    const keys: string[] = [];
    const collect = (nodes: typeof tree) =>
      nodes.forEach((n) => {
        keys.push(n.key);
        collect(n.children);
      });
    collect(tree);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("sortRoomsByTree", () => {
  const room = (id: string, label = id) => ({
    id,
    label,
    area: { ref: id },
  });
  const ids = (rooms: { id: string }[]) => rooms.map((r) => r.id);

  it("puts a room after the group that contains it", () => {
    const rooms = [
      room("inner"),
      room("wing"),
      room("stall-1"),
      room("dealers"),
    ];
    expect(ids(sortRoomsByTree(rooms, tree))).toEqual([
      "wing",
      "inner",
      "dealers",
      "stall-1",
    ]);
  });

  it("puts rooms missing from the tree last, by label", () => {
    const rooms = [
      room("gone-b", "B"),
      room("hall"),
      room("gone-a", "a"),
      room("bg"),
    ];
    expect(ids(sortRoomsByTree(rooms, tree))).toEqual([
      "bg",
      "hall",
      "gone-a",
      "gone-b",
    ]);
  });

  it("keeps the given order when there is no tree", () => {
    const rooms = [room("b"), room("a")];
    expect(sortRoomsByTree(rooms, undefined)).toBe(rooms);
  });
});

describe("tree helpers", () => {
  it("selects the nearest ancestor with an id", () => {
    expect(selectableParent(tree, "inner")).toBe("wing");
    expect(selectableParent(tree, "wing")).toBeUndefined();
  });

  it("filters to matches and their ancestors", () => {
    const filtered = filterTree(tree, (n) => n.id === "inner");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("wing");
    expect(filtered[0].children).toHaveLength(1);
    expect(filtered[0].children[0].children.map((n) => n.id)).toEqual([
      "inner",
    ]);
  });
});
