import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  watch,
  writeFileSync,
} from "fs";
import { readdir } from "fs/promises";
import { basename, extname, join, normalize, relative, sep } from "path";
import type { Config } from "../shared/schema.ts";
import type { LoadResponse, SaveRequest, SaveResponse } from "../shared/api.ts";
import { checkConfig } from "./checks.ts";
import { validateConfig } from "../../../scripts/lib/validate-config.ts";
import { serializeConfig } from "./serialize.ts";

export type EventStoreOptions = {
  eventDir: string;
  /** What to show as the event's location; defaults to `eventDir`. */
  displayDir?: string;
  /** Folder of the site's `<locale>.json` message files. */
  messagesDir: string;
};

export type ImportedSvg = { asset: string };

export class SvgImportError extends Error {}

export class FaviconError extends Error {}

const FAVICON = "favicon.ico";
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
// An ICO directory entry stores each dimension in one byte, 0 meaning 256.
const MAX_FAVICON_SIZE = 256;

function isIco(bytes: Buffer): boolean {
  return (
    bytes.length >= 22 &&
    bytes.readUInt16LE(0) === 0 &&
    bytes.readUInt16LE(2) === 1 &&
    bytes.readUInt16LE(4) >= 1
  );
}

/** Embeds a PNG as-is in an ICO container, which browsers read natively. */
function pngToIco(png: Buffer): Buffer {
  if (
    png.length < 24 ||
    !png.subarray(0, 8).equals(PNG_SIGNATURE) ||
    png.toString("latin1", 12, 16) !== "IHDR"
  ) {
    throw new FaviconError("That file isn't a valid PNG or ICO image");
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== height) {
    throw new FaviconError(
      `The favicon must be square, but this image is ${width}×${height}`,
    );
  }
  if (width === 0 || width > MAX_FAVICON_SIZE) {
    throw new FaviconError(
      `The favicon can be at most ${MAX_FAVICON_SIZE}×${MAX_FAVICON_SIZE}, but this image is ${width}×${height}`,
    );
  }
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  header.writeUInt8(width === MAX_FAVICON_SIZE ? 0 : width, 6);
  header.writeUInt8(height === MAX_FAVICON_SIZE ? 0 : height, 7);
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(header.length, 18); // image data offset
  return Buffer.concat([header, png]);
}

export type EventStore = ReturnType<typeof createEventStore>;

function listLocales(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.slice(0, -".json".length))
        .sort()
    : [];
}

export function createEventStore(options: EventStoreOptions) {
  const { eventDir, messagesDir } = options;
  const configPath = join(eventDir, "concarte.json");
  const assetsDir = join(eventDir, "assets");

  type ConfigLoadResult =
    | { ok: true; config: Config }
    | { ok: false; error: string };

  function loadConfig(): ConfigLoadResult {
    try {
      return {
        ok: true,
        config: JSON.parse(readFileSync(configPath, "utf8")) as Config,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function resolveAsset(requested: string): string | undefined {
    let decoded: string;
    try {
      decoded = decodeURIComponent(requested);
    } catch {
      return undefined;
    }
    const full = normalize(join(assetsDir, decoded));
    if (!full.startsWith(assetsDir + sep) || !existsSync(full)) {
      return undefined;
    }
    return statSync(full).isFile() ? full : undefined;
  }

  async function listAssets(): Promise<string[]> {
    if (!existsSync(assetsDir)) {
      return [];
    }
    const entries = await readdir(assetsDir, {
      withFileTypes: true,
      recursive: true,
    });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) =>
        relative(assetsDir, join(entry.parentPath, entry.name))
          .split(sep)
          .join("/"),
      )
      .sort();
  }

  async function load(): Promise<LoadResponse> {
    const base = {
      eventName: basename(eventDir),
      eventDir: options.displayDir ?? eventDir,
      locales: listLocales(messagesDir),
    };
    if (!existsSync(configPath)) {
      return {
        ...base,
        mtime: 0,
        config: null,
        errors: [`No config found at ${configPath}.`],
      };
    }
    const mtime = statSync(configPath).mtimeMs;
    const loaded = loadConfig();
    if (!loaded.ok) {
      return {
        ...base,
        mtime,
        config: null,
        errors: [`The config could not be loaded: ${loaded.error}`],
      };
    }
    const errors = checkConfig(loaded.config, (src) => {
      const file = resolveAsset(src.replace(/^\/+/, ""));
      if (!file) {
        return false;
      }
      try {
        readFileSync(file);
        return true;
      } catch {
        return false;
      }
    });
    return {
      ...base,
      mtime,
      config: errors.length > 0 ? null : loaded.config,
      errors,
    };
  }

  /** Error messages for the config on disk; empty when it can be built. */
  async function validate(): Promise<string[]> {
    const loaded = loadConfig();
    if (!loaded.ok) {
      return [`The config could not be loaded: ${loaded.error}`];
    }
    return validateConfig(loaded.config)
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);
  }

  async function save(body: SaveRequest): Promise<{
    status: number;
    response: SaveResponse;
  }> {
    const source = serializeConfig(body.config);
    // No await between this check and the write, so only another process
    // can slip in.
    if (!body.force && statSync(configPath).mtimeMs !== body.mtime) {
      return { status: 409, response: { ok: false, reason: "conflict" } };
    }
    // Rename so a crash mid-write can't leave a truncated config.
    const tmpPath = `${configPath}.tmp`;
    writeFileSync(tmpPath, source);
    renameSync(tmpPath, configPath);
    return {
      status: 200,
      response: { ok: true, mtime: statSync(configPath).mtimeMs },
    };
  }

  /**
   * Copies an SVG into assets/ without overwriting anything. A file already
   * there with the same name and content is reused rather than duplicated.
   */
  function importSvg(filename: string, bytes: Buffer): ImportedSvg {
    const text = bytes.toString("utf8");
    if (!/<svg[\s>]/i.test(text)) {
      throw new SvgImportError("That file isn't an SVG");
    }
    const ext = ".svg";
    const stem =
      basename(filename, extname(filename)).replace(/[^\w.-]+/g, "-") || "map";
    mkdirSync(assetsDir, { recursive: true });
    for (let n = 1; ; n++) {
      const name = n === 1 ? `${stem}${ext}` : `${stem}-${n}${ext}`;
      const target = join(assetsDir, name);
      if (!existsSync(target)) {
        writeFileSync(target, bytes);
        return { asset: name };
      }
      if (readFileSync(target).equals(bytes)) {
        return { asset: name };
      }
    }
  }

  /** Replaces assets/favicon.ico with an ICO, or a PNG wrapped as one. */
  function setFavicon(bytes: Buffer) {
    const ico = isIco(bytes) ? bytes : pngToIco(bytes);
    mkdirSync(assetsDir, { recursive: true });
    const tmpPath = join(assetsDir, `${FAVICON}.tmp`);
    // Written via a rename so the watcher and a running build never see a
    // half-written icon.
    writeFileSync(tmpPath, ico);
    renameSync(tmpPath, join(assetsDir, FAVICON));
  }

  function removeFavicon() {
    rmSync(join(assetsDir, FAVICON), { force: true });
  }

  /** Calls back with the asset path (relative to assets/) of each change. */
  function watchAssets(onChange: (path: string) => void): () => void {
    if (!existsSync(assetsDir)) {
      return () => {};
    }
    const watcher = watch(assetsDir, { recursive: true }, (_, file) => {
      if (file) {
        onChange(file.toString().split(sep).join("/"));
      }
    });
    watcher.on("error", () => {});
    return () => watcher.close();
  }

  return {
    eventDir,
    configPath,
    assetsDir,
    load,
    validate,
    save,
    listAssets,
    resolveAsset,
    importSvg,
    setFavicon,
    removeFavicon,
    watchAssets,
  };
}
