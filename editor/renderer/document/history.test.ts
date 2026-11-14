import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  createHistory,
  current,
  isDirty,
  markSaved,
  push,
  redo,
  redoLabel,
  undo,
  undoLabel,
} from "./history";

describe("history", () => {
  it("starts clean", () => {
    const h = createHistory({ n: 0 });
    expect(isDirty(h)).toBe(false);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it("undoes and redoes", () => {
    let h = createHistory(1);
    h = push(h, 2);
    h = push(h, 3);
    h = undo(h);
    expect(current(h)).toBe(2);
    h = undo(h);
    expect(current(h)).toBe(1);
    h = redo(h);
    expect(current(h)).toBe(2);
  });

  it("drops redo entries on a new edit", () => {
    let h = createHistory(1);
    h = push(h, 2);
    h = undo(h);
    h = push(h, 5);
    expect(canRedo(h)).toBe(false);
    expect(current(h)).toBe(5);
  });

  it("ignores an edit that changes nothing", () => {
    const state = { n: 1 };
    const h = createHistory(state);
    expect(push(h, state)).toBe(h);
  });

  it("is dirty only when away from the saved entry", () => {
    let h = createHistory(1);
    h = push(h, 2);
    expect(isDirty(h)).toBe(true);
    h = markSaved(h);
    expect(isDirty(h)).toBe(false);
    h = undo(h);
    expect(isDirty(h)).toBe(true);
    h = redo(h);
    expect(isDirty(h)).toBe(false);
  });

  it("stays dirty after the saved entry is discarded", () => {
    let h = createHistory(1);
    h = push(h, 2);
    h = markSaved(h);
    h = undo(h);
    h = push(h, 3);
    h = undo(h);
    h = redo(h);
    expect(isDirty(h)).toBe(true);
    h = undo(h);
    h = redo(h);
    expect(h.savedIndex).toBe(-1);
  });

  it("coalesces edits with the same key", () => {
    let h = createHistory("");
    h = push(h, "a", "text");
    h = push(h, "ab", "text");
    h = push(h, "abc", "text");
    expect(h.entries).toEqual(["", "abc"]);
    h = undo(h);
    expect(current(h)).toBe("");
  });

  it("does not coalesce across different keys or after undo", () => {
    let h = createHistory("");
    h = push(h, "a", "one");
    h = push(h, "b", "two");
    expect(h.entries).toHaveLength(3);
    h = undo(h);
    h = push(h, "c", "two");
    expect(h.entries).toEqual(["", "a", "c"]);
  });

  it("is dirty after coalescing into the saved entry", () => {
    let h = createHistory("");
    h = push(h, "a", "text");
    h = markSaved(h);
    h = push(h, "ab", "text");
    expect(isDirty(h)).toBe(true);
  });
});

describe("history labels", () => {
  it("describes what undo and redo would do", () => {
    let h = createHistory(1);
    expect(undoLabel(h)).toBeUndefined();
    h = push(h, 2, undefined, "Add room a");
    h = push(h, 3, undefined, "Remove room b");
    expect(undoLabel(h)).toBe("Remove room b");
    h = undo(h);
    expect(undoLabel(h)).toBe("Add room a");
    expect(redoLabel(h)).toBe("Remove room b");
    h = undo(h);
    expect(undoLabel(h)).toBeUndefined();
    expect(redoLabel(h)).toBe("Add room a");
  });

  it("keeps the latest label when edits coalesce", () => {
    let h = createHistory("");
    h = push(h, "a", "text", "Change label of room x");
    h = push(h, "ab", "text", "Change label of room x");
    expect(undoLabel(h)).toBe("Change label of room x");
    expect(h.labels).toHaveLength(2);
  });
});
