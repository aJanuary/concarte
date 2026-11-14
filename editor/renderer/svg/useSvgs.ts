import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetPath } from "../../shared/schema";
import type { SvgDocument } from "@concarte/core";
import { fetchAsset, useMainEvent } from "../platform/bridge";
import { parseSvg, type ParsedSvg } from "./parse";
import type { SvgTreeNode } from "./tree";

/** A map's SVG: undefined while loading, "error" if it couldn't be read. */
export type SvgState = ParsedSvg | "error" | undefined;

export type Svgs = {
  /** By map `src`. */
  svgs: Record<string, SvgState>;
  /** The element tree of each SVG that has loaded, by map `src`. */
  trees: Record<string, SvgTreeNode[] | undefined>;
  /** The parsed document of each SVG that has loaded, by map `src`. */
  documents: Record<string, SvgDocument | undefined>;
  /** Maps whose file changed on disk since they were last loaded. */
  changed: Set<string>;
  reload: (src: string) => void;
};

function fetchSvg(src: string): Promise<SvgState> {
  return fetchAsset(assetPath(src))
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText);
      }
      return res.text();
    })
    .then((text) => parseSvg(text))
    .catch((): SvgState => "error");
}

export function useSvgs(srcs: string[]): Svgs {
  const [svgs, setSvgs] = useState<Record<string, SvgState>>({});
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

  useMainEvent("assetChanged", (path) => {
    if (loaded.current.has(path)) {
      setChangedPaths((prev) => new Set(prev).add(path));
    }
  });

  const { trees, documents } = useMemo(() => {
    const trees: Svgs["trees"] = {};
    const documents: Svgs["documents"] = {};
    for (const [src, svg] of Object.entries(svgs)) {
      if (svg && svg !== "error") {
        trees[src] = svg.tree;
        documents[src] = svg.document;
      }
    }
    return { trees, documents };
  }, [svgs]);

  const changed = useMemo(
    () =>
      new Set(
        key.split("\n").filter((src) => changedPaths.has(assetPath(src))),
      ),
    [key, changedPaths],
  );
  return useMemo(
    () => ({ svgs, trees, documents, changed, reload }),
    [svgs, trees, documents, changed, reload],
  );
}
