import { useCallback, useEffect, useState } from "react";
import type { BuildResponse, BuildStartResponse } from "../../../shared/api";
import { concarte, useMainEvent } from "../../platform/bridge";

export function useBuild() {
  const [state, setState] = useState<BuildResponse>({
    status: "idle",
    log: "",
    freshness: "missing",
  });

  const refresh = useCallback(() => {
    void concarte.build.status().then(setState);
  }, []);
  useEffect(refresh, [refresh]);

  useMainEvent("build", (next) => {
    setState((prev) => ({ ...prev, ...next }));
    // Freshness is derived from the files on disk, so ask again when done.
    if (next.status !== "running") {
      refresh();
    }
  });

  const start = useCallback(async (): Promise<BuildStartResponse> => {
    const body = await concarte.build.start();
    if (!("reason" in body)) {
      setState(body);
    }
    return body;
  }, []);

  return { state, start };
}
