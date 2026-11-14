import { useCallback, useReducer } from "react";
import type { Config } from "../../shared/schema";
import {
  createHistory,
  current,
  isDirty,
  markSaved,
  push,
  redo,
  undo,
  type History,
} from "./history";
import type { Apply, Edit } from "./ops";

type Action =
  | { type: "edit"; edit: Edit; key?: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; index: number };

function reducer(history: History<Config>, action: Action): History<Config> {
  switch (action.type) {
    case "edit":
      return push(
        history,
        action.edit(current(history)),
        action.key,
        action.edit.label,
      );
    case "undo":
      return undo(history);
    case "redo":
      return redo(history);
    case "saved":
      return markSaved(history, action.index);
  }
}

/** The config being edited, with its undo history. */
export function useDocument(initial: Config) {
  const [history, dispatch] = useReducer(reducer, initial, createHistory);

  const apply: Apply = useCallback(
    (edit, key) => dispatch({ type: "edit", edit, key }),
    [],
  );
  const step = useCallback((type: "undo" | "redo") => dispatch({ type }), []);
  const markSaved = useCallback(
    (index: number) => dispatch({ type: "saved", index }),
    [],
  );

  return {
    doc: current(history),
    history,
    /** Whether the document differs from what was last saved. */
    dirty: isDirty(history),
    apply,
    /** Undoes or redoes one edit. */
    step,
    /** Records that the history entry at `index` is what is on disk. */
    markSaved,
  };
}
