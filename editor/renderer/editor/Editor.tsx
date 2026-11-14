import { AlertDialog, DialogContainer } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useRef, useState } from "react";
import { CONFIG_FILE } from "../../shared/schema";
import type { LoadedEvent } from "../platform/bridge";
import { IssueCounts } from "../ui/IssueCounts";
import { mutedText } from "../ui/styles";
import { BuildLog, BuildToolbar } from "./build/BuildPanel";
import { useBuildCommands } from "./build/useBuildCommands";
import {
  EditorLayout,
  type BottomTab,
  type EditorLayoutHandle,
} from "./EditorLayout";
import { MapPane } from "./map/MapPane";
import { ProblemsList } from "./problems/ProblemsList";
import { CommitProvider } from "./properties/commit";
import { SelectionPanel } from "./properties/SelectionPanel";
import { selectionForIssue } from "./selection";
import { SessionProvider } from "./session";
import { Tree } from "./tree/Tree";
import { useEditorSession } from "./useEditorSession";
import { useEventSwitching } from "./useEventSwitching";
import { useUndoRedoCommands } from "./useUndoRedoCommands";
import { useUnsavedGuard } from "./useUnsavedGuard";

/** The editing screen for one open event. */
export function Editor({
  loaded,
  onReload,
  onSwitched,
}: {
  loaded: LoadedEvent;
  /** Reads the event from disk again, discarding unsaved edits. */
  onReload: () => void;
  /** After another event has been opened in place of this one. */
  onSwitched: () => void;
}) {
  const [status, setStatus] = useState("");
  const layout = useRef<EditorLayoutHandle>(null);
  const {
    session,
    history,
    dirty,
    step,
    save,
    requestSave,
    conflict,
    overwrite,
  } = useEditorSession(loaded, setStatus);
  const { doc, issues, select } = session;

  useUndoRedoCommands(history, step);
  useEventSwitching({ save, setStatus, onSwitched });
  useUnsavedGuard(dirty);
  const build = useBuildCommands({
    save,
    setStatus,
    onStarted: () => layout.current?.showTab("build"),
  });

  const tabs: BottomTab[] = [
    {
      id: "problems",
      label: (
        <>
          Problems
          <IssueCounts issues={issues} />
        </>
      ),
      content: (
        <ProblemsList
          issues={issues}
          onSelect={(issue) => {
            const selection = selectionForIssue(issue);
            if (selection) {
              select(selection);
            }
          }}
        />
      ),
      scrolls: true,
    },
    {
      id: "build",
      label: "Build",
      content: <BuildLog state={build.state} />,
    },
  ];

  return (
    <div
      className={style({
        height: "full",
        backgroundColor: "base",
        color: "neutral",
      })}
      // Typing saves when focus leaves the field.
      onBlur={requestSave}
      onClick={(e) => {
        // Buttons can remove the focused element without a blur event.
        if ((e.target as Element).closest("button")) {
          requestSave();
        }
      }}
    >
      <SessionProvider value={session}>
        <CommitProvider value={requestSave}>
          <main className={style({ height: "full", minHeight: 0 })}>
            <EditorLayout
              ref={layout}
              tree={<Tree />}
              properties={<SelectionPanel />}
              map={<MapPane />}
              tabs={tabs}
              toolbar={
                <>
                  <span className={mutedText} role="status">
                    {status}
                  </span>
                  <BuildToolbar
                    state={build.state}
                    noMaps={doc.maps.length === 0}
                    onBuild={() => void build.build()}
                    onCancel={() => void build.cancel()}
                    onPreview={() => void build.preview()}
                    onReveal={() => void build.revealDist()}
                  />
                </>
              }
            />
          </main>
        </CommitProvider>
      </SessionProvider>

      <DialogContainer onDismiss={() => {}}>
        {conflict && (
          <AlertDialog
            title="The config changed on disk"
            variant="destructive"
            primaryActionLabel="Overwrite"
            secondaryActionLabel="Reload from disk"
            onPrimaryAction={overwrite}
            onSecondaryAction={onReload}
          >
            Something else has written {session.eventDir}/{CONFIG_FILE} since
            the editor loaded it. Overwriting loses those changes; reloading
            loses yours.
          </AlertDialog>
        )}
      </DialogContainer>
    </div>
  );
}
