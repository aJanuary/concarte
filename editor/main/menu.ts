import type { MenuItemConstructorOptions } from "electron";
import type { EditAction, EditState, MenuAction } from "../shared/bridge.ts";

export type MenuOptions = {
  appName: string;
  mac: boolean;
  /** Event folders for Open recent, most recent first. */
  recents: string[];
  editState: EditState;
  onFile: (action: MenuAction) => void;
  onEdit: (action: EditAction) => void;
  onSettings: () => void;
};

function historyItem(
  verb: "Undo" | "Redo",
  accelerator: string,
  label: string | null,
  onEdit: (action: EditAction) => void,
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
    click: () => onEdit(action),
  };
}

/** The application menu, which is rebuilt whenever what it shows changes. */
export function menuTemplate({
  appName,
  mac,
  recents,
  editState,
  onFile,
  onEdit,
  onSettings,
}: MenuOptions): MenuItemConstructorOptions[] {
  const settingsItem: MenuItemConstructorOptions = {
    label: "Settings...",
    accelerator: "CmdOrCtrl+,",
    click: onSettings,
  };
  return [
    ...(mac
      ? [
          {
            label: appName,
            submenu: [
              { role: "about" },
              { type: "separator" },
              settingsItem,
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          } as MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New event...",
          accelerator: "CmdOrCtrl+N",
          click: () => onFile({ type: "new" }),
        },
        {
          label: "Open event...",
          accelerator: "CmdOrCtrl+O",
          click: () => onFile({ type: "open" }),
        },
        {
          label: "Open recent",
          enabled: recents.length > 0,
          submenu: recents.map((path) => ({
            label: path,
            click: () => onFile({ type: "open-recent", path }),
          })),
        },
        { type: "separator" },
        ...(mac ? [] : [settingsItem, { type: "separator" } as const]),
        mac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        historyItem("Undo", "CmdOrCtrl+Z", editState.undo, onEdit),
        historyItem("Redo", "CmdOrCtrl+Shift+Z", editState.redo, onEdit),
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    { role: "windowMenu" },
  ];
}
