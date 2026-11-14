import { basename, join } from "path";
import type {
  BuildResponse,
  BuildState,
  PreviewResponse,
  RecentEvent,
  SessionResponse,
} from "../../shared/api.ts";
import { buildFreshness, createBuildRunner } from "./build-runner.ts";
import { createDevRunner } from "./dev-runner.ts";
import { createEventStore, type EventStore } from "./event-store.ts";

/**
 * What the main process provides: where the site is, and how to reach the
 * user's desktop.
 */
export type Host = {
  /** Folder of the site's `<locale>.json` message files. */
  messagesDir: string;
  build: {
    siteRoot: string;
    nodePath: string;
    prepare?: (log: (text: string) => void) => Promise<void>;
  };
  /** Opens a URL in the user's browser. */
  openUrl: (url: string) => void;
  /** Shows a folder in the file manager. */
  reveal: (path: string) => void;
  /** Shows a file selected in the file manager. */
  showFile: (path: string) => void;
  recents: () => RecentEvent[];
};

/** What the service announces, by name, with what each carries. */
export type ServiceEvents = {
  /** A file under the event's assets/ changed; its path relative to there. */
  "asset-changed": string;
  build: BuildState;
};

type Subscriber = <E extends keyof ServiceEvents>(
  event: E,
  data: ServiceEvents[E],
) => void;

export type BuildStart =
  | { outcome: "invalid"; errors: string[] }
  /** "busy": a build was already running, and carries on. */
  | { outcome: "started" | "busy"; build: BuildResponse };

/**
 * Everything the editor does outside the page: the event currently open, and
 * building and previewing it. The IPC handlers only translate messages into
 * calls on this.
 */
export function createEditorService(host: Host) {
  let store: EventStore | undefined;
  let stopWatching: (() => void) | undefined;
  const subscribers = new Set<Subscriber>();
  const publish: Subscriber = (event, data) =>
    subscribers.forEach((fn) => fn(event, data));

  const dev = createDevRunner(host.build);
  const builder = createBuildRunner({
    ...host.build,
    onChange: (state) => publish("build", state),
  });

  async function open(eventDir: string): Promise<void> {
    stopWatching?.();
    await dev.stop();
    store = createEventStore({ eventDir, messagesDir: host.messagesDir });
    stopWatching = store.watchAssets((path) => publish("asset-changed", path));
  }

  async function close() {
    stopWatching?.();
    builder.cancel();
    await dev.stop();
  }

  /**
   * The open event. The page only asks for it while one is open, so its
   * absence is a bug.
   */
  function event(): EventStore {
    if (!store) {
      throw new Error("No event is open");
    }
    return store;
  }

  /** The open event, if there is one. */
  function current(): EventStore | undefined {
    return store;
  }

  function session(): SessionResponse {
    return {
      event: store
        ? { dir: store.eventDir, name: basename(store.eventDir) }
        : null,
      recents: host.recents(),
    };
  }

  function buildStatus(): BuildResponse {
    return {
      ...builder.state(),
      freshness: store ? buildFreshness(store.eventDir) : "missing",
    };
  }

  /** Builds the event as saved on disk, unless its config has errors. */
  async function startBuild(): Promise<BuildStart> {
    const { eventDir, validate } = event();
    const errors = await validate();
    if (errors.length > 0) {
      return { outcome: "invalid", errors };
    }
    // A build and the dev server would both write to .next.
    await dev.stop();
    const started = builder.start(eventDir);
    return { outcome: started ? "started" : "busy", build: buildStatus() };
  }

  function cancelBuild(): BuildResponse {
    builder.cancel();
    return buildStatus();
  }

  /** Serves the event as saved on disk and opens it in the browser. */
  async function startPreview(): Promise<PreviewResponse> {
    if (!store) {
      return { ok: false, reason: "no-event" };
    }
    const errors = await store.validate();
    if (errors.length > 0) {
      return { ok: false, reason: "invalid", errors };
    }
    const result = await dev.start(store.eventDir);
    if (!result.ok) {
      return { ok: false, reason: "failed", error: result.error };
    }
    host.openUrl(result.url);
    return { ok: true, url: result.url };
  }

  /** Shows the built site's folder in the file manager. */
  function revealDist() {
    host.reveal(join(event().eventDir, "dist"));
  }

  /** Shows an asset in the file manager. False if there is no such asset. */
  function showAsset(asset: string): boolean {
    const file = event().resolveAsset(asset);
    if (!file) {
      return false;
    }
    host.showFile(file);
    return true;
  }

  return {
    open,
    close,
    event,
    current,
    session,
    buildStatus,
    startBuild,
    cancelBuild,
    startPreview,
    revealDist,
    showAsset,
    /** Calls back with each of `ServiceEvents`. Returns an unsubscribe. */
    subscribe(fn: Subscriber) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

export type EditorService = ReturnType<typeof createEditorService>;
