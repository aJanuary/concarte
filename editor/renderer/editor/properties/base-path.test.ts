import { describe, expect, it } from "vitest";
import { normalizeBasePath } from "./base-path";

describe("normalizeBasePath", () => {
  it.each([
    ["map", "/map"],
    ["/map/", "/map"],
    ["  map/2026 ", "/map/2026"],
    ["//map//2026//", "/map/2026"],
    ["/my map", "/my map"],
  ])("turns %j into %j", (typed, expected) => {
    expect(normalizeBasePath(typed)).toBe(expected);
  });

  it.each(["", " ", "/", "///"])("treats %j as the root", (typed) => {
    expect(normalizeBasePath(typed)).toBeUndefined();
  });
});
