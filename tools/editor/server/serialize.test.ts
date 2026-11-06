import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import type { Config } from "../shared/schema";
import { normalizeConfig, serializeConfig } from "./serialize";

const defaultConfig = JSON.parse(
  readFileSync(
    join(process.cwd(), "examples", "demo", "concarte.json"),
    "utf8",
  ),
) as Config;

const reload = (source: string): Config => JSON.parse(source);

const base: Config = {
  eventName: "Test",
  locale: "en",
  description: "Short",
  theme: { ...defaultConfig.theme },
  maps: [],
};

describe("serializeConfig", () => {
  it("round-trips the default event config", () => {
    expect(reload(serializeConfig(defaultConfig))).toEqual(
      normalizeConfig(defaultConfig),
    );
  });

  it("leaves the default event config unchanged", () => {
    expect(serializeConfig(defaultConfig)).toBe(
      readFileSync(
        join(process.cwd(), "examples", "demo", "concarte.json"),
        "utf8",
      ),
    );
  });

  it("keeps multi-line descriptions", () => {
    const config: Config = {
      ...base,
      description: "line one \\\nuses `code` and ${value}\nline three",
    };
    expect(reload(serializeConfig(config)).description).toBe(
      config.description,
    );
  });

  it("accepts blank descriptions", () => {
    const config: Config = { ...base, description: "  \n " };
    expect(reload(serializeConfig(config)).description).toBe("");
  });

  it("writes the default map after the filters and before the maps", () => {
    const config: Config = {
      ...base,
      filters: ["A"],
      defaultMap: "m",
      maps: [{ id: "m", label: "M", src: "/m.svg", rooms: [] }],
    };
    const source = serializeConfig(config);
    expect(reload(source).defaultMap).toBe("m");
    expect(source.indexOf('"filters"')).toBeLessThan(
      source.indexOf('"defaultMap"'),
    );
    expect(source.indexOf('"defaultMap"')).toBeLessThan(
      source.indexOf('"maps"'),
    );
  });

  it("drops blank attributions", () => {
    const config: Config = { ...base, attributions: ["Credit", "  "] };
    expect(reload(serializeConfig(config)).attributions).toEqual(["Credit"]);
  });

  it("writes keys in the order the types declare them", () => {
    const source = serializeConfig(defaultConfig);
    const positions = [
      "eventName",
      "locale",
      "description",
      "attributions",
      "theme",
      "filters",
      "maps",
    ].map((key) => source.indexOf(`\n  "${key}":`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("omits unset and empty optional fields", () => {
    const config: Config = {
      ...base,
      attributions: [],
      filters: [],
      maps: [
        {
          id: "a",
          label: "A",
          src: "/a.svg",
          overlays: [],
          rooms: [
            {
              id: "r",
              label: "R",
              aliases: [],
              description: "",
              area: { ref: "r" },
            },
          ],
        },
      ],
    };
    const source = serializeConfig(config);
    for (const field of ["attributions", "filters", "overlays", "aliases"]) {
      expect(source).not.toContain(field);
    }
    expect(source).not.toMatch(/"description": ""/);
    expect(source.match(/"description"/g)).toHaveLength(1);
  });

  it("keeps rooms in the order given", () => {
    const room = (label: string) => ({
      id: label,
      label,
      area: { ref: label },
    });
    const config: Config = {
      ...base,
      maps: [
        {
          id: "a",
          label: "A",
          src: "/a.svg",
          rooms: [room("beta"), room("Gamma"), room("alpha")],
        },
      ],
    };
    expect(
      reload(serializeConfig(config)).maps[0].rooms.map((r) => r.label),
    ).toEqual(["beta", "Gamma", "alpha"]);
  });

  it("refuses rooms whose area is not a ref", () => {
    const config: Config = {
      ...base,
      maps: [
        {
          id: "a",
          label: "A",
          src: "/a.svg",
          rooms: [{ id: "r", label: "R", area: "M 0 0 L 1 1" }],
        },
      ],
    };
    expect(() => serializeConfig(config)).toThrow();
  });
});
