import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "fs";
import { cp, readFile, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { EventError } from "./event.ts";
import {
  generateAssets,
  generateConfig,
  generatePreviewImages,
  generateThemeCss,
  generators,
} from "./generators.ts";

const demo = fileURLToPath(new URL("../../../examples/demo", import.meta.url));

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "concarte-generate-"));
}

function emptySite(): string {
  const siteRoot = tempDir();
  mkdirSync(join(siteRoot, "app"));
  return siteRoot;
}

async function demoCopy(
  edit: (config: Record<string, unknown>) => unknown,
): Promise<string> {
  const eventDir = tempDir();
  await cp(demo, eventDir, { recursive: true });
  const file = join(eventDir, "concarte.json");
  const config = JSON.parse(readFileSync(file, "utf8"));
  await writeFile(file, JSON.stringify(edit(config)));
  return eventDir;
}

describe("generators", () => {
  it("generate a site's files from an event", async () => {
    const siteRoot = emptySite();
    for (const generate of generators) {
      await generate({ eventDir: demo, siteRoot });
    }

    const config = readFileSync(join(siteRoot, "generated/config.ts"), "utf8");
    expect(config).toContain('"eventName": "DemoCon"');
    expect(config).toContain('"area": [');
    expect(readFileSync(join(siteRoot, "generated/theme.css"), "utf8")).toBe(
      [
        "@theme {",
        "  --color-background: #eeece6;",
        "  --color-control-background: #ffffff;",
        "  --color-highlight-background: #e3e0d8;",
        "  --color-border: #d6d2c8;",
        "  --color-primary-text: #2b2b2b;",
        "  --color-secondary-text: #64748b;",
        "  --color-accent: #087232;",
        "  --color-highlighted-room-background: #08723266;",
        "  --color-disabled: #cbd5e1;",
        "}",
        "",
      ].join("\n"),
    );
    expect(existsSync(join(siteRoot, "public/ground.svg"))).toBe(true);
    expect(existsSync(join(siteRoot, "public/favicon.ico"))).toBe(true);
    expect(existsSync(join(siteRoot, "app/favicon.ico"))).toBe(false);
    expect(
      readFileSync(join(siteRoot, "generated/assets.ts"), "utf8"),
    ).toContain('favicon: string | null = "/favicon.ico"');
  });

  it("drop a previous event's favicon when the event has none", async () => {
    const siteRoot = emptySite();
    generateAssets({ eventDir: demo, siteRoot });
    const eventDir = await demoCopy((config) => config);
    rmSync(join(eventDir, "assets/favicon.ico"));
    generateAssets({ eventDir, siteRoot });
    expect(existsSync(join(siteRoot, "public/favicon.ico"))).toBe(false);
    expect(
      readFileSync(join(siteRoot, "generated/assets.ts"), "utf8"),
    ).toContain("favicon: string | null = null");
  });

  it("refuse theme keys that would reach the theme CSS", async () => {
    const eventDir = await demoCopy((config) => ({
      ...config,
      theme: {
        ...(config.theme as object),
        extra: 'red; } @plugin "/tmp/evil.js"; @theme { --z: 1',
        'x: 1; } @plugin "/tmp/evil.js"; @theme { --y': "red",
      },
    }));
    const siteRoot = emptySite();
    expect(() => generateThemeCss({ eventDir, siteRoot })).toThrow(
      "theme.extra is not a known setting",
    );
    expect(existsSync(join(siteRoot, "generated/theme.css"))).toBe(false);
  });

  it("publish only the assets the config references", async () => {
    const siteRoot = emptySite();
    const eventDir = await demoCopy((config) => config);
    await writeFile(join(eventDir, "assets/stray.txt"), "secret");
    generateAssets({ eventDir, siteRoot });
    expect(existsSync(join(siteRoot, "public/ground.svg"))).toBe(true);
    expect(existsSync(join(siteRoot, "public/stray.txt"))).toBe(false);
  });

  it("refuse an asset that is a symlink out of the assets folder", async () => {
    const eventDir = await demoCopy((config) => config);
    const outside = join(tempDir(), "outside.svg");
    await writeFile(outside, "<svg/>");
    rmSync(join(eventDir, "assets/ground.svg"));
    symlinkSync(outside, join(eventDir, "assets/ground.svg"));
    expect(() => generateAssets({ eventDir, siteRoot: emptySite() })).toThrow(
      EventError,
    );
  });

  it("refuse an asset path that climbs out of public/", async () => {
    const siteRoot = emptySite();
    const eventDir = await demoCopy((config) => ({
      ...config,
      maps: (config.maps as object[]).map((map, i) =>
        i === 0 ? { ...map, src: "/../assets/ground.svg" } : map,
      ),
    }));
    expect(() => generateAssets({ eventDir, siteRoot })).toThrow(EventError);
    expect(existsSync(join(siteRoot, "assets"))).toBe(false);
  });

  it("refuse an event with no config", () => {
    expect(() =>
      generateConfig({ eventDir: tempDir(), siteRoot: emptySite() }),
    ).toThrow(EventError);
  });

  it("refuse a config with errors, leaving the site untouched", async () => {
    const siteRoot = emptySite();
    const eventDir = await demoCopy((config) => ({
      ...config,
      defaultMap: "nowhere",
    }));
    expect(() => generateConfig({ eventDir, siteRoot })).toThrow(
      'The default map "nowhere" does not exist',
    );
    expect(existsSync(join(siteRoot, "generated"))).toBe(false);
  });

  it("refuse to read a map that is a symlink out of the assets folder", async () => {
    const eventDir = await demoCopy((config) => config);
    const outside = join(tempDir(), "outside.svg");
    await writeFile(outside, "<svg/>");
    rmSync(join(eventDir, "assets/ground.svg"));
    symlinkSync(outside, join(eventDir, "assets/ground.svg"));
    expect(() => generateConfig({ eventDir, siteRoot: emptySite() })).toThrow(
      /resolves outside/,
    );
  });

  it("keep the event path out of the generated file", async () => {
    const siteRoot = emptySite();
    const eventDir = await demoCopy((config) => config);
    generateConfig({ eventDir, siteRoot });
    const output = readFileSync(join(siteRoot, "generated/config.ts"), "utf8");
    expect(output).not.toContain(eventDir);
  });

  it.each([
    [undefined, ""],
    ["/myevent", "/myevent"],
    ["https://example.com/myevent/", "/myevent"],
  ])(
    "give next.config the base path of the site address %j",
    async (url, basePath) => {
      const siteRoot = emptySite();
      const eventDir = await demoCopy((config) => ({ ...config, url }));
      generateConfig({ eventDir, siteRoot });
      expect(
        JSON.parse(readFileSync(join(siteRoot, "generated/site.json"), "utf8")),
      ).toEqual({ basePath });
    },
  );

  it("name the room whose shape can't be resolved", async () => {
    const eventDir = await demoCopy((config) => {
      const maps = config.maps as { rooms: { shape: string }[] }[];
      maps[0].rooms[0].shape = "missing";
      return config;
    });
    expect(() => generateConfig({ eventDir, siteRoot: emptySite() })).toThrow(
      /Failed to resolve the shape of room "main-hall" on map "ground"/,
    );
  });
});

describe("generatePreviewImages", () => {
  // Two rooms on one map keep the rendering quick.
  const small = (previewImages: boolean) =>
    demoCopy((config) => {
      const [map] = config.maps as { rooms: unknown[] }[];
      return {
        ...config,
        url: "https://example.com",
        previewImages,
        maps: [{ ...map, rooms: map.rooms.slice(0, 2) }],
      };
    });

  async function list(siteRoot: string) {
    const source = await readFile(
      join(siteRoot, "generated/preview-images.ts"),
      "utf8",
    );
    const json = (name: string) =>
      JSON.parse(
        source.match(new RegExp(`export const ${name}[^=]*= ([^;]*);`))![1],
      );
    return { size: json("size"), maps: json("maps"), rooms: json("rooms") };
  }

  it.each([
    [false, true, "turned off"],
    [true, false, "only a build makes"],
  ])(
    "list no images when the event asks %j and the build %j",
    async (inEvent, previewImages, reason) => {
      const siteRoot = emptySite();
      const eventDir = await small(inEvent);
      expect(
        await generatePreviewImages({ eventDir, siteRoot, previewImages }),
      ).toContain(reason);
      expect(await list(siteRoot)).toMatchObject({ maps: {}, rooms: {} });
      expect(existsSync(join(siteRoot, "public/og"))).toBe(false);
    },
  );

  it("render each map and room, named by content", async () => {
    const siteRoot = emptySite();
    const eventDir = await small(true);
    await generatePreviewImages({ eventDir, siteRoot, previewImages: true });

    const { size, maps, rooms } = await list(siteRoot);
    expect(size).toEqual({ width: 1200, height: 630 });
    const files = [
      maps.ground,
      rooms.ground["main-hall"],
      rooms.ground["green-room"],
    ];
    expect(new Set(files).size).toBe(3);
    for (const file of files) {
      expect(file).toMatch(/^\/og\/[0-9a-f]{16}\.png$/);
      const png = readFileSync(join(siteRoot, "public", file));
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
    }
  });

  it("name the map whose image can't be made", async () => {
    const eventDir = await small(true);
    const svg = join(eventDir, "assets/ground.svg");
    await writeFile(
      svg,
      (await readFile(svg, "utf8")).replace(
        / width="1000" height="700" viewBox="0 0 1000 700"/,
        "",
      ),
    );
    await expect(
      generatePreviewImages({
        eventDir,
        siteRoot: emptySite(),
        previewImages: true,
      }),
    ).rejects.toThrow(
      /link preview image of map "ground" \(\/ground.svg\): its SVG has no viewBox/,
    );
  });
});
