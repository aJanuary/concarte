import { describe, expect, it } from "vitest";
import { parseSiteUrl } from "./site-url.ts";

describe("parseSiteUrl", () => {
  it.each([
    [undefined, undefined, ""],
    ["", undefined, ""],
    ["/", undefined, ""],
    ["/myevent/", undefined, "/myevent"],
    ["https://Example.com", "https://example.com", ""],
    ["https://example.com/", "https://example.com", ""],
    ["https://example.com/maps/2026/", "https://example.com", "/maps/2026"],
    ["http://localhost:8080/x", "http://localhost:8080", "/x"],
  ])("reads %j", (url, origin, basePath) => {
    expect(parseSiteUrl(url)).toEqual({ ok: true, origin, basePath });
  });
});
