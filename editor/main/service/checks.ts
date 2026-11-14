import type { Config } from "../../shared/schema.ts";

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
    if (!canReadAsset(map.src)) {
      errors.push(
        `The SVG for map "${map.id}" ("${map.src}") could not be read.`,
      );
    }
  }
  return errors;
}
