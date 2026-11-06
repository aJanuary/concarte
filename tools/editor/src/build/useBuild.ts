import { useCallback, useEffect, useState } from "react";
import {
  SSE_BUILD,
  type BuildResponse,
  type BuildStartResponse,
  type BuildState,
  type PreviewResponse,
} from "../../shared/api";
import { useServerEvents } from "../events";

async function request<T>(url: string, method: string): Promise<T> {
  return (await (await fetch(url, { method })).json()) as T;
}

export function useBuild(enabled: boolean) {
  const [state, setState] = useState<BuildResponse>({
    status: "idle",
    log: "",
    freshness: "missing",
  });

  const refresh = useCallback(async () => {
    if (enabled) {
      setState(await request<BuildResponse>("/api/build", "GET"));
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      request<BuildResponse>("/api/build", "GET").then(setState);
    }
  }, [enabled]);

  useServerEvents(SSE_BUILD, (data) => {
    const next = data as BuildState;
    setState((prev) => ({ ...prev, ...next }));
    // Freshness is derived from the files on disk, so ask again when done.
    if (next.status !== "running") {
      void refresh();
    }
  });

  const start = useCallback(async (): Promise<BuildStartResponse> => {
    const body = await request<BuildStartResponse>("/api/build", "POST");
    if (!("reason" in body)) {
      setState(body);
    }
    return body;
  }, []);
  const cancel = useCallback(async () => {
    await request("/api/build", "DELETE");
  }, []);
  const preview = useCallback(
    () => request<PreviewResponse>("/api/preview", "POST"),
    [],
  );
  const reveal = useCallback(() => request("/api/reveal-dist", "POST"), []);

  return { state, start, cancel, preview, reveal };
}
