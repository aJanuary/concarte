import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import { createServer } from "http";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type {
  EditAction,
  EditState,
  MenuAction,
  NativeResult,
} from "../shared/native.ts";
import { createApi } from "../server/api.ts";
import { createEditorHost } from "../server/editor-host.ts";
import { createEvent } from "../server/new-event.ts";
import { staticHandler } from "../server/static-handler.ts";
import {
  addRecent,
  describeRecents,
  readRecents,
  removeRecent,
} from "../server/recents.ts";

// The bundle sits at the root of the packaged app, beside the site's files,
// and in build/editor/ during development.
const bundleDir = dirname(fileURLToPath(import.meta.url));
const packaged = app.isPackaged;
const recentsFile = join(app.getPath("userData"), "recents.json");

/**
 * The site is built in a writable copy: the installed app may be read-only and
 * the build writes next to its sources.
 */
const siteRoot = packaged
  ? join(app.getPath("userData"), `site-${app.getVersion()}`)
  : join(bundleDir, "..", "..");

async function prepareSite(log: (text: string) => void): Promise<void> {
  const marker = join(siteRoot, ".copied");
  if (!packaged || existsSync(marker)) {
    return;
  }
  log("Preparing the build tools. This only happens once...\n");
  rmSync(siteRoot, { recursive: true, force: true });
  mkdirSync(siteRoot, { recursive: true });
  cpSync(bundleDir, siteRoot, {
    recursive: true,
    filter: (source) => source !== join(bundleDir, "ui"),
  });
  writeFileSync(marker, "");
  for (const entry of readdirSync(app.getPath("userData"))) {
    if (
      entry.startsWith("site-") &&
      join(app.getPath("userData"), entry) !== siteRoot
    ) {
      rmSync(join(app.getPath("userData"), entry), {
        recursive: true,
        force: true,
      });
    }
  }
}

const host = createEditorHost({
  // Read from the bundle: siteRoot is only populated by the first Build.
  messagesDir: join(packaged ? bundleDir : siteRoot, "app", "messages"),
  build: {
    siteRoot,
    nodePath: process.execPath,
    prepare: prepareSite,
  },
  openUrl: (url) => void shell.openExternal(url),
  reveal: (path) => void shell.openPath(path),
  showFile: (path) => shell.showItemInFolder(path),
  recents: () => describeRecents(recentsFile),
});

let window: BrowserWindow | undefined;

function send(action: MenuAction) {
  window?.webContents.send("menu", action);
}

function sendEdit(action: EditAction) {
  window?.webContents.send("edit", action);
}

let editState: EditState = { undo: null, redo: null };

ipcMain.on("edit:state", (_, state: EditState) => {
  const label = (v: unknown) => (typeof v === "string" ? v : null);
  editState = { undo: label(state?.undo), redo: label(state?.redo) };
  buildMenu();
});

function historyItem(
  verb: "Undo" | "Redo",
  accelerator: string,
  label: string | null,
): MenuItemConstructorOptions {
  const action = verb.toLowerCase() as EditAction;
  return {
    // "&" marks a mnemonic in Windows menu labels.
    label: label ? `${verb} ${label}`.replaceAll("&", "&&") : verb,
    accelerator,
    enabled: label !== null,
    // The page handles the shortcut itself, so the markdown editor can keep
    // its own undo history. The menu only displays it.
    registerAccelerator: false,
    click: () => sendEdit(action),
  };
}

function buildMenu() {
  const recents = readRecents(recentsFile).map(
    (path): MenuItemConstructorOptions => ({
      label: path,
      click: () => send({ type: "open-recent", path }),
    }),
  );
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin"
      ? [{ role: "appMenu" } as MenuItemConstructorOptions]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New event...",
          accelerator: "CmdOrCtrl+N",
          click: () => send({ type: "new" }),
        },
        {
          label: "Open event...",
          accelerator: "CmdOrCtrl+O",
          click: () => send({ type: "open" }),
        },
        {
          label: "Open recent",
          enabled: recents.length > 0,
          submenu: recents,
        },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        historyItem("Undo", "CmdOrCtrl+Z", editState.undo),
        historyItem("Redo", "CmdOrCtrl+Shift+Z", editState.redo),
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openEvent(dir: string): Promise<NativeResult> {
  if (!existsSync(join(dir, "concarte.json"))) {
    removeRecent(recentsFile, dir);
    buildMenu();
    return {
      ok: false,
      message: `There is no event in ${dir} (no concarte.json).`,
    };
  }
  await host.open(dir);
  addRecent(recentsFile, dir);
  buildMenu();
  window?.setTitle(`ConCarte editor - ${dir}`);
  return { ok: true };
}

ipcMain.handle(
  "event:open",
  async (_, path?: string): Promise<NativeResult> => {
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
  },
);

ipcMain.handle("event:new", async (): Promise<NativeResult> => {
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
});

async function startServer(): Promise<string> {
  const api = createApi(host);
  const serveUi = staticHandler(join(bundleDir, "ui"));
  const server = createServer((req, res) => {
    api(req, res).then(
      (handled) => {
        if (!handled) {
          serveUi(req, res);
        }
      },
      (e: Error) => {
        res.statusCode = 500;
        res.end(e.message);
      },
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  app.on("will-quit", () => server.close());
  console.log(`ConCarte editor listening at http://127.0.0.1:${port}`);
  return `http://127.0.0.1:${port}`;
}

function eventArgument(argv: string[]): string | undefined {
  const index = argv.indexOf("--event");
  return index >= 0 ? argv[index + 1] : undefined;
}

async function createWindow(origin: string) {
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
    if (!url.startsWith(origin)) {
      event.preventDefault();
    }
  });
  await window.loadURL(origin);
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
    buildMenu();
    const dir = eventArgument(process.argv);
    if (dir) {
      await openEvent(dir);
    }
    const origin = await startServer();
    await createWindow(origin);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow(origin);
      }
    });
  });

  app.on("window-all-closed", () => {
    void host.close();
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
