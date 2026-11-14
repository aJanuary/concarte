import { useCallback, useEffect, useRef, useState } from "react";
import type { Config } from "../../shared/schema";
import { concarte } from "../platform/bridge";

/** "conflict": the file changed on disk, and the user hasn't yet chosen. */
export type SaveResult = "saved" | "conflict" | "failed";

export type SavingOptions = {
  doc: Config;
  /** The history index of `doc`, reported back once it is saved. */
  index: number;
  /** The config and its file's modification time as loaded. */
  loaded: { config: Config; mtime: number };
  /** Turns the document into what is written to the file. */
  toFile: (doc: Config) => Config;
  onSaved: (index: number) => void;
  setStatus: (status: string) => void;
};

/** Saves the document to the event's config, one save at a time. */
export function useSaving({
  doc,
  index,
  loaded,
  toFile,
  onSaved,
  setStatus,
}: SavingOptions) {
  const [conflict, setConflict] = useState(false);
  const [saveTick, setSaveTick] = useState(0);

  // A save can be asked for in the same event as the edit it should include,
  // so it reads the state of the latest render rather than of its caller's.
  const latest = useRef({ doc, index, toFile, onSaved });
  useEffect(() => {
    latest.current = { doc, index, toFile, onSaved };
  });
  const onDisk = useRef({
    doc: loaded.config,
    mtime: loaded.mtime,
    conflict: false,
  });
  // Saves run one at a time so a slow response can't overwrite a newer save.
  const queue = useRef<Promise<SaveResult>>(Promise.resolve("saved"));

  const save = useCallback(
    (force = false): Promise<SaveResult> => {
      const run = async (): Promise<SaveResult> => {
        const { doc, index, toFile, onSaved } = latest.current;
        if (!force && onDisk.current.conflict) {
          return "conflict";
        }
        if (!force && doc === onDisk.current.doc) {
          return "saved";
        }
        setStatus("Saving...");
        try {
          const body = await concarte.event.save({
            config: toFile(doc),
            mtime: onDisk.current.mtime,
            force,
          });
          setStatus("");
          if (!body.ok) {
            onDisk.current.conflict = true;
            setConflict(true);
            return "conflict";
          }
          onDisk.current = { doc, mtime: body.mtime, conflict: false };
          onSaved(index);
          return "saved";
        } catch (e) {
          setStatus(`Not saved: ${(e as Error).message}`);
          return "failed";
        }
      };
      const next = queue.current.then(run, run);
      queue.current = next;
      return next;
    },
    [setStatus],
  );

  // Bumping a counter runs the save after the render that holds the edit.
  const requestSave = useCallback(() => setSaveTick((t) => t + 1), []);
  useEffect(() => {
    if (saveTick > 0) {
      void save();
    }
  }, [saveTick, save]);

  const overwrite = useCallback(() => {
    onDisk.current.conflict = false;
    setConflict(false);
    void save(true);
  }, [save]);

  return {
    /** Saves if anything is unsaved. */
    save,
    /** Saves once the edits made in this event have been applied. */
    requestSave,
    /** Whether the file changed on disk under unsaved edits. */
    conflict,
    /** Resolves a conflict by saving over the file on disk. */
    overwrite,
  };
}
