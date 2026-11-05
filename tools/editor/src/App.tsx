import {
  ArrowDownTrayIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { LoadResponse, SaveResponse } from "../shared/api";
import { roomRef, type Config } from "../shared/schema";
import {
  selectableIds,
  sortRoomsByTree,
  type SvgTreeNode,
} from "../shared/tree";
import { validateConfig, type Issue } from "../shared/validate";
import {
  AddMapPanel,
  EventPanel,
  MapPanel,
  NodePanel,
  type Selection,
} from "./components/Panels";
import { MapView } from "./components/MapView";
import { Splitter, useStoredWidth } from "./components/Splitter";
import { Tree, type TreeData } from "./components/Tree";
import { Button } from "./components/widgets";
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
import { timeAgo } from "./time";
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

export function App() {
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
    return <p className="p-4 text-slate-500">Loading...</p>;
  }
  if (state.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-lg font-semibold text-red-700">
          The editor can&apos;t open this event
        </h1>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {state.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
        <div className="mt-4">
          <Button onClick={reload}>Try again</Button>
        </div>
      </div>
    );
  }
  return <Editor key={generation} loaded={state} onReload={reload} />;
}

function Editor({
  loaded,
  onReload,
}: {
  loaded: Loaded;
  onReload: () => void;
}) {
  const [history, dispatch] = useReducer(reducer, loaded.config, createHistory);
  const doc = current(history);
  const dirty = isDirty(history);

  const [selection, setSelection] = useState<Selection>({ kind: "event" });
  const [activeMapSrc, setActiveMapSrc] = useState(doc.maps[0]?.src);
  const [mtime, setMtime] = useState(loaded.mtime);
  const [status, setStatus] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [showProblems, setShowProblems] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [treeWidth, setTreeWidth] = useStoredWidth("editor.treeWidth", 260);
  const [panelWidth, setPanelWidth] = useStoredWidth("editor.panelWidth", 440);

  const svgs = useSvgs(doc.maps.map((m) => m.src));
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
  const warnings = useMemo(
    () => issues.filter((i) => i.severity === "warning"),
    [issues],
  );

  const apply = useCallback(
    (edit: Edit, key?: string) => {
      setStatus("");
      dispatch({ type: "edit", edit, key });
    },
    [setStatus, dispatch],
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
      assets: loaded.assets,
      locales: loaded.locales,
      aliasSuggestions: [...aliases, ...(doc.filters ?? [])].sort(),
      filterSuggestions: [...aliases, ...labels].sort(),
    };
  }, [doc, loaded.assets, loaded.locales]);

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

  const save = useCallback(
    async (force = false) => {
      if (errors.length > 0) {
        setShowProblems(true);
        setStatus("Fix the errors before saving");
        return;
      }
      const index = history.index;
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
            mtime,
            force,
          }),
        });
        const body = (await res.json()) as SaveResponse;
        if (body.ok) {
          setMtime(body.mtime);
          dispatch({ type: "saved", index });
          setStatus("");
          setNow(Date.now());
        } else if (body.reason === "conflict") {
          setConflict(true);
          setStatus("");
        } else {
          setStatus(`Not saved: ${body.errors.join("; ")}`);
        }
      } catch (e) {
        setStatus(`Not saved: ${(e as Error).message}`);
      }
    },
    [
      doc,
      trees,
      errors,
      history.index,
      mtime,
      setStatus,
      setShowProblems,
      setMtime,
      setConflict,
      setNow,
      dispatch,
    ],
  );

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void saveRef.current();
        return;
      }
      // The markdown editor has its own undo history.
      if (key === "z" && !(e.target as Element).closest?.(".cm-editor")) {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

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
    setShowProblems(false);
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
        <p className="text-slate-500">
          The SVG for map &quot;{map.label || map.id}&quot; ({map.src}) is still
          loading or could not be read, so its elements can&apos;t be shown.
        </p>
      );
    }
    if (!node) {
      const room = findRoom(doc, map.src, effective.key);
      return (
        <div className="space-y-3 text-slate-500">
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

  const iconButton =
    "relative rounded p-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="grid h-full grid-rows-[40px_1fr] bg-white text-slate-900">
      <header className="flex items-center gap-1 border-b border-slate-300 px-2">
        <button
          type="button"
          className={iconButton}
          title={
            undoLabel(history)
              ? `Undo ${undoLabel(history)} (Ctrl+Z)`
              : "Undo (Ctrl+Z)"
          }
          aria-label="Undo"
          disabled={!canUndo(history)}
          onClick={() => dispatch({ type: "undo" })}
        >
          <ArrowUturnLeftIcon className="size-5" />
        </button>
        <button
          type="button"
          className={iconButton}
          title={
            redoLabel(history)
              ? `Redo ${redoLabel(history)} (Ctrl+Shift+Z)`
              : "Redo (Ctrl+Shift+Z)"
          }
          aria-label="Redo"
          disabled={!canRedo(history)}
          onClick={() => dispatch({ type: "redo" })}
        >
          <ArrowUturnRightIcon className="size-5" />
        </button>
        <button
          type="button"
          className={iconButton + " ml-3"}
          title={dirty ? "Save (Ctrl+S), unsaved changes" : "Save (Ctrl+S)"}
          aria-label="Save"
          onClick={() => void save()}
        >
          <ArrowDownTrayIcon className="size-5" />
          {dirty && (
            <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full border border-white bg-amber-500" />
          )}
        </button>
        <span className="text-slate-500" role="status">
          {status || `Last saved ${timeAgo(now, mtime)}`}
        </span>
        <div className="relative ml-2">
          {issues.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100"
              aria-expanded={showProblems}
              onClick={() => setShowProblems(!showProblems)}
            >
              <ExclamationTriangleIcon
                className={
                  "size-4 " +
                  (errors.length ? "text-red-600" : "text-amber-500")
                }
              />
              {errors.length > 0 && (
                <span className="text-red-700">
                  {errors.length} error{errors.length === 1 ? "" : "s"}
                </span>
              )}
              {warnings.length > 0 && (
                <span className="text-amber-700">
                  {warnings.length} warning{warnings.length === 1 ? "" : "s"}
                </span>
              )}
            </button>
          )}
          {showProblems && (
            <ul className="absolute top-full left-0 z-20 mt-1 max-h-96 w-[28rem] overflow-auto rounded border border-slate-300 bg-white shadow-lg">
              {issues.map((issue, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-100"
                    onClick={() => jumpTo(issue)}
                  >
                    <span
                      className={
                        issue.severity === "error"
                          ? "text-red-700"
                          : "text-amber-700"
                      }
                    >
                      {issue.severity === "error" ? "Error" : "Warning"}:
                    </span>{" "}
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <span className="flex-1" />
        <strong>Editor</strong>
        <span className="text-slate-500">{loaded.eventDir}</span>
      </header>

      <main
        className="grid min-h-0"
        style={{
          gridTemplateColumns: `${treeWidth}px ${panelWidth}px minmax(0, 1fr)`,
        }}
      >
        <nav
          className="relative min-h-0 border-r border-slate-300"
          aria-label="Event structure"
        >
          <Tree
            doc={doc}
            data={treeData}
            issues={issues}
            selection={effective}
            onSelect={select}
          />
          <Splitter
            label="Resize structure panel"
            width={treeWidth}
            otherWidth={panelWidth}
            onChange={setTreeWidth}
          />
        </nav>
        <div className="relative min-h-0 border-r border-slate-300">
          <section className="h-full overflow-auto p-3">
            {renderPanel()}
          </section>
          <Splitter
            label="Resize properties panel"
            width={panelWidth}
            otherWidth={treeWidth}
            onChange={setPanelWidth}
          />
        </div>
        <section className="min-h-0">
          {activeMap && activeSvg && activeSvg !== "error" ? (
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
            <p className="p-4 text-slate-500">
              {activeSvg === "error"
                ? "Could not read this SVG."
                : "Loading map..."}
            </p>
          )}
        </section>
      </main>

      {conflict && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div
            role="alertdialog"
            aria-labelledby="conflict-title"
            className="max-w-md rounded bg-white p-4 shadow-xl"
          >
            <h2 id="conflict-title" className="text-base font-semibold">
              The config changed on disk
            </h2>
            <p className="mt-2">
              Something else has written {loaded.eventDir}/config.ts since the
              editor loaded it. Overwriting loses those changes; reloading loses
              yours.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button onClick={() => setConflict(false)}>Cancel</Button>
              <Button danger onClick={onReload}>
                Reload and discard my changes
              </Button>
              <Button
                danger
                onClick={() => {
                  setConflict(false);
                  void save(true);
                }}
              >
                Overwrite
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
