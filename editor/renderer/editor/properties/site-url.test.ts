import { describe, expect, it } from "vitest";
import { normalizeSiteUrl } from "./site-url";

describe("normalizeSiteUrl", () => {
  it.each([
    ["/map/", "/map"],
    ["  /map/2026 ", "/map/2026"],
    ["//map//2026//", "/map/2026"],
    ["/my map", "/my map"],
    [" https://example.com/ ", "https://example.com"],
    ["https://example.com/map//", "https://example.com/map"],
    ["example.com", "example.com"],
  ])("turns %j into %j", (typed, expected) => {
    expect(normalizeSiteUrl(typed)).toBe(expected);
  });

  it.each(["", " ", "/", "///"])("treats %j as the root", (typed) => {
    expect(normalizeSiteUrl(typed)).toBeUndefined();
  });
});
