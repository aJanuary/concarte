import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { configShapeProblems, parseConfig } from "./config-shape.ts";

const demo = readFileSync(
  new URL("../examples/demo/concarte.json", import.meta.url),
  "utf8",
);

describe("parseConfig", () => {
  it("accepts the demo event", () => {
    expect(parseConfig(demo)).toMatchObject({ ok: true });
  });

  it("reports text that is not JSON", () => {
    const parsed = parseConfig("{ eventName: ");
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? [] : parsed.errors).toEqual([
      expect.stringMatching(/^not valid JSON \(/),
    ]);
  });
});

describe("configShapeProblems", () => {
  const valid = JSON.parse(demo) as Record<string, unknown>;

  it("names each value of the wrong type by its path", () => {
    const maps = structuredClone(valid.maps) as Record<string, unknown>[];
    const rooms = maps[0].rooms as Record<string, unknown>[];
    rooms[1].label = 7;
    rooms[1].searchable = "no";
    rooms[1].shape = { id: "hall" };
    maps[0].src = "/ground.png";
    maps[0].overlays = "none";
    expect(
      configShapeProblems({
        ...valid,
        theme: {
          ...(valid.theme as object),
          "primary-text": undefined,
          accent: "red",
          disabled: "#abc",
        },
        maps,
      }),
    ).toEqual([
      'theme["primary-text"] must be a hex color like #1a2b3c',
      "theme.accent must be a hex color like #1a2b3c",
      "theme.disabled must be a hex color like #1a2b3c",
      "maps[0].src must be the path of an SVG file",
      "maps[0].overlays must be a list",
      "maps[0].rooms[1].label must be text",
      "maps[0].rooms[1].searchable must be true or false",
      "maps[0].rooms[1].shape must be text",
    ]);
  });

  it("reports missing required values", () => {
    expect(configShapeProblems({ ...valid, maps: undefined })).toEqual([
      "maps must be a list",
    ]);
  });

  it("rejects a config that is not an object", () => {
    expect(configShapeProblems([])).toEqual(["config must be an object"]);
  });

  it("refuses unknown keys", () => {
    const maps = structuredClone(valid.maps) as Record<string, unknown>[];
    (maps[0].rooms as Record<string, unknown>[])[0].colour = "red";
    expect(configShapeProblems({ ...valid, future: 1, maps })).toEqual([
      "maps[0].rooms[0].colour is not a known setting",
      "future is not a known setting",
    ]);
  });
});
