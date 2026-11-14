import { useEffect } from "react";
import type { SaveResult } from "../document/useSaving";
import { concarte, runMenuAction } from "../platform/bridge";

/**
 * Handles the File menu's New, Open and Open recent, which replace the event
 * being edited, saving this one first.
 */
export function useEventSwitching({
  save,
  setStatus,
  onSwitched,
}: {
  save: () => Promise<SaveResult>;
  setStatus: (status: string) => void;
  /** After another event has been opened in place of this one. */
  onSwitched: () => void;
}) {
  useEffect(() => {
    return concarte.on.menu(async (action) => {
      const saved = await save();
      if (
        saved === "conflict" ||
        (saved === "failed" && !window.confirm("Discard your unsaved changes?"))
      ) {
        return;
      }
      const result = await runMenuAction(action);
      if (result.ok) {
        onSwitched();
      } else if (!result.cancelled) {
        setStatus(result.message);
      }
    });
  }, [save, setStatus, onSwitched]);
}
