import { contextBridge, ipcRenderer } from "electron";
import type {
  ConcarteNative,
  EditAction,
  MenuAction,
} from "../shared/native.ts";

const native: ConcarteNative = {
  newEvent: () => ipcRenderer.invoke("event:new"),
  openEvent: (path) => ipcRenderer.invoke("event:open", path),
  onMenu(callback) {
    const listener = (_: unknown, action: MenuAction) => callback(action);
    ipcRenderer.on("menu", listener);
    return () => {
      ipcRenderer.off("menu", listener);
    };
  },
  onEdit(callback) {
    const listener = (_: unknown, action: EditAction) => callback(action);
    ipcRenderer.on("edit", listener);
    return () => {
      ipcRenderer.off("edit", listener);
    };
  },
  setEditState: (state) => ipcRenderer.send("edit:state", state),
};

contextBridge.exposeInMainWorld("concarte", native);
