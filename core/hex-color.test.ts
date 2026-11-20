import { describe, expect, it } from "vitest";
import { normalizeHexColor } from "./hex-color.ts";

describe("normalizeHexColor", () => {
  it.each([
    ["#1a2b3c", "#1a2b3c"],
    ["1A2B3C", "#1a2b3c"],
    ["  #1a2b3c ", "#1a2b3c"],
    ["#1a2b3c80", "#1a2b3c80"],
    ["#1a2b3cFF", "#1a2b3c"],
    ["1a2b3c00", "#1a2b3c00"],
  ])("writes %j as %j", (text, color) => {
    expect(normalizeHexColor(text)).toBe(color);
  });

  it.each(["", "#", "#abc", "#abcd", "#1a2b3c8", "#1a2b3g", "red", "##1a2b3c"])(
    "refuses %j",
    (text) => {
      expect(normalizeHexColor(text)).toBeUndefined();
    },
  );
});
