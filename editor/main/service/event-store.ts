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
import { basename, extname, join, sep } from "path";
import {
  ASSETS_DIR,
  assetPath,
  CONFIG_FILE,
  type Config,
} from "../../shared/schema.ts";
import type {
  FaviconResponse,
  LoadResponse,
  PageMessages,
  SaveRequest,
  SaveResponse,
} from "../../shared/api.ts";
import { checkConfig } from "./checks.ts";
import { parseSvg, realAssetFile } from "@concarte/core/node";
import {
  parseConfig,
  parseSiteUrl,
  validateConfig,
  type ParsedConfig,
  type SvgDocument,
} from "@concarte/core";
import { toIco } from "./favicon.ts";
import { serializeConfig } from "./serialize.ts";

export type EventStoreOptions = {
  eventDir: string;
  /** Folder of the site's `<locale>.json` message files. */
  messagesDir: string;
};

const FAVICON = "favicon.ico";

export type EventStore = ReturnType<typeof createEventStore>;

function listLocales(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.slice(0, -".json".length))
        .sort()
    : [];
}

/** Locales whose file lacks the page messages, or isn't JSON, are left out. */
function readPageMessages(dir: string, locales: string[]): PageMessages {
  const messages: PageMessages = {};
  for (const locale of locales) {
    try {
      const page = JSON.parse(
        readFileSync(join(dir, `${locale}.json`), "utf8"),
      ).page;
      if (
        typeof page?.title === "string" &&
        typeof page?.description === "string" &&
        typeof page?.named === "string"
      ) {
        messages[locale] = {
          title: page.title,
          description: page.description,
          named: page.named,
        };
      }
    } catch {
      // Left out, as documented above.
    }
  }
  return messages;
}

export function createEventStore(options: EventStoreOptions) {
  const { eventDir, messagesDir } = options;
  const configPath = join(eventDir, CONFIG_FILE);
  const assetsDir = join(eventDir, ASSETS_DIR);

  function loadConfig(): ParsedConfig {
    let source: string;
    try {
      source = readFileSync(configPath, "utf8");
    } catch (error) {
      return {
        ok: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
    return parseConfig(source);
  }

  const unloadable = (errors: string[]) =>
    errors.map((error) => `The config could not be loaded: ${error}`);

  function resolveAsset(requested: string): string | undefined {
    let decoded: string;
    try {
      decoded = decodeURIComponent(requested);
    } catch {
      return undefined;
    }
    return realAssetFile(assetsDir, decoded);
  }

  async function load(): Promise<LoadResponse> {
    const locales = listLocales(messagesDir);
    const base = {
      eventDir,
      locales,
      pageMessages: readPageMessages(messagesDir, locales),
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
        errors: unloadable(loaded.errors),
      };
    }
    const errors = checkConfig(loaded.config, (src) => {
      const file = resolveAsset(assetPath(src));
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
      return unloadable(loaded.errors);
    }
    const documents: Record<string, SvgDocument | undefined> = {};
    for (const map of loaded.config.maps) {
      const file = resolveAsset(assetPath(map.src));
      if (file) {
        documents[map.src] = parseSvg(readFileSync(file, "utf8"));
      }
    }
    return validateConfig(loaded.config, documents)
      .filter((issue) => issue.severity === "error")
      .map((issue) => issue.message);
  }

  /** The base path of the config on disk, or undefined if it can't be read. */
  function basePath(): string | undefined {
    const loaded = loadConfig();
    if (!loaded.ok) {
      return undefined;
    }
    const siteUrl = parseSiteUrl(loaded.config.url);
    return siteUrl.ok ? siteUrl.basePath : undefined;
  }

  async function save(body: SaveRequest): Promise<SaveResponse> {
    const source = serializeConfig(body.config);
    // No await between this check and the write, so only another process
    // can slip in.
    if (!body.force && statSync(configPath).mtimeMs !== body.mtime) {
      return { ok: false, reason: "conflict" };
    }
    // Rename so a crash mid-write can't leave a truncated config.
    const tmpPath = `${configPath}.tmp`;
    writeFileSync(tmpPath, source);
    renameSync(tmpPath, configPath);
    return { ok: true, mtime: statSync(configPath).mtimeMs };
  }

  /**
   * Copies an SVG into assets/ without overwriting anything. A file already
   * there with the same name and content is reused rather than duplicated.
   */
  function importSvg(
    filename: string,
    bytes: Buffer,
  ): { asset: string } | { error: string } {
    const text = bytes.toString("utf8");
    if (!/<svg[\s>]/i.test(text)) {
      return { error: "That file isn't an SVG" };
    }
    const ext = ".svg";
    const stem =
      basename(filename, extname(filename)).replace(/[^\w.-]+/g, "-") ||
      "image";
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
  function setFavicon(bytes: Buffer): FaviconResponse {
    const converted = toIco(bytes);
    if ("error" in converted) {
      return converted;
    }
    mkdirSync(assetsDir, { recursive: true });
    const tmpPath = join(assetsDir, `${FAVICON}.tmp`);
    // Written via a rename so the watcher and a running build never see a
    // half-written icon.
    writeFileSync(tmpPath, converted.ico);
    renameSync(tmpPath, join(assetsDir, FAVICON));
    return { ok: true };
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
    assetsDir,
    load,
    validate,
    basePath,
    save,
    resolveAsset,
    importSvg,
    setFavicon,
    removeFavicon,
    watchAssets,
  };
}
