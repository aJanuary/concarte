import { createContext, useContext } from "react";
import type { Issue } from "@concarte/core";
import type { PageMessages } from "../../shared/api";
import type { Config, MapConfig } from "../../shared/schema";
import type { Apply } from "../document/ops";
import type { Svgs } from "../svg/useSvgs";
import type { Selection } from "./selection";

/**
 * The event being edited, as the editor's panes see it. They all show the
 * same document and selection, so they read it from here rather than each
 * being handed its share.
 */
export type EditorSession = {
  /** Where the event is, for showing to the user. */
  eventDir: string;
  doc: Config;
  /** Applies an edit to the document, and saves it. */
  apply: Apply;
  /** The SVGs of the document's maps. */
  svgs: Svgs;
  /** The problems with the document, as the build would find them. */
  issues: Issue[];
  /** Locales the site has translations for. */
  locales: string[];
  /** The site's default page title and description for each locale. */
  pageMessages: PageMessages;
  /** Always on a map the document still has. */
  selection: Selection;
  select: (selection: Selection) => void;
  /** The map shown in the map pane: the one last selected on. */
  activeMap: MapConfig | undefined;
};

const SessionContext = createContext<EditorSession | null>(null);

export const SessionProvider = SessionContext.Provider;

export function useSession(): EditorSession {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used inside the editor");
  }
  return session;
}
