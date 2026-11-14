import { AlertDialog, DialogContainer } from "@react-spectrum/s2";
import { useState, type ReactNode } from "react";
import { concarte } from "../platform/bridge";

/**
 * Asks for an SVG, copies it into the event's assets and hands its asset
 * path to `onImported`. The dialog explains a failure, and must be rendered.
 */
export function useImportSvg(
  errorTitle: string,
  onImported: (asset: string) => void,
): { importSvg: () => void; dialog: ReactNode } {
  const [error, setError] = useState("");

  const importSvg = async () => {
    try {
      const body = await concarte.event.importSvg();
      if ("cancelled" in body) {
        return;
      }
      if ("error" in body) {
        setError(body.error);
        return;
      }
      onImported(body.asset);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const dialog = (
    <DialogContainer onDismiss={() => setError("")}>
      {error && (
        <AlertDialog title={errorTitle} variant="error" primaryActionLabel="OK">
          {error}
        </AlertDialog>
      )}
    </DialogContainer>
  );

  return { importSvg: () => void importSvg(), dialog };
}
