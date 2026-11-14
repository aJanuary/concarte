import { useCallback, useMemo } from "react";
import { validateConfig } from "@concarte/core";
import type { Config } from "../../shared/schema";
import type { Apply } from "../document/ops";
import { useDocument } from "../document/useDocument";
import { useSaving } from "../document/useSaving";
import type { LoadedEvent } from "../platform/bridge";
import { sortRoomsByTree } from "../svg/tree";
import { useSvgs, type Svgs } from "../svg/useSvgs";
import type { EditorSession } from "./session";
import { useSelection } from "./useSelection";

/** The file lists a map's rooms in the order of their elements in its SVG. */
function withRoomsInTreeOrder(doc: Config, trees: Svgs["trees"]): Config {
  return {
    ...doc,
    maps: doc.maps.map((map) => ({
      ...map,
      rooms: sortRoomsByTree(map.rooms, trees[map.src]),
    })),
  };
}

/**
 * Holds the state of one open event: its document with undo history and
 * saving, the SVGs of its maps, and the selection.
 */
export function useEditorSession(
  loaded: LoadedEvent,
  setStatus: (status: string) => void,
) {
  const document = useDocument(loaded.config);
  const { doc, history } = document;
  const svgs = useSvgs(doc.maps.map((m) => m.src));
  const { trees } = svgs;

  const saving = useSaving({
    doc,
    index: history.index,
    loaded,
    toFile: (doc) => withRoomsInTreeOrder(doc, trees),
    onSaved: document.markSaved,
    setStatus,
  });
  const { requestSave } = saving;

  const { apply: applyEdit, step: stepHistory } = document;
  const apply: Apply = useCallback(
    (edit, key) => {
      setStatus("");
      applyEdit(edit, key);
      // Keyed edits are field typing; they save when the field blurs.
      if (key === undefined) {
        requestSave();
      }
    },
    [setStatus, applyEdit, requestSave],
  );
  const step = useCallback(
    (type: "undo" | "redo") => {
      stepHistory(type);
      requestSave();
    },
    [stepHistory, requestSave],
  );

  const { selection, select, activeMap } = useSelection(doc);
  const issues = useMemo(
    () => validateConfig(doc, svgs.documents),
    [doc, svgs.documents],
  );

  const session: EditorSession = useMemo(
    () => ({
      eventDir: loaded.eventDir,
      doc,
      apply,
      svgs,
      issues,
      locales: loaded.locales,
      selection,
      select,
      activeMap,
    }),
    [loaded, doc, apply, svgs, issues, selection, select, activeMap],
  );

  return {
    session,
    history,
    dirty: document.dirty,
    /** Undoes or redoes one edit, and saves the result. */
    step,
    ...saving,
  };
}
