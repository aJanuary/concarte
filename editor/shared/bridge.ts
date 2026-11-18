import type {
  BuildResponse,
  BuildStartResponse,
  BuildState,
  FaviconResponse,
  ImportSvgResponse,
  LoadResponse,
  PreviewResponse,
  SaveRequest,
  SaveResponse,
  SessionResponse,
} from "./api.ts";
import type { Settings, SettingsUpdate } from "./settings.ts";

/** The IPC channels behind `Bridge`, one per method. */
export const IPC = {
  session: "session",
  newEvent: "event:new",
  openEvent: "event:open",
  loadEvent: "event:load",
  saveEvent: "event:save",
  importSvg: "event:import-svg",
  showAsset: "event:show-asset",
  chooseFavicon: "event:choose-favicon",
  removeFavicon: "event:remove-favicon",
  buildStatus: "build:status",
  startBuild: "build:start",
  cancelBuild: "build:cancel",
  revealDist: "build:reveal-dist",
  startPreview: "build:preview",
  getSettings: "settings:get",
  updateSettings: "settings:update",
  editState: "edit:state",
  // Sent from the main process
  onMenu: "on:menu",
  onEdit: "on:edit",
  onOpenSettings: "on:open-settings",
  onAssetChanged: "on:asset-changed",
  onBuild: "on:build",
} as const;

export type NativeResult =
  | { ok: true }
  | { ok: false; cancelled: true }
  | { ok: false; cancelled?: false; message: string };

export type MenuAction =
  { type: "new" } | { type: "open" } | { type: "open-recent"; path: string };

/** An Edit menu command the editor handles itself. */
export type EditAction = "undo" | "redo";

/**
 * Whether Undo and Redo are available, and the label of the edit each would
 * apply. Null means unavailable.
 */
export type EditState = { undo: string | null; redo: string | null };

/** Subscribes to a message from the main process. Returns an unsubscribe. */
type Listen<T = void> = (callback: (data: T) => void) => () => void;

/** What the preload script exposes to the page as `window.concarte`. */
export type Bridge = {
  /** What the editor is running on, for the About tab. */
  runtime: {
    electron: string;
    chrome: string;
    node: string;
    platform: string;
    arch: string;
  };
  session(): Promise<SessionResponse>;
  event: {
    /** Asks for an empty folder and creates an event in it. */
    create(): Promise<NativeResult>;
    /** Opens `path`, or asks for a folder when it's left out. */
    open(path?: string): Promise<NativeResult>;
    load(): Promise<LoadResponse>;
    save(body: SaveRequest): Promise<SaveResponse>;
    /** Asks for an SVG and copies it into the event's assets. */
    importSvg(): Promise<ImportSvgResponse>;
    /** Shows an asset in the file manager. */
    showAsset(asset: string): Promise<void>;
    /** Asks for an image and saves it as the event's favicon. */
    chooseFavicon(): Promise<FaviconResponse>;
    removeFavicon(): Promise<void>;
  };
  build: {
    status(): Promise<BuildResponse>;
    start(): Promise<BuildStartResponse>;
    cancel(): Promise<BuildResponse>;
    /** Shows the built site's folder in the file manager. */
    revealDist(): Promise<void>;
    /** Serves the saved event and opens it in the browser. */
    preview(): Promise<PreviewResponse>;
  };
  settings: {
    get(): Promise<Settings>;
    /** Saves the valid parts of `update` and resolves to the new settings. */
    update(update: SettingsUpdate): Promise<Settings>;
  };
  /** Keeps the Edit menu's Undo and Redo items in step with the history. */
  setEditState(state: EditState): void;
  on: {
    /** A File menu item was chosen. */
    menu: Listen<MenuAction>;
    /** Undo or Redo was chosen in the Edit menu. */
    edit: Listen<EditAction>;
    /** Settings was chosen in the menu. */
    openSettings: Listen;
    /** A file under the event's assets/ changed; its path relative to there. */
    assetChanged: Listen<string>;
    build: Listen<BuildState>;
  };
};
