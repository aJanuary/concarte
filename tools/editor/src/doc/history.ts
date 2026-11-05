export type History<T> = {
  entries: T[];
  index: number;
  /** Index of the saved entry, or -1 if it was discarded by a new edit. */
  savedIndex: number;
  labels: string[];
  key: string | undefined;
};

export function createHistory<T>(initial: T): History<T> {
  return {
    entries: [initial],
    labels: [""],
    index: 0,
    savedIndex: 0,
    key: undefined,
  };
}

export function current<T>(history: History<T>): T {
  return history.entries[history.index];
}

export function push<T>(
  history: History<T>,
  next: T,
  key?: string,
  label = "",
): History<T> {
  if (Object.is(next, current(history))) {
    return history;
  }
  const kept = history.entries.slice(0, history.index + 1);
  const labels = history.labels.slice(0, history.index + 1);
  const savedIndex =
    history.savedIndex <= history.index ? history.savedIndex : -1;
  if (key !== undefined && key === history.key) {
    kept[kept.length - 1] = next;
    labels[labels.length - 1] = label;
    return {
      entries: kept,
      labels,
      index: history.index,
      savedIndex: savedIndex === history.index ? -1 : savedIndex,
      key,
    };
  }
  return {
    entries: [...kept, next],
    labels: [...labels, label],
    index: history.index + 1,
    savedIndex,
    key,
  };
}

export function undo<T>(history: History<T>): History<T> {
  return history.index === 0
    ? history
    : { ...history, index: history.index - 1, key: undefined };
}

export function redo<T>(history: History<T>): History<T> {
  return history.index >= history.entries.length - 1
    ? history
    : { ...history, index: history.index + 1, key: undefined };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.index > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.index < history.entries.length - 1;
}

export function markSaved<T>(
  history: History<T>,
  index: number = history.index,
): History<T> {
  return { ...history, savedIndex: index, key: undefined };
}

export function isDirty<T>(history: History<T>): boolean {
  return history.index !== history.savedIndex;
}

export function undoLabel<T>(history: History<T>): string | undefined {
  return canUndo(history) ? history.labels[history.index] : undefined;
}

export function redoLabel<T>(history: History<T>): string | undefined {
  return canRedo(history) ? history.labels[history.index + 1] : undefined;
}
