import { createContext, useContext } from "react";

/**
 * Saves edits now rather than when focus leaves the field. Fields that change
 * in discrete steps (a pick, a toggle, adding a tag) call it after each
 * change, so nothing is lost if the app closes while they still have focus.
 */
const CommitContext = createContext<() => void>(() => {});
export const CommitProvider = CommitContext.Provider;
export function useCommit() {
  return useContext(CommitContext);
}
