import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join } from "path";

export type SiteCopyOptions = {
  /** The app's bundle, which holds the site's files beside the editor's. */
  bundleDir: string;
  /** The per-user folder the copy is kept in. */
  userData: string;
  version: string;
};

/**
 * The packaged app builds the site in a writable copy of it: the installed
 * app may be read-only, and the build writes next to its sources.
 */
export function createSiteCopy({
  bundleDir,
  userData,
  version,
}: SiteCopyOptions) {
  const root = join(userData, `site-${version}`);

  /** Makes the copy if this build of the app hasn't yet. */
  async function prepare(log: (text: string) => void): Promise<void> {
    // Keyed by build, not version: rebuilds of the same version must not
    // reuse a copy of an older build's files.
    const marker = join(root, ".copied");
    const buildId = readFileSync(join(bundleDir, "build-id.txt"), "utf8");
    if (existsSync(marker) && readFileSync(marker, "utf8") === buildId) {
      return;
    }
    log("Preparing the build tools. This only happens once...\n");
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    cpSync(bundleDir, root, {
      recursive: true,
      filter: (source) => source !== join(bundleDir, "ui"),
    });
    writeFileSync(marker, buildId);
    for (const entry of readdirSync(userData)) {
      if (entry.startsWith("site-") && join(userData, entry) !== root) {
        rmSync(join(userData, entry), { recursive: true, force: true });
      }
    }
  }

  return { root, prepare };
}
