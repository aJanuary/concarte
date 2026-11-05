import { describe, expect, it } from "vitest";
import type { Config } from "../../shared/schema";
import {
  addRoom,
  defaultMapOf,
  makeDefaultMap,
  moveMap,
  newMap,
  removeMap,
  removeRoom,
  updateMap,
  roomHasData,
  updateRoom,
} from "./ops";

const doc: Config = {
  eventName: "T",
  locale: "en",
  description: "",
  theme: {} as Config["theme"],
  maps: [
    { id: "a", label: "A", src: "/a.svg", rooms: [] },
    { id: "b", label: "B", src: "/b.svg", rooms: [] },
    { id: "c", label: "C", src: "/c.svg", rooms: [] },
  ],
};

describe("map ops", () => {
  it("moves maps and stops at the ends", () => {
    expect(moveMap("/b.svg", -1)(doc).maps.map((m) => m.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(moveMap("/a.svg", -1)(doc)).toBe(doc);
    expect(moveMap("/c.svg", 1)(doc)).toBe(doc);
  });

  it("makes a map the default without reordering", () => {
    const next = makeDefaultMap("/c.svg")(doc);
    expect(next.defaultMap).toBe("c");
    expect(next.maps.map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(defaultMapOf(next)?.id).toBe("c");
  });

  it("defaults to the first map when none is set", () => {
    expect(defaultMapOf(doc)?.id).toBe("a");
  });

  it("keeps the default when its map is renamed, and clears it on removal", () => {
    const withDefault = makeDefaultMap("/b.svg")(doc);
    expect(updateMap("/b.svg", { id: "b2" })(withDefault).defaultMap).toBe(
      "b2",
    );
    expect(updateMap("/a.svg", { id: "a2" })(withDefault).defaultMap).toBe("b");
    expect(removeMap("/b.svg")(withDefault).defaultMap).toBeUndefined();
  });

  it("derives a new map's id and label from the file name, avoiding clashes", () => {
    expect(newMap(doc, "third-floor.svg")).toEqual({
      id: "third-floor",
      label: "Third floor",
      src: "/third-floor.svg",
      rooms: [],
    });
    expect(newMap(doc, "a.svg").id).toBe("a-2");
  });
});

describe("room ops", () => {
  it("adds a room with a blank label and the svg id as id", () => {
    const next = addRoom("/a.svg", "hall")(doc);
    expect(next.maps[0].rooms).toEqual([
      { id: "hall", label: "", area: { ref: "hall" } },
    ]);
    expect(doc.maps[0].rooms).toEqual([]);
  });

  it("updates and removes rooms by ref", () => {
    let next = addRoom("/a.svg", "hall")(doc);
    next = updateRoom("/a.svg", "hall", { label: "Hall" })(next);
    expect(next.maps[0].rooms[0].label).toBe("Hall");
    next = removeRoom("/a.svg", "hall")(next);
    expect(next.maps[0].rooms).toEqual([]);
  });

  it("tells fresh rooms from edited ones", () => {
    const fresh = addRoom("/a.svg", "hall")(doc).maps[0].rooms[0];
    expect(roomHasData(fresh)).toBe(false);
    expect(roomHasData({ ...fresh, label: "Hall" })).toBe(true);
    expect(roomHasData({ ...fresh, aliases: ["x"] })).toBe(true);
    expect(roomHasData({ ...fresh, id: "other" })).toBe(true);
  });
});
