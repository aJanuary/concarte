import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  nativeTheme,
  net,
  protocol,
  shell,
} from "electron";
import { existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  IPC,
  type EditAction,
  type EditState,
  type MenuAction,
  type NativeResult,
} from "../shared/bridge.ts";
import { CONFIG_FILE } from "../shared/schema.ts";
import type { Settings } from "../shared/settings.ts";
import { registerIpc } from "./ipc.ts";
import { menuTemplate } from "./menu.ts";
import { ORIGIN, resolveRequest, SCHEME } from "./protocol.ts";
import {
  addRecent,
  describeRecents,
  readRecents,
  removeRecent,
} from "./recents.ts";
import { createEditorService } from "./service/editor-service.ts";
import { createEvent } from "./service/new-event.ts";
import { readSettings, updateSettings } from "./settings.ts";
import { createSiteCopy } from "./site-copy.ts";

// The bundle sits at the root of the packaged app, beside the site's files,
// and in build/editor/ of the repository during development.
const bundleDir = dirname(fileURLToPath(import.meta.url));
const recentsFile = join(app.getPath("userData"), "recents.json");
const settingsFile = join(app.getPath("userData"), "settings.json");

// The renderer's prefers-color-scheme follows themeSource, so this alone
// themes both the native chrome and the page.
function applySettings(settings: Settings) {
  nativeTheme.themeSource = settings.appearance.theme;
}

// Standard, so relative URLs and 'self' in the CSP work as on the web.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);

// In development the repository's own site is built in place.
const siteCopy = app.isPackaged
  ? createSiteCopy({
      bundleDir,
      userData: app.getPath("userData"),
      version: app.getVersion(),
    })
  : undefined;
const siteRoot = siteCopy?.root ?? join(bundleDir, "..", "..", "site");

const service = createEditorService({
  // Read from the bundle: the site copy is only made by the first Build.
  messagesDir: join(siteCopy ? bundleDir : siteRoot, "app", "messages"),
  build: {
    siteRoot,
    nodePath: process.execPath,
    prepare: siteCopy?.prepare,
  },
  openUrl: (url) => void shell.openExternal(url),
  reveal: (path) => void shell.openPath(path),
  showFile: (path) => shell.showItemInFolder(path),
  recents: () => describeRecents(recentsFile),
});

let window: BrowserWindow | undefined;

let editState: EditState = { undo: null, redo: null };

function buildMenu() {
  const template = menuTemplate({
    appName: app.name,
    mac: process.platform === "darwin",
    recents: readRecents(recentsFile),
    editState,
    onFile: (action: MenuAction) =>
      window?.webContents.send(IPC.onMenu, action),
    onEdit: (action: EditAction) =>
      window?.webContents.send(IPC.onEdit, action),
    onSettings: () => window?.webContents.send(IPC.onOpenSettings),
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openEvent(dir: string): Promise<NativeResult> {
  if (!existsSync(join(dir, CONFIG_FILE))) {
    removeRecent(recentsFile, dir);
    buildMenu();
    return {
      ok: false,
      message: `There is no event in ${dir} (no ${CONFIG_FILE}).`,
    };
  }
  await service.open(dir);
  addRecent(recentsFile, dir);
  buildMenu();
  window?.setTitle(`ConCarte editor - ${dir}`);
  return { ok: true };
}

/** Opens `path`, or asks for a folder until one holds an event. */
async function chooseEvent(path?: string): Promise<NativeResult> {
  if (path) {
    return openEvent(path);
  }
  for (;;) {
    const picked = await dialog.showOpenDialog(window!, {
      title: "Open an event folder",
      properties: ["openDirectory"],
    });
    if (picked.canceled) {
      return { ok: false, cancelled: true };
    }
    const result = await openEvent(picked.filePaths[0]);
    if (result.ok || result.cancelled) {
      return result;
    }
    await dialog.showMessageBox(window!, {
      type: "error",
      message: result.message,
      buttons: ["OK"],
    });
  }
}

async function newEvent(): Promise<NativeResult> {
  const picked = await dialog.showOpenDialog(window!, {
    title: "Choose an empty folder for the new event",
    properties: ["openDirectory", "createDirectory"],
  });
  if (picked.canceled) {
    return { ok: false, cancelled: true };
  }
  const dir = picked.filePaths[0];
  const created = await createEvent(dir);
  if (created.ok) {
    return openEvent(dir);
  }
  if (created.reason === "has-config") {
    const choice = await dialog.showMessageBox(window!, {
      message: "That folder already contains an event.",
      buttons: ["Open it", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });
    return choice.response === 0
      ? openEvent(dir)
      : { ok: false, cancelled: true };
  }
  return { ok: false, message: created.message };
}

registerIpc({
  service,
  window: () => window,
  newEvent,
  openEvent: chooseEvent,
  getSettings: () => readSettings(settingsFile),
  updateSettings(update) {
    const settings = updateSettings(settingsFile, update);
    applySettings(settings);
    return settings;
  },
  setEditState(state) {
    const label = (v: unknown) => (typeof v === "string" ? v : null);
    editState = { undo: label(state?.undo), redo: label(state?.redo) };
    buildMenu();
  },
});

// Spectrum styles elements inline, hence 'unsafe-inline' for styles only.
// Scripts must come from the bundle, so markup from the event's SVGs, which
// the page inlines, can't run code. It applies to the event's files too, so
// an SVG opened directly is inert.
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

const uiDir = join(bundleDir, "ui");

function serveScheme() {
  protocol.handle(SCHEME, async (request) => {
    const resolved = resolveRequest(request.url, {
      uiDir,
      resolveAsset: (path) => service.current()?.resolveAsset(path),
    });
    const response = resolved
      ? await net.fetch(pathToFileURL(resolved.file).toString())
      : new Response("Not found", { status: 404 });
    const headers = new Headers(response.headers);
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    if (resolved?.kind === "event-asset") {
      headers.set("Cache-Control", "no-cache");
    }
    return new Response(response.body, { status: response.status, headers });
  });
}

function eventArgument(argv: string[]): string | undefined {
  const index = argv.indexOf("--event");
  return index >= 0 ? argv[index + 1] : undefined;
}

async function createWindow() {
  window = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "ConCarte editor",
    icon: join(bundleDir, "icon.png"),
    webPreferences: {
      preload: join(bundleDir, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
    },
  });
  // The page vetoes unloading while edits are unsaved. Without this handler
  // Electron honours the veto silently, so edits that can't be saved (such as
  // ones with validation errors) would make the window impossible to close.
  window.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(window!, {
      type: "warning",
      buttons: ["Discard changes", "Cancel"],
      defaultId: 1,
      cancelId: 1,
      message: "Discard your unsaved changes due to errors?",
      detail: "Your latest edits haven't been saved to the event's config.",
    });
    if (choice === 0) {
      event.preventDefault();
    }
  });
  // The window only ever shows the editor; anything else opens in the browser.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${ORIGIN}/`)) {
      event.preventDefault();
    }
  });
  await window.loadURL(`${ORIGIN}/`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_, argv) => {
    window?.focus();
    const dir = eventArgument(argv);
    if (dir) {
      void openEvent(dir).then(() => window?.reload());
    }
  });

  app.whenReady().then(async () => {
    applySettings(readSettings(settingsFile));
    buildMenu();
    const dir = eventArgument(process.argv);
    if (dir) {
      await openEvent(dir);
    }
    serveScheme();
    await createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    void service.close();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
