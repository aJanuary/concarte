import { contextBridge, ipcRenderer } from "electron";
import { IPC, type Bridge } from "../shared/bridge.ts";

const invoke = ipcRenderer.invoke.bind(ipcRenderer);

/** Subscribes to one channel from the main process. */
function listen<T>(channel: string) {
  return (callback: (data: T) => void) => {
    const listener = (_: unknown, data: T) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.off(channel, listener);
    };
  };
}

// One named method per channel, rather than a generic invoke: the page must
// not be able to send arbitrary messages to the main process.
const bridge: Bridge = {
  session: () => invoke(IPC.session),
  event: {
    create: () => invoke(IPC.newEvent),
    open: (path) => invoke(IPC.openEvent, path),
    load: () => invoke(IPC.loadEvent),
    save: (body) => invoke(IPC.saveEvent, body),
    importSvg: () => invoke(IPC.importSvg),
    showAsset: (asset) => invoke(IPC.showAsset, asset),
    chooseFavicon: () => invoke(IPC.chooseFavicon),
    removeFavicon: () => invoke(IPC.removeFavicon),
  },
  build: {
    status: () => invoke(IPC.buildStatus),
    start: () => invoke(IPC.startBuild),
    cancel: () => invoke(IPC.cancelBuild),
    revealDist: () => invoke(IPC.revealDist),
    preview: () => invoke(IPC.startPreview),
  },
  settings: {
    get: () => invoke(IPC.getSettings),
    update: (update) => invoke(IPC.updateSettings, update),
  },
  setEditState: (state) => ipcRenderer.send(IPC.editState, state),
  on: {
    menu: listen(IPC.onMenu),
    edit: listen(IPC.onEdit),
    openSettings: listen(IPC.onOpenSettings),
    assetChanged: listen(IPC.onAssetChanged),
    build: listen(IPC.onBuild),
  },
};

contextBridge.exposeInMainWorld("concarte", bridge);
