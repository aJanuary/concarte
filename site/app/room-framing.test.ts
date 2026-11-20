import { describe, expect, it } from "vitest";
import { isFreshVisit, roomFrameResolution } from "./room-framing";

describe("roomFrameResolution", () => {
  const map = [0, 0, 1000, 1000];

  it("leaves room around a room so it fills about a third of the view", () => {
    const resolution = roomFrameResolution(
      [100, 100, 400, 400],
      map,
      [100, 100],
    );
    expect(resolution).toBeCloseTo(3 * Math.sqrt(3));
  });

  it("uses whichever dimension of the room is tighter", () => {
    const resolution = roomFrameResolution([0, 0, 400, 100], map, [100, 100]);
    expect(resolution).toBeCloseTo(4 * Math.sqrt(3));
  });

  it("never zooms in further than showing 40% of the map", () => {
    const resolution = roomFrameResolution(
      [100, 100, 110, 110],
      map,
      [100, 100],
    );
    expect(resolution).toBeCloseTo(4);
  });

  it("never zooms out further than showing the whole map", () => {
    const resolution = roomFrameResolution([0, 0, 900, 900], map, [100, 100]);
    expect(resolution).toBe(10);
  });
});

describe("isFreshVisit", () => {
  it.each(["navigate", undefined] as const)(
    "treats %s as a fresh visit",
    (type) => {
      expect(isFreshVisit(type)).toBe(true);
    },
  );

  it.each(["reload", "back_forward"] as const)(
    "treats %s as a return visit",
    (type) => {
      expect(isFreshVisit(type)).toBe(false);
    },
  );
});
