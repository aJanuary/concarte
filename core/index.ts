// Everything here runs in a browser as well as under Node. What needs Node is
// exported from ./node.ts.
export type { Config, Map, Overlay, Room } from "./config.types.ts";
export {
  configShapeProblems,
  parseConfig,
  THEME_KEYS,
  type ParsedConfig,
} from "./config-shape.ts";
export { ASSETS_DIR, CONFIG_FILE, assetPath, srcFromAsset } from "./event.ts";
export type {
  ResolvedConfig,
  ResolvedMap,
  ResolvedRoom,
} from "./resolve-config.ts";
export { resolveShape, type Ring, type SvgDocument } from "./shape-resolver.ts";
export { validateConfig, type Issue } from "./validate-config.ts";
