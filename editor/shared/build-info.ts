/** Identifies the build of the editor, fixed when the app is bundled. */
export type BuildInfo = {
  /** The repository's package.json version. */
  version: string;
  /** Short commit hash, suffixed "-dirty" with uncommitted changes. */
  commit: string | null;
  /** When the app was bundled, as an ISO timestamp. */
  date: string;
};
