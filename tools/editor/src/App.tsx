import {
  AlertDialog,
  Content,
  DialogContainer,
  Heading,
  InlineAlert,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  LoadResponse,
  SaveResponse,
  SessionResponse,
} from "../shared/api";
import type { MenuAction } from "../shared/native";
import { BuildLog, BuildToolbar } from "./build/BuildPanel";
import { useBuild } from "./build/useBuild";
import { runMenuAction } from "./native";
import { StartScreen } from "./StartScreen";
import { roomRef, type Config } from "../shared/schema";
import {
  selectableIds,
  sortRoomsByTree,
  type SvgTreeNode,
} from "../shared/tree";
import {
  validateConfig,
  type Issue,
} from "../../../scripts/lib/validate-config";
import {
  AddMapPanel,
  EventPanel,
  MapPanel,
  NodePanel,
  type Selection,
} from "./components/Panels";
import { MapView } from "./components/MapView";
import { EditorLayout } from "./layout/EditorLayout";
import { Tree, type TreeData } from "./components/Tree";
import {
  Button,
  CommitProvider,
  Loading,
  mutedText,
} from "./components/widgets";
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
  type History,
} from "./doc/history";
import { findRoom, removeRoom, type Edit } from "./doc/ops";
import type { FieldContext } from "./fields/registry";
import { useSvgs } from "./svg/useSvgs";
import { findNode } from "../shared/tree";

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

type Loaded = {
  eventDir: string;
  config: Config;
  mtime: number;
  assets: string[];
  locales: string[];
};

type LoadState =
  | { status: "loading" }
  | { status: "failed"; errors: string[] }
  | ({ status: "ready" } & Loaded);

async function load(): Promise<LoadState> {
  try {
    const [configRes, assetsRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/assets"),
    ]);
    const body = (await configRes.json()) as LoadResponse;
    if (body.config === null) {
      return { status: "failed", errors: body.errors };
    }
    return {
      status: "ready",
      eventDir: body.eventDir,
      config: body.config,
      mtime: body.mtime,
      assets: (await assetsRes.json()) as string[],
      locales: body.locales,
    };
  } catch (e) {
    return {
      status: "failed",
      errors: [`Could not reach the editor server: ${(e as Error).message}`],
    };
  }
}

async function loadSession(): Promise<SessionResponse> {
  return (await (await fetch("/api/session")).json()) as SessionResponse;
}

export function App() {
  const [session, setSession] = useState<SessionResponse>();
  const [failure, setFailure] = useState("");
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => {
    loadSession().then(
      (next) => {
        setSession(next);
        setGeneration((g) => g + 1);
      },
      (e: Error) => setFailure(e.message),
    );
  }, []);
  useEffect(refresh, [refresh]);

  if (failure) {
    return (
      <div className={style({ padding: 16 })}>
        <InlineAlert variant="negative">
          <Heading>Could not reach the editor server</Heading>
          <Content>{failure}</Content>
        </InlineAlert>
      </div>
    );
  }
  if (!session) {
    return <Loading />;
  }
  if (!session.event) {
    return <StartScreen session={session} onChanged={refresh} />;
  }
  return (
    <EventLoader
      key={generation}
      canBuild={session.canBuild}
      onSwitched={refresh}
    />
  );
}

function EventLoader({
  canBuild,
  onSwitched,
}: {
  canBuild: boolean;
  onSwitched: () => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (!cancelled) {
        setState(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [generation]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setGeneration((g) => g + 1);
  }, []);

  if (state.status === "loading") {
    return <Loading />;
  }
  if (state.status === "failed") {
    return (
      <div className={style({ marginX: "auto", maxWidth: 672, padding: 24 })}>
        <InlineAlert variant="negative">
          <Heading>The editor can&apos;t open this event</Heading>
          <Content>
            <ul
              className={style({
                margin: 0,
                paddingStart: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              })}
            >
              {state.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Content>
        </InlineAlert>
        <div className={style({ marginTop: 16 })}>
          <Button onClick={reload}>Try again</Button>
        </div>
      </div>
    );
  }
  return (
    <Editor
      key={generation}
      loaded={state}
      canBuild={canBuild}
      onReload={reload}
      onSwitched={onSwitched}
    />
  );
}

function Editor({
  loaded,
  canBuild,
  onReload,
  onSwitched,
}: {
  loaded: Loaded;
  canBuild: boolean;
  onReload: () => void;
  onSwitched: () => void;
}) {
  const [history, dispatch] = useReducer(reducer, loaded.config, createHistory);
  const doc = current(history);
  const dirty = isDirty(history);

  const [selection, setSelection] = useState<Selection>({ kind: "event" });
  const [activeMapSrc, setActiveMapSrc] = useState(doc.maps[0]?.src);
  const [status, setStatus] = useState("");
  const [conflict, setConflict] = useState(false);
  const [saveTick, setSaveTick] = useState(0);
  const [assets, setAssets] = useState(loaded.assets);
  const [revealBuild, setRevealBuild] = useState(0);
  const build = useBuild(canBuild);
  const { start: buildStart, preview: buildPreview } = build;

  const {
    svgs,
    changed: changedSvgs,
    reload: reloadSvg,
  } = useSvgs(doc.maps.map((m) => m.src));
  const trees = useMemo(() => {
    const byMap: Record<string, SvgTreeNode[] | undefined> = {};
    for (const [src, svg] of Object.entries(svgs)) {
      byMap[src] = svg && svg !== "error" ? svg.tree : undefined;
    }
    return byMap;
  }, [svgs]);
  const treeData: TreeData = useMemo(() => {
    const data: TreeData = {};
    for (const [src, svg] of Object.entries(svgs)) {
      data[src] = svg === "error" ? "error" : svg?.tree;
    }
    return data;
  }, [svgs]);

  const issues = useMemo(() => validateConfig(doc, trees), [doc, trees]);
  const errors = useMemo(
    () => issues.filter((i) => i.severity === "error"),
    [issues],
  );

  // Saves are triggered by bumping a counter so they run after the render that
  // holds the edit, and read the latest state through refs.
  const requestSave = useCallback(
    () => setSaveTick((t) => t + 1),
    [setSaveTick],
  );

  const apply = useCallback(
    (edit: Edit, key?: string) => {
      setStatus("");
      dispatch({ type: "edit", edit, key });
      // Keyed edits are field typing; they save when the field blurs.
      if (key === undefined) {
        requestSave();
      }
    },
    [setStatus, dispatch, requestSave],
  );

  const ctx: FieldContext = useMemo(() => {
    const aliases = new Set<string>();
    const labels = new Set<string>();
    for (const map of doc.maps) {
      for (const room of map.rooms) {
        room.aliases?.forEach((a) => aliases.add(a));
        if (room.label) {
          labels.add(room.label);
        }
      }
    }
    return {
      assets,
      locales: loaded.locales,
      aliasSuggestions: [...aliases, ...(doc.filters ?? [])].sort(),
      filterSuggestions: [...aliases, ...labels].sort(),
    };
  }, [doc, assets, loaded.locales]);

  const activeMap = doc.maps.find((m) => m.src === activeMapSrc) ?? doc.maps[0];
  const effective: Selection =
    (selection.kind === "map" || selection.kind === "node") &&
    !doc.maps.some((m) => m.src === selection.mapSrc)
      ? { kind: "event" }
      : selection;

  const select = useCallback(
    (next: Selection) => {
      setSelection(next);
      if (next.kind === "map" || next.kind === "node") {
        setActiveMapSrc(next.mapSrc);
      }
    },
    [setSelection, setActiveMapSrc],
  );

  const latest = useRef({ doc, trees, errors, index: history.index });
  useEffect(() => {
    latest.current = { doc, trees, errors, index: history.index };
  });
  const mtimeRef = useRef(loaded.mtime);
  const savedDocRef = useRef(loaded.config);
  const conflictRef = useRef(false);
  // Saves run one at a time so a slow response can't overwrite a newer save.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  const save = useCallback(
    (force = false): Promise<boolean> => {
      const run = async (): Promise<boolean> => {
        const { doc, trees, index } = latest.current;
        if (conflictRef.current && !force) {
          return false;
        }
        if (!force && doc === savedDocRef.current) {
          return true;
        }
        setStatus("Saving...");
        try {
          const res = await fetch("/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              config: {
                ...doc,
                maps: doc.maps.map((map) => ({
                  ...map,
                  rooms: sortRoomsByTree(map.rooms, trees[map.src]),
                })),
              },
              mtime: mtimeRef.current,
              force,
            }),
          });
          const body = (await res.json()) as SaveResponse;
          if (body.ok) {
            mtimeRef.current = body.mtime;
            savedDocRef.current = doc;
            dispatch({ type: "saved", index });
            setStatus("");
            return true;
          } else if (body.reason === "conflict") {
            conflictRef.current = true;
            setConflict(true);
            setStatus("");
          }
        } catch (e) {
          setStatus(`Not saved: ${(e as Error).message}`);
        }
        return false;
      };
      const next = queue.current.then(run, run);
      queue.current = next;
      return next;
    },
    [setStatus, setConflict, dispatch],
  );

  useEffect(() => {
    if (saveTick > 0) {
      void save();
    }
  }, [saveTick, save]);

  const overwrite = useCallback(() => {
    conflictRef.current = false;
    setConflict(false);
    void save(true);
  }, [save, setConflict]);

  const refuseInvalid = useCallback(
    (count: number): boolean => {
      if (count === 0) {
        return false;
      }
      setStatus(`Fix ${count} ${count === 1 ? "error" : "errors"} first`);
      return true;
    },
    [setStatus],
  );

  const startBuild = useCallback(async () => {
    if (!(await save()) || refuseInvalid(latest.current.errors.length)) {
      return;
    }
    setRevealBuild((n) => n + 1);
    const result = await buildStart();
    if ("reason" in result) {
      refuseInvalid(result.errors.length);
    }
  }, [save, buildStart, setRevealBuild, refuseInvalid]);

  const startPreview = useCallback(async () => {
    if (!(await save()) || refuseInvalid(latest.current.errors.length)) {
      return;
    }
    setStatus("Starting the preview...");
    const result = await buildPreview();
    if (result.ok) {
      setStatus("Preview opened in your browser");
    } else if (result.reason === "invalid") {
      refuseInvalid(result.errors.length);
    } else if (result.reason === "failed") {
      setStatus("");
      window.alert(`The preview couldn't start.\n\n${result.error}`);
    }
  }, [save, buildPreview, setStatus, refuseInvalid]);

  useEffect(() => {
    const native = window.concarte;
    if (!native) {
      return;
    }
    return native.onMenu(async (action: MenuAction) => {
      if (!(await save())) {
        if (conflictRef.current) {
          return;
        }
        if (
          latest.current.doc !== savedDocRef.current &&
          !window.confirm("Discard your unsaved changes?")
        ) {
          return;
        }
      }
      const result = await runMenuAction(action);
      if (result.ok) {
        onSwitched();
      } else if (!result.cancelled) {
        setStatus(result.message);
      }
    });
  }, [save, onSwitched]);

  useEffect(() => {
    return window.concarte?.onEdit((action) => {
      dispatch({ type: action });
      requestSave();
    });
  }, [requestSave]);

  useEffect(() => {
    window.concarte?.setEditState({
      undo: canUndo(history) ? (undoLabel(history) ?? "") : null,
      redo: canRedo(history) ? (redoLabel(history) ?? "") : null,
    });
  }, [history]);

  useEffect(() => {
    return () => window.concarte?.setEditState({ undo: null, redo: null });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        return;
      }
      const key = e.key.toLowerCase();
      // The markdown editor has its own undo history.
      if (key === "z" && !(e.target as Element).closest?.(".cm-editor")) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
        requestSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestSave]);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const jumpTo = (issue: Issue) => {
    if (issue.mapSrc && issue.ref) {
      select({ kind: "node", mapSrc: issue.mapSrc, key: issue.ref });
    } else if (issue.mapSrc) {
      select({ kind: "map", mapSrc: issue.mapSrc });
    }
  };

  const renderPanel = () => {
    const common = { doc, apply, ctx };
    if (effective.kind === "event") {
      return <EventPanel {...common} />;
    }
    if (effective.kind === "addMap") {
      return (
        <AddMapPanel
          {...common}
          onAdded={(mapSrc) => select({ kind: "map", mapSrc })}
          onAssetAdded={(asset) =>
            setAssets((prev) =>
              prev.includes(asset) ? prev : [...prev, asset].sort(),
            )
          }
        />
      );
    }
    const map = doc.maps.find((m) => m.src === effective.mapSrc)!;
    const mapIssues = issues.filter((i) => i.mapSrc === map.src);
    if (effective.kind === "map") {
      return (
        <MapPanel
          {...common}
          map={map}
          issues={mapIssues.filter((i) => i.ref === undefined)}
          onRemoved={() => select({ kind: "event" })}
        />
      );
    }
    const tree = trees[map.src];
    const node = tree ? findNode(tree, effective.key)?.node : undefined;
    if (!tree) {
      return (
        <p className={mutedText}>
          The SVG for map &quot;{map.label || map.id}&quot; ({map.src}) is still
          loading or could not be read, so its elements can&apos;t be shown.
        </p>
      );
    }
    if (!node) {
      const room = findRoom(doc, map.src, effective.key);
      return (
        <div
          className={
            style({ display: "flex", flexDirection: "column", gap: 12 }) +
            " " +
            mutedText
          }
        >
          <p>
            {room
              ? `Room "${room.label || room.id}" refers to an element with id "${effective.key}", but ${map.src} has no such element. It may have been renamed or removed from the SVG.`
              : `${map.src} has no element with id "${effective.key}".`}
          </p>
          {room && (
            <Button
              danger
              onClick={() => {
                apply(removeRoom(map.src, effective.key));
                select({ kind: "map", mapSrc: map.src });
              }}
            >
              Remove room
            </Button>
          )}
        </div>
      );
    }
    return (
      <NodePanel
        key={`${map.src}|${effective.key}`}
        {...common}
        map={map}
        node={node}
        issues={mapIssues}
      />
    );
  };

  const activeSvg = activeMap ? svgs[activeMap.src] : undefined;
  const selectedKey =
    effective.kind === "node" && effective.mapSrc === activeMap?.src
      ? effective.key
      : undefined;

  return (
    <div
      className={style({
        height: "full",
        backgroundColor: "base",
        color: "neutral",
      })}
      onBlur={requestSave}
      onClick={(e) => {
        // Buttons can remove the focused element without a blur event.
        if ((e.target as Element).closest("button")) {
          requestSave();
        }
      }}
    >
      <CommitProvider value={requestSave}>
        <main className={style({ height: "full", minHeight: 0 })}>
          <EditorLayout
            revealBuild={revealBuild}
            toolbar={
              <>
                <span
                  className={style({ marginEnd: 8 }) + " " + mutedText}
                  role="status"
                >
                  {status}
                </span>
                {canBuild && (
                  <BuildToolbar
                    state={build.state}
                    noMaps={doc.maps.length === 0}
                    onBuild={() => void startBuild()}
                    onCancel={() => void build.cancel()}
                    onPreview={() => void startPreview()}
                    onReveal={() => void build.reveal()}
                  />
                )}
              </>
            }
            issues={issues}
            onSelectIssue={jumpTo}
            tree={
              <Tree
                doc={doc}
                data={treeData}
                changedSvgs={changedSvgs}
                onReloadSvg={reloadSvg}
                issues={issues}
                selection={effective}
                onSelect={select}
              />
            }
            properties={renderPanel()}
            map={
              activeMap && activeSvg && activeSvg !== "error" ? (
                <MapView
                  key={activeMap.src}
                  title={activeMap.label || activeMap.id}
                  svg={activeSvg}
                  tree={activeSvg.tree}
                  roomRefs={
                    new Set(activeMap.rooms.flatMap((r) => roomRef(r) ?? []))
                  }
                  ids={selectableIds(activeSvg.tree)}
                  selectedKey={selectedKey}
                  overlays={activeMap.overlays ?? []}
                  onSelect={(id) =>
                    select(
                      id
                        ? { kind: "node", mapSrc: activeMap.src, key: id }
                        : { kind: "map", mapSrc: activeMap.src },
                    )
                  }
                />
              ) : (
                <p className={style({ padding: 16 }) + " " + mutedText}>
                  {!activeMap
                    ? "This event has no maps yet. Add a map to see it here."
                    : activeSvg === "error"
                      ? "Could not read this SVG."
                      : "Loading map..."}
                </p>
              )
            }
            build={canBuild ? <BuildLog state={build.state} /> : undefined}
          />
        </main>
      </CommitProvider>

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
            Something else has written {loaded.eventDir}/concarte.json since the
            editor loaded it. Overwriting loses those changes; reloading loses
            yours.
          </AlertDialog>
        )}
      </DialogContainer>
    </div>
  );
}
