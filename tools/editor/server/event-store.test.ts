import { mkdtemp, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { createEventStore, FaviconError, SvgImportError } from "./event-store";
import { createEvent } from "./new-event";

async function tempDir() {
  return mkdtemp(join(tmpdir(), "concarte-store-"));
}

describe("createEvent", () => {
  it("writes a minimal event that loads back", async () => {
    const dir = await tempDir();
    expect(await createEvent(dir)).toEqual({ ok: true });
    expect(existsSync(join(dir, "assets"))).toBe(true);
    const store = createEventStore({
      eventDir: dir,
      messagesDir: join(dir, "none"),
    });
    const loaded = await store.load();
    expect(loaded.errors).toEqual([]);
    expect(loaded.config?.maps).toEqual([]);
  });

  it("ignores build output in git", async () => {
    const dir = await tempDir();
    await createEvent(dir);
    expect(await readFile(join(dir, ".gitignore"), "utf8")).toBe(
      "dist/\ndist.new/\n",
    );
  });

  it("refuses a folder with content", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "notes.txt"), "x");
    expect(await createEvent(dir)).toMatchObject({
      ok: false,
      reason: "not-empty",
    });
  });

  it("ignores files left by file managers", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, ".DS_Store"), "x");
    expect(await createEvent(dir)).toEqual({ ok: true });
  });

  it("recognises an existing event", async () => {
    const dir = await tempDir();
    await createEvent(dir);
    expect(await createEvent(dir)).toMatchObject({
      ok: false,
      reason: "has-config",
    });
  });
});

describe("load", () => {
  it("reports a config that is not valid JSON", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "concarte.json"), "{ nope");
    const store = createEventStore({ eventDir: dir, messagesDir: dir });
    const loaded = await store.load();
    expect(loaded.config).toBeNull();
    expect(loaded.errors[0]).toMatch(/could not be loaded/);
  });
});

describe("importSvg", () => {
  async function store() {
    const dir = await tempDir();
    await createEvent(dir);
    return createEventStore({
      eventDir: dir,
      messagesDir: dir,
    });
  }

  it("copies the file into assets", async () => {
    const s = await store();
    const result = s.importSvg("Ground Floor.svg", Buffer.from("<svg></svg>"));
    expect(result.asset).toBe("Ground-Floor.svg");
    expect(await readFile(join(s.assetsDir, result.asset), "utf8")).toBe(
      "<svg></svg>",
    );
  });

  it("never overwrites a different file", async () => {
    const s = await store();
    s.importSvg("a.svg", Buffer.from("<svg>1</svg>"));
    expect(s.importSvg("a.svg", Buffer.from("<svg>2</svg>")).asset).toBe(
      "a-2.svg",
    );
    expect(await readFile(join(s.assetsDir, "a.svg"), "utf8")).toBe(
      "<svg>1</svg>",
    );
  });

  it("reuses an identical file", async () => {
    const s = await store();
    s.importSvg("a.svg", Buffer.from("<svg>1</svg>"));
    expect(s.importSvg("a.svg", Buffer.from("<svg>1</svg>")).asset).toBe(
      "a.svg",
    );
  });

  it("rejects files that are not SVG", async () => {
    const s = await store();
    expect(() => s.importSvg("a.svg", Buffer.from("hello"))).toThrow(
      SvgImportError,
    );
  });
});

describe("save", () => {
  it("rejects a stale mtime and accepts force", async () => {
    const dir = await tempDir();
    await createEvent(dir);
    await mkdir(join(dir, "assets"), { recursive: true });
    const s = createEventStore({
      eventDir: dir,
      messagesDir: dir,
    });
    const { config, mtime } = await s.load();
    const stale = await s.save({ config: config!, mtime: mtime - 1000 });
    expect(stale.status).toBe(409);
    const forced = await s.save({
      config: config!,
      mtime: mtime - 1000,
      force: true,
    });
    expect(forced.status).toBe(200);
  });

  it("saves a config with errors, which still loads and fails validation", async () => {
    const dir = await tempDir();
    await createEvent(dir);
    const s = createEventStore({
      eventDir: dir,
      messagesDir: dir,
    });
    const { config, mtime } = await s.load();
    expect(await s.validate()).toEqual([]);

    const saved = await s.save({
      config: { ...config!, defaultMap: "nowhere" },
      mtime,
    });
    expect(saved.status).toBe(200);

    const reloaded = await s.load();
    expect(reloaded.errors).toEqual([]);
    expect(reloaded.config?.defaultMap).toBe("nowhere");
    expect(await s.validate()).toEqual([
      'The default map "nowhere" does not exist',
    ]);
  });
});

describe("favicon", () => {
  async function store() {
    const dir = await tempDir();
    await createEvent(dir);
    return createEventStore({ eventDir: dir, messagesDir: dir });
  }

  function png(width: number, height: number) {
    const bytes = Buffer.alloc(33);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
    bytes.write("IHDR", 12, "latin1");
    bytes.writeUInt32BE(width, 16);
    bytes.writeUInt32BE(height, 20);
    return bytes;
  }

  function ico() {
    const bytes = Buffer.alloc(30);
    bytes.writeUInt16LE(1, 2);
    bytes.writeUInt16LE(1, 4);
    return bytes;
  }

  const faviconPath = (s: { assetsDir: string }) =>
    join(s.assetsDir, "favicon.ico");

  it("writes an ICO as it is", async () => {
    const s = await store();
    s.setFavicon(ico());
    expect(await readFile(faviconPath(s))).toEqual(ico());
  });

  it("wraps a PNG in an ICO container", async () => {
    const s = await store();
    const source = png(32, 32);
    s.setFavicon(source);
    const written = await readFile(faviconPath(s));
    expect(written.readUInt16LE(2)).toBe(1);
    expect(written.readUInt16LE(4)).toBe(1);
    expect(written[6]).toBe(32);
    expect(written[7]).toBe(32);
    expect(written.readUInt32LE(14)).toBe(source.length);
    expect(written.readUInt32LE(18)).toBe(22);
    expect(written.subarray(22)).toEqual(source);
  });

  it("stores 256px as zero, as ICO requires", async () => {
    const s = await store();
    s.setFavicon(png(256, 256));
    const written = await readFile(faviconPath(s));
    expect(written[6]).toBe(0);
    expect(written[7]).toBe(0);
  });

  it("replaces an existing favicon", async () => {
    const s = await store();
    s.setFavicon(png(16, 16));
    s.setFavicon(png(32, 32));
    expect((await readFile(faviconPath(s)))[6]).toBe(32);
  });

  it.each([
    ["not an image", Buffer.from("hello")],
    ["not square", png(32, 16)],
    ["too large", png(512, 512)],
    ["empty", png(0, 0)],
  ])("rejects %s", async (_, bytes) => {
    const s = await store();
    expect(() => s.setFavicon(bytes)).toThrow(FaviconError);
    expect(existsSync(faviconPath(s))).toBe(false);
  });

  it("removes the favicon, and tolerates there being none", async () => {
    const s = await store();
    s.setFavicon(ico());
    s.removeFavicon();
    expect(existsSync(faviconPath(s))).toBe(false);
    expect(() => s.removeFavicon()).not.toThrow();
  });
});
