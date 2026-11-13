import type { Settings, SettingsUpdate } from "./settings.ts";

/** What the Electron preload script exposes as `window.concarte`. */

export type NativeResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; message: string };

export type MenuAction =
  | { type: "new" }
  | { type: "open" }
  | { type: "open-recent"; path: string };

/** An Edit menu command the editor handles itself. */
export type EditAction = "undo" | "redo";

/**
 * Whether Undo and Redo are available, and the label of the edit each would
 * apply. Null means unavailable.
 */
export type EditState = { undo: string | null; redo: string | null };

export type ConcarteNative = {
  getSettings(): Promise<Settings>;
  /** Saves the valid parts of `update` and resolves to the new settings. */
  updateSettings(update: SettingsUpdate): Promise<Settings>;
  /** Calls back when Settings is chosen in the menu. Returns an unsubscribe. */
  onOpenSettings(callback: () => void): () => void;
  newEvent(): Promise<NativeResult>;
  openEvent(path?: string): Promise<NativeResult>;
  /** Calls back when a File menu item is chosen. Returns an unsubscribe. */
  onMenu(callback: (action: MenuAction) => void): () => void;
  /** Calls back when Undo or Redo is chosen in the Edit menu. */
  onEdit(callback: (action: EditAction) => void): () => void;
  /** Keeps the Edit menu's Undo and Redo items in step with the history. */
  setEditState(state: EditState): void;
};
