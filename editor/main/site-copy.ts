import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { extract } from "tar";

/**
 * The site and its node_modules as one file: installers and macOS handle tens
 * of thousands of small files slowly.
 */
export const SITE_ARCHIVE = "site.tar.gz";

export type SiteCopyOptions = {
  /** The app's bundle, which holds the site's archive beside the editor. */
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
    await extract({ file: join(bundleDir, SITE_ARCHIVE), cwd: root });
    writeFileSync(marker, buildId);
    for (const entry of readdirSync(userData)) {
      if (entry.startsWith("site-") && join(userData, entry) !== root) {
        rmSync(join(userData, entry), { recursive: true, force: true });
      }
    }
  }

  return { root, prepare };
}
