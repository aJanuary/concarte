import { useEffect, useRef } from "react";
import type { Bridge, MenuAction, NativeResult } from "../../shared/bridge";
import type { PageMessages } from "../../shared/api";
import type { Config } from "../../shared/schema";

/** The main process, as the preload script exposes it. */
export const concarte = window.concarte;

/** The open event as read from disk. */
export type LoadedEvent = {
  eventDir: string;
  config: Config;
  mtime: number;
  locales: string[];
  pageMessages: PageMessages;
};

/** The URL an asset of the open event is served from. */
export function assetUrl(asset: string): string {
  return `/event-assets/${asset}`;
}

/** Uncached, so a file changed on disk is read afresh. */
export function fetchAsset(asset: string): Promise<Response> {
  return fetch(assetUrl(asset), { cache: "no-store" });
}

export function runMenuAction(action: MenuAction): Promise<NativeResult> {
  switch (action.type) {
    case "new":
      return concarte.event.create();
    case "open":
      return concarte.event.open();
    case "open-recent":
      return concarte.event.open(action.path);
  }
}

type Events = Bridge["on"];
type Payload<E extends keyof Events> = Parameters<Parameters<Events[E]>[0]>[0];

/** Subscribes to a message from the main process while mounted. */
export function useMainEvent<E extends keyof Events>(
  name: E,
  onEvent: (data: Payload<E>) => void,
) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(
    () =>
      (concarte.on[name] as (cb: (data: Payload<E>) => void) => () => void)(
        (data) => handler.current(data),
      ),
    [name],
  );
}
