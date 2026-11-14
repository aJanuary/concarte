import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "fs";
import { cp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { EventError } from "./event.ts";
import {
  generateAssets,
  generateConfig,
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
  it("generate a site's files from an event", () => {
    const siteRoot = emptySite();
    for (const generate of generators) {
      generate({ eventDir: demo, siteRoot });
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
        "  --color-disabled: #cbd5e1;",
        "}",
        "",
      ].join("\n"),
    );
    expect(existsSync(join(siteRoot, "public/ground.svg"))).toBe(true);
    expect(existsSync(join(siteRoot, "public/favicon.ico"))).toBe(false);
    expect(existsSync(join(siteRoot, "app/favicon.ico"))).toBe(true);
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
