import { describe, expect, it } from "vitest";
import type { Config } from "./config.types.ts";
import { parseSvg } from "./parse-svg.ts";
import { validateConfig } from "./validate-config.ts";

const theme: Config["theme"] = {
  background: "#ffffff",
  "control-background": "#ffffff",
  "highlight-background": "#ffffff",
  border: "#ffffff",
  "primary-text": "#000000",
  "secondary-text": "#000000",
  accent: "#000000",
  "highlighted-room-background": "#00000000",
  disabled: "#000000",
};

function config(rooms: Config["maps"][number]["rooms"]): Config {
  return {
    theme,
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

  it("accepts theme colors with and without alpha", () => {
    const c = config([]);
    c.theme = { ...theme, accent: "#1A2b3C", border: "#1a2b3c80" };
    expect(messages(c)).toEqual([]);
  });

  it.each(["red", "#abc", "#abcd", "1a2b3c", "#1a2b3c8", "#1a2b3g"])(
    "reports the theme color %s as an error on its key",
    (accent) => {
      const c = config([]);
      c.theme = { ...theme, accent };
      expect(validateConfig(c)).toEqual([
        {
          severity: "error",
          message: `The theme color "accent" must be a hex color like #1a2b3c, or #1a2b3c80 to make it translucent, not "${accent}"`,
          themeKey: "accent",
        },
      ]);
    },
  );

  it("reports a default map that does not exist", () => {
    expect(messages({ ...config([]), defaultMap: "other" } as Config)).toEqual([
      'error: The default map "other" does not exist',
    ]);
  });

  it.each(["", "/map", "/maps/2026", "/a.b_c~d-e"])(
    "accepts the base path %j",
    (basePath) => {
      expect(messages({ ...config([]), basePath } as Config)).toEqual([]);
    },
  );

  it.each(["map", "/map/", "/", "//map", "/my map", "/map?x"])(
    "reports the base path %j",
    (basePath) => {
      expect(
        validateConfig({ ...config([]), basePath } as Config),
      ).toMatchObject([{ severity: "error", field: "basePath" }]);
    },
  );

  it("accepts a page title and description", () => {
    const page = { title: "DemoCon Hotel B map", description: "Hotel B" };
    expect(messages({ ...config([]), page } as Config)).toEqual([]);
  });

  it.each([
    { title: "", description: "Hotel B" },
    { title: "DemoCon Hotel B map", description: " " },
  ])("reports an empty page title or description: %j", (page) => {
    expect(validateConfig({ ...config([]), page } as Config)).toMatchObject([
      { severity: "error", field: "page" },
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
