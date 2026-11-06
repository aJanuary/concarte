import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetPath } from "../../shared/schema";
import { ASSET_CHANGED_EVENT } from "../../shared/api";
import { parseSvg, type ParsedSvg } from "./parse";

export type SvgState = ParsedSvg | "error";

function fetchSvg(src: string): Promise<SvgState> {
  return fetch(`/assets/${assetPath(src)}`, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res.text();
    })
    .then((text) => parseSvg(text))
    .catch((): SvgState => "error");
}

export function useSvgs(srcs: string[]): {
  svgs: Record<string, SvgState | undefined>;
  /** Maps whose file changed on disk since they were last loaded. */
  changed: Set<string>;
  reload: (src: string) => void;
} {
  const [svgs, setSvgs] = useState<Record<string, SvgState | undefined>>({});
  const [changedPaths, setChangedPaths] = useState<Set<string>>(new Set());
  const requested = useRef(new Set<string>());
  // Only maps that have been loaded can be stale; a change to a file that was
  // never fetched needs no marker because the first fetch reads the new one.
  const loaded = useRef(new Set<string>());

  const load = useCallback(
    (src: string) =>
      fetchSvg(src).then((state) => {
        loaded.current.add(assetPath(src));
        setSvgs((prev) => ({ ...prev, [src]: state }));
      }),
    [],
  );

  const reload = useCallback(
    (src: string) => {
      setChangedPaths((prev) => {
        const next = new Set(prev);
        next.delete(assetPath(src));
        return next;
      });
      void load(src);
    },
    [load],
  );

  const key = srcs.join("\n");
  useEffect(() => {
    for (const src of key.split("\n").filter(Boolean)) {
      if (!requested.current.has(src)) {
        requested.current.add(src);
        void load(src);
      }
    }
  }, [key, load]);

  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) {
      return;
    }
    const onChange = (path: string) => {
      if (loaded.current.has(path)) {
        setChangedPaths((prev) => new Set(prev).add(path));
      }
    };
    hot.on(ASSET_CHANGED_EVENT, onChange);
    return () => hot.off(ASSET_CHANGED_EVENT, onChange);
  }, []);

  const changed = useMemo(
    () =>
      new Set(
        key.split("\n").filter((src) => changedPaths.has(assetPath(src))),
      ),
    [key, changedPaths],
  );
  return { svgs, changed, reload };
}
