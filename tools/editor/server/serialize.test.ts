import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";
import { describe, expect, it } from "vitest";
import defaultConfig from "../../../events/default/config";
import type { Config } from "../shared/schema";
import { normalizeConfig, serializeConfig } from "./serialize";

const prettierPath = join(process.cwd(), "events", "default", "config.ts");

async function reload(source: string): Promise<Config> {
  const dir = await mkdtemp(join(tmpdir(), "concarte-editor-"));
  const file = join(dir, "config.mts");
  await writeFile(file, source.replace(/^import .*$/m, ""));
  return (await import(/* @vite-ignore */ pathToFileURL(file).href)).default;
}

const base: Config = {
  eventName: "Test",
  locale: "en",
  description: "Short",
  theme: { ...defaultConfig.theme },
  maps: [],
};

describe("serializeConfig", () => {
  it("round-trips the default event config", async () => {
    const source = await serializeConfig(defaultConfig, prettierPath);
    // The runtime dedents and trims descriptions, so compare in that form.
    expect(normalizeConfig(await reload(source))).toEqual(
      normalizeConfig(defaultConfig),
    );
  });

  it("is stable when serialized twice", async () => {
    const once = await serializeConfig(defaultConfig, prettierPath);
    const twice = await serializeConfig(await reload(once), prettierPath);
    expect(twice).toBe(once);
  });

  it("escapes backslashes, backticks and template substitutions", async () => {
    const config: Config = {
      ...base,
      description: "line one \\\nuses `code` and ${value}\nline three",
    };
    const source = await serializeConfig(config, prettierPath);
    expect(normalizeConfig(await reload(source)).description).toBe(
      config.description,
    );
  });

  it("accepts blank descriptions", async () => {
    const config: Config = { ...base, description: "  \n " };
    const source = await serializeConfig(config, prettierPath);
    expect((await reload(source)).description).toBe("");
  });

  it("writes the default map after the filters and before the maps", async () => {
    const config: Config = {
      ...base,
      filters: ["A"],
      defaultMap: "m",
      maps: [{ id: "m", label: "M", src: "/m.svg", rooms: [] }],
    };
    const source = await serializeConfig(config, prettierPath);
    expect((await reload(source)).defaultMap).toBe("m");
    expect(source.indexOf("filters:")).toBeLessThan(
      source.indexOf("defaultMap:"),
    );
    expect(source.indexOf("defaultMap:")).toBeLessThan(source.indexOf("maps:"));
  });

  it("drops blank attributions", async () => {
    const config: Config = { ...base, attributions: ["Credit", "  "] };
    const source = await serializeConfig(config, prettierPath);
    expect((await reload(source)).attributions).toEqual(["Credit"]);
  });

  it("escapes quotes in single-line strings", async () => {
    const config: Config = { ...base, eventName: 'The "Big" \\ Con' };
    const source = await serializeConfig(config, prettierPath);
    expect((await reload(source)).eventName).toBe(config.eventName);
  });

  it("indents multi-line text to its position", async () => {
    const config: Config = { ...base, description: "one\n\ntwo" };
    const source = await serializeConfig(config, prettierPath);
    expect(source).toContain("description: `\n    one\n\n    two\n  `,");
  });

  it("writes keys in the order the types declare them", async () => {
    const source = await serializeConfig(defaultConfig, prettierPath);
    const positions = [
      "eventName:",
      "locale:",
      "description:",
      "attributions:",
      "theme:",
      "filters:",
      "maps:",
    ].map((key) => source.indexOf(`\n  ${key}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("omits unset and empty optional fields", async () => {
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
    const source = await serializeConfig(config, prettierPath);
    for (const field of ["attributions", "filters", "overlays", "aliases"]) {
      expect(source).not.toContain(field);
    }
    expect(source).not.toMatch(/description: ""/);
    expect(source.match(/description:/g)).toHaveLength(1);
  });

  it("keeps rooms in the order given", async () => {
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
    const reloaded = await reload(await serializeConfig(config, prettierPath));
    expect(reloaded.maps[0].rooms.map((r) => r.label)).toEqual([
      "beta",
      "Gamma",
      "alpha",
    ]);
  });

  it("refuses rooms whose area is not a ref", async () => {
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
    await expect(serializeConfig(config, prettierPath)).rejects.toThrow();
  });
});
