// Everything here runs in a browser as well as under Node. What needs Node is
// exported from ./node.ts.
export type { Config, Map, Overlay, Room } from "./config.types.ts";
export type {
  ResolvedConfig,
  ResolvedMap,
  ResolvedRoom,
} from "./resolve-config.ts";
export { resolveShape, type Ring, type SvgDocument } from "./shape-resolver.ts";
export { dedent } from "./text.ts";
