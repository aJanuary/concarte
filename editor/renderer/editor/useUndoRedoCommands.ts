import { useEffect } from "react";
import {
  canRedo,
  canUndo,
  redoLabel,
  undoLabel,
  type History,
} from "../document/history";
import { concarte } from "../platform/bridge";

/**
 * Wires Undo and Redo to the keyboard and to the Edit menu, whose items name
 * the edit they would apply.
 */
export function useUndoRedoCommands(
  history: History<unknown>,
  step: (action: "undo" | "redo") => void,
) {
  useEffect(() => concarte.on.edit(step), [step]);

  useEffect(() => {
    concarte.setEditState({
      undo: canUndo(history) ? (undoLabel(history) ?? "") : null,
      redo: canRedo(history) ? (redoLabel(history) ?? "") : null,
    });
  }, [history]);

  useEffect(() => {
    return () => concarte.setEditState({ undo: null, redo: null });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        // The markdown editor has its own undo history.
        !(e.target as Element).closest?.(".cm-editor")
      ) {
        e.preventDefault();
        step(e.shiftKey ? "redo" : "undo");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);
}
