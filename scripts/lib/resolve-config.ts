import { Config, Room } from "../../app/config.types";
import { parseSvg, resolveAreaRefIn, SvgDocument } from "./svg-ref-resolver";

function isRef(area: Room["area"]): area is { ref: string } {
  return !Array.isArray(area) && typeof area === "object";
}

/**
 * Returns a copy of `config` with every room's `{ ref }` area resolved into
 * a plain SVG path string, by reading the room's map's SVG (via `readSvg`,
 * a function from map `src` to file contents) and looking up the referenced
 * element.
 *
 * Throws, naming the offending map/room/id, if a reference can't be resolved.
 */
export function resolveConfig(
  config: Config,
  readSvg: (src: string) => string,
): Config {
  const documentCache = new Map<string, SvgDocument>();
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
        const { area } = room;
        if (!isRef(area)) {
          return room;
        }

        try {
          return {
            ...room,
            area: resolveAreaRefIn(getDocument(map.src), area.ref),
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `Failed to resolve area for room "${room.id}" on map "${map.id}" (${map.src}): ${message}`,
          );
        }
      }),
    })),
  };
}
