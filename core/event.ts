/** The file in an event folder that holds its config. */
export const CONFIG_FILE = "concarte.json";

/** The folder in an event folder that holds its maps, overlays and favicon. */
export const ASSETS_DIR = "assets";

/** An asset's path relative to the event's assets folder. */
export function assetPath(src: string): string {
  return src.replace(/^\/+/, "");
}

/** The config `src` of an asset. */
export function srcFromAsset(asset: string): string {
  return "/" + asset;
}
