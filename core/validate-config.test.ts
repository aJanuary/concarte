import { describe, expect, it } from "vitest";
import type { Config } from "./config.types.ts";
import { parseSvg } from "./parse-svg.ts";
import { validateConfig } from "./validate-config.ts";

function config(rooms: Config["maps"][number]["rooms"]): Config {
  return {
    maps: [{ id: "m", label: "Map", src: "/m.svg", rooms }],
  } as Config;
}

const messages = (c: Config, svgs: Record<string, string> = {}) =>
  validateConfig(
    c,
    Object.fromEntries(
      Object.entries(svgs).map(([src, source]) => [src, parseSvg(source)]),
    ),
  ).map((i) => `${i.severity}: ${i.message}`);

describe("validateConfig", () => {
  it("accepts a valid config", () => {
    expect(messages(config([{ id: "a", label: "A", shape: "a" }]))).toEqual([]);
  });

  it("reports duplicate room ids as errors", () => {
    const rooms = [
      { id: "a", label: "A", shape: "a" },
      { id: "a", label: "B", shape: "b" },
    ];
    expect(messages(config(rooms))).toEqual([
      'error: Room id "a" is used more than once on map "Map"',
    ]);
  });

  it("reports a default map that does not exist", () => {
    expect(messages({ ...config([]), defaultMap: "other" } as Config)).toEqual([
      'error: The default map "other" does not exist',
    ]);
  });

  it("reports shapes the build can't resolve, only when the SVG is known", () => {
    const c = config([
      { id: "a", label: "A", shape: "gone" },
      { id: "b", label: "B", shape: "titled" },
      { id: "c", label: "C", shape: "fine" },
    ]);
    expect(messages(c)).toEqual([]);
    expect(
      messages(c, {
        "/m.svg": `<svg xmlns="http://www.w3.org/2000/svg">
          <g id="titled"><title>Hall</title><rect width="5" height="5"/></g>
          <rect id="fine" width="5" height="5"/>
        </svg>`,
      }),
    ).toEqual([
      'error: The shape of room "A" on map "Map" can\'t be used: no element with id "gone" found',
      'error: The shape of room "B" on map "Map" can\'t be used: Unsupported SVG element <title id="null">; expected <path>, <rect>, <circle>, <ellipse>, <polygon>, <polyline>, or <g>',
    ]);
  });
});
