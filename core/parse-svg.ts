import { DOMParser } from "linkedom";
import type { SvgDocument } from "./svg-ref-resolver.ts";

/** Parses SVG source under Node, where there is no DOM. */
export function parseSvg(svgSource: string): SvgDocument {
  return new DOMParser().parseFromString(svgSource, "image/svg+xml");
}
