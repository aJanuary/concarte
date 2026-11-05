import { useEffect, useRef, useState } from "react";
import { assetPath } from "../../shared/schema";
import { parseSvg, type ParsedSvg } from "./parse";

export type SvgState = ParsedSvg | "error";

export function useSvgs(srcs: string[]): Record<string, SvgState | undefined> {
  const [svgs, setSvgs] = useState<Record<string, SvgState | undefined>>({});
  const requested = useRef(new Set<string>());

  const key = srcs.join("\n");
  useEffect(() => {
    for (const src of key.split("\n").filter(Boolean)) {
      if (requested.current.has(src)) {
        continue;
      }
      requested.current.add(src);
      fetch(`/assets/${assetPath(src)}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(res.statusText);
          }
          return res.text();
        })
        .then((text) => parseSvg(text))
        .catch((): SvgState => "error")
        .then((state) => setSvgs((prev) => ({ ...prev, [src]: state })));
    }
  }, [key]);

  return svgs;
}
