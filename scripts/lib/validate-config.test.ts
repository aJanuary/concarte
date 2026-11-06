import { describe, expect, it } from "vitest";
import type { Config } from "../../app/config.types";
import { validateConfig } from "./validate-config";

function config(rooms: Config["maps"][number]["rooms"]): Config {
  return {
    maps: [{ id: "m", label: "Map", src: "/m.svg", rooms }],
  } as Config;
}

const messages = (c: Config, trees = {}) =>
  validateConfig(c, trees).map((i) => `${i.severity}: ${i.message}`);

describe("validateConfig", () => {
  it("accepts a valid config", () => {
    expect(
      messages(config([{ id: "a", label: "A", area: { ref: "a" } }])),
    ).toEqual([]);
  });

  it("reports duplicate room ids as errors", () => {
    const rooms = [
      { id: "a", label: "A", area: { ref: "a" } },
      { id: "a", label: "B", area: { ref: "b" } },
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

  it("warns about refs missing from the SVG, only when it is known", () => {
    const c = config([{ id: "a", label: "A", area: { ref: "gone" } }]);
    expect(messages(c)).toEqual([]);
    expect(messages(c, { "/m.svg": [{ id: "other", children: [] }] })).toEqual([
      'warning: No element with id "gone" in /m.svg',
    ]);
  });
});
