import { realpathSync, statSync } from "fs";
import { join, sep } from "path";
import { assetPath } from "./event.ts";

/**
 * The real path of the file an asset `src` names, or undefined when it is
 * missing, isn't a file, or only reaches outside `assetsDir` through `..` or
 * a symlink.
 */
export function realAssetFile(
  assetsDir: string,
  src: string,
): string | undefined {
  try {
    const root = realpathSync(assetsDir);
    const real = realpathSync(join(root, assetPath(src)));
    if (!real.startsWith(root + sep) || !statSync(real).isFile()) {
      return undefined;
    }
    return real;
  } catch {
    return undefined;
  }
}
