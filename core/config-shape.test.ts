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

  it("reads a base path as the site address, in its place", () => {
    const { eventName, locale, ...rest } = JSON.parse(demo);
    const parsed = parseConfig(
      JSON.stringify({ eventName, locale, basePath: "/myevent", ...rest }),
    );
    expect(parsed.ok).toBe(true);
    const config = parsed.ok ? parsed.config : undefined;
    expect(config?.url).toBe("/myevent");
    expect(Object.keys(config ?? {}).slice(0, 3)).toEqual([
      "eventName",
      "locale",
      "url",
    ]);
  });

  it("reads a room's area ref as its shape", () => {
    const old = JSON.parse(demo);
    const room = old.maps[0].rooms[0];
    old.maps[0].rooms[0] = {
      id: room.id,
      label: room.label,
      area: { ref: room.shape },
      searchable: false,
    };
    const parsed = parseConfig(JSON.stringify(old));
    expect(parsed.ok).toBe(true);
    const migrated = parsed.ok ? parsed.config.maps[0].rooms[0] : undefined;
    expect(migrated).toEqual({
      id: room.id,
      label: room.label,
      shape: room.shape,
      searchable: false,
    });
    expect(Object.keys(migrated ?? {})).toEqual([
      "id",
      "label",
      "shape",
      "searchable",
    ]);
  });

  it("gives a theme without a highlighted room background a tint of the accent", () => {
    const old = JSON.parse(demo);
    delete old.theme["highlighted-room-background"];
    old.theme.accent = "#1a2b3c80";
    const parsed = parseConfig(JSON.stringify(old));
    expect(
      parsed.ok ? parsed.config.theme["highlighted-room-background"] : parsed,
    ).toBe("#1a2b3c66");
  });

  it("falls back to a black tint when the accent isn't a colour", () => {
    const old = JSON.parse(demo);
    delete old.theme["highlighted-room-background"];
    old.theme.accent = "green";
    const parsed = parseConfig(JSON.stringify(old));
    expect(
      parsed.ok ? parsed.config.theme["highlighted-room-background"] : parsed,
    ).toBe("#00000066");
  });

  it("opens a config with a theme color that isn't a hex color", () => {
    const old = JSON.parse(demo);
    old.theme.accent = "green";
    expect(parseConfig(JSON.stringify(old))).toMatchObject({ ok: true });
  });

  it("leaves areas that were never refs to be reported", () => {
    const old = JSON.parse(demo);
    delete old.maps[0].rooms[0].shape;
    old.maps[0].rooms[0].area = "M 0 0 L 1 1 Z";
    expect(parseConfig(JSON.stringify(old))).toEqual({
      ok: false,
      errors: [
        "maps[0].rooms[0].shape must be text",
        "maps[0].rooms[0].area is not a known setting",
      ],
    });
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
          accent: 7,
        },
        maps,
      }),
    ).toEqual([
      'theme["primary-text"] must be text',
      "theme.accent must be text",
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
