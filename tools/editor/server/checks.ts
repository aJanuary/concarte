import type { Config } from "../shared/schema.ts";
import { roomRef } from "../shared/schema.ts";

/**
 * Problems that stop the editor opening a config. `readAsset` returns whether
 * the asset at a config `src` could be read.
 */
export function checkConfig(
  config: Config,
  canReadAsset: (src: string) => boolean,
): string[] {
  const errors: string[] = [];
  for (const map of config.maps) {
    const where = `map "${map.id}"`;
    if (!map.src.toLowerCase().endsWith(".svg")) {
      errors.push(
        `The ${where} has src "${map.src}", which is not an SVG. The editor only supports SVG maps.`,
      );
    } else if (!canReadAsset(map.src)) {
      errors.push(`The SVG for ${where} ("${map.src}") could not be read.`);
    }
    for (const room of map.rooms) {
      if (roomRef(room) === undefined) {
        errors.push(
          `Room "${room.id}" on ${where} has an area that is not { ref }. The editor only supports areas that reference an SVG element.`,
        );
      }
    }
  }
  return errors;
}
