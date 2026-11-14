import {
  dialog,
  ipcMain,
  type BrowserWindow,
  type IpcMainInvokeEvent,
} from "electron";
import { readFileSync } from "fs";
import { basename } from "path";
import type { SaveRequest } from "../shared/api.ts";
import { IPC, type EditState, type NativeResult } from "../shared/bridge.ts";
import type { SettingsUpdate } from "../shared/settings.ts";
import { ORIGIN } from "./protocol.ts";
import type { EditorService } from "./service/editor-service.ts";

export type IpcOptions = {
  service: EditorService;
  window: () => BrowserWindow | undefined;
  newEvent: () => Promise<NativeResult>;
  openEvent: (path?: string) => Promise<NativeResult>;
  getSettings: () => unknown;
  updateSettings: (update: SettingsUpdate) => unknown;
  setEditState: (state: EditState) => void;
};

// The window can only show the editor, but a frame that somehow navigated
// elsewhere still mustn't reach the user's files.
function fromEditor(event: { senderFrame: { url: string } | null }): boolean {
  return event.senderFrame?.url.startsWith(`${ORIGIN}/`) ?? false;
}

function handle<A extends unknown[]>(
  channel: string,
  fn: (...args: A) => unknown,
) {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    if (!fromEditor(event)) {
      throw new Error("Refused a message from outside the editor");
    }
    return fn(...(args as A));
  });
}

/** Lets the user pick one file, opening in the event's folder. */
async function pickFile(
  options: IpcOptions,
  name: string,
  extensions: string[],
): Promise<string | undefined> {
  const window = options.window();
  const dialogOptions: Electron.OpenDialogOptions = {
    defaultPath: options.service.event().eventDir,
    filters: [{ name, extensions }],
    properties: ["openFile"],
  };
  const picked = window
    ? await dialog.showOpenDialog(window, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);
  return picked.canceled ? undefined : picked.filePaths[0];
}

/** Answers the page's `Bridge` calls and forwards the service's events. */
export function registerIpc(options: IpcOptions) {
  const { service } = options;

  handle(IPC.session, () => service.session());
  handle(IPC.newEvent, () => options.newEvent());
  handle(IPC.openEvent, (path?: string) => options.openEvent(path));
  handle(IPC.loadEvent, () => service.event().load());
  handle(IPC.saveEvent, (body: SaveRequest) => service.event().save(body));
  handle(IPC.importSvg, async () => {
    const file = await pickFile(options, "SVG images", ["svg"]);
    if (!file) {
      return { cancelled: true };
    }
    return service.event().importSvg(basename(file), readFileSync(file));
  });
  handle(IPC.showAsset, (asset: string) => {
    service.showAsset(asset);
  });
  handle(IPC.chooseFavicon, async () => {
    const file = await pickFile(options, "Icons", ["ico", "png"]);
    if (!file) {
      return { cancelled: true };
    }
    return service.event().setFavicon(readFileSync(file));
  });
  handle(IPC.removeFavicon, () => {
    service.event().removeFavicon();
  });

  handle(IPC.buildStatus, () => service.buildStatus());
  handle(IPC.startBuild, async () => {
    const start = await service.startBuild();
    return start.outcome === "invalid"
      ? { ok: false, reason: "invalid", errors: start.errors }
      : start.build;
  });
  handle(IPC.cancelBuild, () => service.cancelBuild());
  handle(IPC.revealDist, () => {
    service.revealDist();
  });
  handle(IPC.startPreview, () => service.startPreview());

  handle(IPC.getSettings, () => options.getSettings());
  handle(IPC.updateSettings, (update: SettingsUpdate) =>
    options.updateSettings(update),
  );

  ipcMain.on(IPC.editState, (event, state: EditState) => {
    if (fromEditor(event)) {
      options.setEditState(state);
    }
  });

  service.subscribe((name, data) => {
    const channel = name === "asset-changed" ? IPC.onAssetChanged : IPC.onBuild;
    options.window()?.webContents.send(channel, data);
  });
}
