import { relative } from "path";
import {
  SSE_ASSET_CHANGED,
  SSE_BUILD,
  type BuildState,
  type RecentEvent,
} from "../shared/api.ts";
import { createBuildRunner } from "./build-runner.ts";
import { createEventStore, type EventStore } from "./event-store.ts";
import { createDevRunner } from "./dev-runner.ts";

export type HostOptions = {
  messagesDir: string;
  /** Set where an event can be built and previewed. */
  build?: {
    siteRoot: string;
    nodePath: string;
    prepare?: (log: (text: string) => void) => Promise<void>;
  };
  /** Opens a URL in the user's browser. */
  openUrl?: (url: string) => void;
  /** Shows a folder in the file manager. */
  reveal?: (path: string) => void;
  /** Shows a file selected in the file manager. */
  showFile?: (path: string) => void;
  recents?: () => RecentEvent[];
  /** Shows the event's path relative to this directory. */
  relativeTo?: string;
};

type Subscriber = (event: string, data: unknown) => void;

/** The event currently open, and the services that work on it. */
export function createEditorHost(options: HostOptions) {
  let store: EventStore | undefined;
  let stopWatching: (() => void) | undefined;
  const subscribers = new Set<Subscriber>();
  const publish: Subscriber = (event, data) =>
    subscribers.forEach((fn) => fn(event, data));

  const dev = options.build ? createDevRunner(options.build) : undefined;
  const runner = options.build
    ? createBuildRunner({
        ...options.build,
        onChange: (state: BuildState) => publish(SSE_BUILD, state),
      })
    : undefined;

  async function open(eventDir: string): Promise<EventStore> {
    stopWatching?.();
    await dev?.stop();
    store = createEventStore({
      eventDir,
      messagesDir: options.messagesDir,
      displayDir: options.relativeTo
        ? relative(options.relativeTo, eventDir)
        : undefined,
    });
    stopWatching = store.watchAssets((path) =>
      publish(SSE_ASSET_CHANGED, path),
    );
    return store;
  }

  async function close() {
    stopWatching?.();
    runner?.cancel();
    await dev?.stop();
  }

  return {
    open,
    close,
    store: () => store,
    runner,
    dev,
    canBuild: runner !== undefined,
    openUrl: options.openUrl ?? (() => {}),
    reveal: options.reveal ?? (() => {}),
    showFile: options.showFile ?? (() => {}),
    recents: options.recents ?? (() => []),
    subscribe(fn: Subscriber) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

export type EditorHost = ReturnType<typeof createEditorHost>;
