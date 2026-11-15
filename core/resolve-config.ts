import type { Config, Map, Room } from "./config.types.ts";
import { parseSvg } from "./parse-svg.ts";
import { resolveShape, type Ring, type SvgDocument } from "./shape-resolver.ts";

/** A room with its shape resolved into the outline the site draws. */
export type ResolvedRoom = Room & { area: Ring[] };
export type ResolvedMap = Omit<Map, "rooms"> & { rooms: ResolvedRoom[] };
export type ResolvedConfig = Omit<Config, "maps"> & { maps: ResolvedMap[] };

/**
 * Returns a copy of `config` with every room's shape resolved into its
 * `area`, by reading the room's map's SVG (via `readSvg`, a function from
 * map `src` to file contents) and looking up the element.
 *
 * Throws, naming the offending map/room/id, if a shape can't be resolved.
 */
export function resolveConfig(
  config: Config,
  readSvg: (src: string) => string,
): ResolvedConfig {
  const documentCache = new globalThis.Map<string, SvgDocument>();
  const getDocument = (src: string): SvgDocument => {
    let document = documentCache.get(src);
    if (document === undefined) {
      document = parseSvg(readSvg(src));
      documentCache.set(src, document);
    }
    return document;
  };

  return {
    ...config,
    maps: config.maps.map((map) => ({
      ...map,
      rooms: map.rooms.map((room) => {
        try {
          return {
            ...room,
            area: resolveShape(getDocument(map.src), room.shape),
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to resolve the shape of room "${room.id}" on map "${map.id}" (${map.src}): ${message}`,
          );
        }
      }),
    })),
  };
}
