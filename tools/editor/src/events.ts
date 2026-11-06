import { useEffect, useRef } from "react";

/** Subscribes to one named server-sent event of the editor API. */
export function useServerEvents(
  name: string,
  onEvent: (data: unknown) => void,
) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const source = new EventSource("/api/events");
    const listener = (e: Event) =>
      handler.current(JSON.parse((e as MessageEvent<string>).data));
    source.addEventListener(name, listener);
    return () => source.close();
  }, [name]);
}
