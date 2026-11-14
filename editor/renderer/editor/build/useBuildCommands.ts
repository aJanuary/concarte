import type { SaveResult } from "../../document/useSaving";
import { concarte } from "../../platform/bridge";
import { plural } from "../../ui/text";
import { useBuild } from "./useBuild";

/**
 * Build and Preview, which work from the file on disk and so save first. The
 * main process refuses a config with errors.
 */
export function useBuildCommands({
  save,
  setStatus,
  onStarted,
}: {
  save: () => Promise<SaveResult>;
  setStatus: (status: string) => void;
  /** After a build has started. */
  onStarted: () => void;
}) {
  const { state, start } = useBuild();

  const refuseInvalid = (errors: string[]) =>
    setStatus(`Fix ${plural(errors.length, "error")} first`);

  const build = async () => {
    if ((await save()) !== "saved") {
      return;
    }
    const result = await start();
    if ("reason" in result) {
      refuseInvalid(result.errors);
    } else {
      onStarted();
    }
  };

  const preview = async () => {
    if ((await save()) !== "saved") {
      return;
    }
    setStatus("Starting the preview...");
    const result = await concarte.build.preview();
    if (result.ok) {
      setStatus("Preview opened in your browser");
    } else if (result.reason === "invalid") {
      refuseInvalid(result.errors);
    } else {
      setStatus("");
      if (result.reason === "failed") {
        window.alert(`The preview couldn't start.\n\n${result.error}`);
      }
    }
  };

  return {
    state,
    build,
    preview,
    cancel: () => concarte.build.cancel(),
    revealDist: () => concarte.build.revealDist(),
  };
}
