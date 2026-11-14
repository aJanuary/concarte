// Everything here runs in a browser as well as under Node. What needs Node is
// exported from ./node.ts.
export type { Config, Map, Overlay, Room } from "./config.types.ts";
export { resolveAreaRefIn, type SvgDocument } from "./svg-ref-resolver.ts";
export { dedent } from "./text.ts";
