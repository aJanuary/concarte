import type { Config, Map as MapConfig, Overlay, Room } from "@concarte/core";

export type { Config, MapConfig, Overlay, Room };
export {
  ASSETS_DIR,
  CONFIG_FILE,
  assetPath,
  srcFromAsset,
  THEME_KEYS,
} from "@concarte/core";
export type Theme = Config["theme"];
export type RoomLink = NonNullable<Room["link"]>;

/** `T` with its optional keys required to be written out, even as undefined. */
export type Complete<T> = { [K in keyof Required<T>]: T[K] };
