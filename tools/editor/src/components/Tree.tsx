import {
  ChevronDownIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  FolderIcon,
  MapIcon,
  MapPinIcon,
  PlusIcon,
  StopIcon,
} from "@heroicons/react/16/solid";
import { useEffect, useMemo, useRef, useState } from "react";
import { roomRef, type Config } from "../../shared/schema";
import {
  filterTree,
  findNode,
  walk,
  type SvgTreeNode,
} from "../../shared/tree";
import { defaultMapOf } from "../doc/ops";
import type { Issue } from "../../shared/validate";
import type { Selection } from "./Panels";

export type TreeData = Record<string, SvgTreeNode[] | "error" | undefined>;

const eventKey = "event";
const mapKey = (src: string) => `map:${src}`;
const nodeKey = (src: string, node: SvgTreeNode) => `${src}|${node.key}`;

function sameSelection(a: Selection, b: Selection): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === "map" && b.kind === "map") {
    return a.mapSrc === b.mapSrc;
  }
  if (a.kind === "node" && b.kind === "node") {
    return a.mapSrc === b.mapSrc && a.key === b.key;
  }
  return true;
}

function keysToReveal(selection: Selection, data: TreeData): string[] {
  if (selection.kind === "event" || selection.kind === "addMap") {
    return [eventKey];
  }
  const keys = [eventKey, mapKey(selection.mapSrc)];
  if (selection.kind === "node") {
    const tree = data[selection.mapSrc];
    const found = Array.isArray(tree)
      ? findNode(tree, selection.key)
      : undefined;
    for (const ancestor of found?.ancestors ?? []) {
      keys.push(nodeKey(selection.mapSrc, ancestor));
    }
  }
  return keys;
}

function Row({
  depth,
  selected,
  open,
  onToggle,
  onClick,
  leading,
  trailing,
  children,
  rowKey,
  parentKey,
  focusable,
  onFocusRow,
}: {
  depth: number;
  selected: boolean;
  open?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  rowKey: string;
  parentKey?: string;
  focusable: boolean;
  onFocusRow: (key: string) => void;
}) {
  return (
    <div
      role="treeitem"
      tabIndex={focusable ? 0 : -1}
      onFocus={(e) => {
        if (e.target === e.currentTarget) {
          onFocusRow(rowKey);
        }
      }}
      onClick={(e) => e.currentTarget.focus()}
      data-parent={parentKey}
      aria-selected={selected}
      aria-expanded={open}
      data-row={rowKey}
      className={
        "flex items-start gap-1 pr-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 " +
        (selected ? "bg-blue-100 " : "hover:bg-slate-100 ") +
        "text-slate-800"
      }
      style={{ paddingLeft: 4 + depth * 14 }}
    >
      {leading ? (
        <span className="mt-0.5 size-4 shrink-0">{leading}</span>
      ) : (
        <button
          type="button"
          tabIndex={-1}
          data-toggle
          aria-label={open ? "Collapse" : "Expand"}
          className={"mt-0.5 size-4 shrink-0 " + (onToggle ? "" : "invisible")}
          onClick={onToggle}
        >
          {open ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </button>
      )}
      <button
        type="button"
        tabIndex={-1}
        data-activate
        onClick={onClick}
        className="flex min-w-0 flex-1 items-start gap-1 py-0.5 text-left leading-4"
      >
        {children}
      </button>
      {trailing}
    </div>
  );
}

export function Tree({
  doc,
  data,
  changedSvgs,
  onReloadSvg,
  issues,
  selection,
  onSelect,
}: {
  doc: Config;
  issues: Issue[];
  data: TreeData;
  changedSvgs: Set<string>;
  onReloadSvg: (src: string) => void;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}) {
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(keysToReveal(selection, data)),
  );
  const [seen, setSeen] = useState(selection);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const container = useRef<HTMLDivElement>(null);
  const [focusKey, setFocusKey] = useState(eventKey);

  const fresh = doc.maps.filter(
    (m) => Array.isArray(data[m.src]) && !opened.has(m.src),
  );
  const selectionChanged = !sameSelection(seen, selection);
  if (fresh.length > 0 || selectionChanged) {
    const next = new Set(expanded);
    for (const map of fresh) {
      next.add(mapKey(map.src));
      walk(data[map.src] as SvgTreeNode[], (node) => {
        if (node.children.length > 0) {
          next.add(nodeKey(map.src, node));
        }
      });
    }
    if (selectionChanged) {
      keysToReveal(selection, data).forEach((key) => next.add(key));
      setSeen(selection);
    }
    if (fresh.length > 0) {
      setOpened(new Set([...opened, ...fresh.map((m) => m.src)]));
    }
    setExpanded(next);
  }

  const selectedKey =
    selection.kind === "event"
      ? eventKey
      : selection.kind === "addMap"
        ? "addMap"
        : selection.kind === "map"
          ? mapKey(selection.mapSrc)
          : `${selection.mapSrc}|${selection.key}`;

  useEffect(() => {
    const row = container.current?.querySelector(
      `[data-selected-id="${CSS.escape(selectedKey)}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const item = e.target as HTMLElement;
    if (item.getAttribute("role") !== "treeitem") {
      return;
    }
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'),
    );
    const index = items.indexOf(item);
    const expandedState = item.getAttribute("aria-expanded");
    const toggleButton = item.querySelector<HTMLElement>("[data-toggle]");
    const activateButton =
      item.querySelector<HTMLButtonElement>("[data-activate]");
    let target: HTMLElement | undefined;
    switch (e.key) {
      case "ArrowDown":
        target = items[index + 1];
        break;
      case "ArrowUp":
        target = items[index - 1];
        break;
      case "Home":
        target = items[0];
        break;
      case "End":
        target = items[items.length - 1];
        break;
      case "ArrowRight":
        if (expandedState === "false") {
          toggleButton?.click();
        } else if (expandedState === "true") {
          target = items[index + 1];
        }
        break;
      case "ArrowLeft": {
        if (expandedState === "true") {
          toggleButton?.click();
        } else {
          const parent = item.dataset.parent;
          target = parent
            ? (items.find((i) => i.dataset.row === parent) ?? undefined)
            : undefined;
        }
        break;
      }
      case "Enter":
      case " ":
        activateButton?.click();
        break;
      default:
        return;
    }
    e.preventDefault();
    target?.focus();
  };

  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (!next.delete(key)) {
      next.add(key);
    }
    setExpanded(next);
  };

  const rooms = useMemo(() => {
    const byMap: Record<string, Set<string>> = {};
    for (const map of doc.maps) {
      byMap[map.src] = new Set(map.rooms.flatMap((r) => roomRef(r) ?? []));
    }
    return byMap;
  }, [doc]);

  const invalidRooms = useMemo(() => {
    const byMap: Record<string, Set<string>> = {};
    for (const issue of issues) {
      if (
        issue.severity === "error" &&
        issue.mapSrc !== undefined &&
        issue.ref !== undefined
      ) {
        (byMap[issue.mapSrc] ??= new Set()).add(issue.ref);
      }
    }
    return byMap;
  }, [issues]);

  const defaultMap = defaultMapOf(doc);

  const labels = useMemo(() => {
    const byMap: Record<string, Map<string, string>> = {};
    for (const map of doc.maps) {
      byMap[map.src] = new Map(
        map.rooms.flatMap((r) => {
          const ref = roomRef(r);
          return ref === undefined ? [] : [[ref, r.label] as const];
        }),
      );
    }
    return byMap;
  }, [doc]);

  const renderNodes = (
    mapSrc: string,
    nodes: SvgTreeNode[],
    depth: number,
    parentKey: string,
  ): React.ReactNode =>
    nodes.map((node) => {
      const key = nodeKey(mapSrc, node);
      const isRoom = node.id !== null && rooms[mapSrc].has(node.id);
      const invalid =
        isRoom && node.id !== null && !!invalidRooms[mapSrc]?.has(node.id);
      const open = expanded.has(key);
      const hasChildren = node.children.length > 0;
      const selected =
        selection.kind === "node" &&
        selection.mapSrc === mapSrc &&
        selection.key === node.key;
      return (
        <div key={key}>
          <div data-selected-id={key}>
            <Row
              rowKey={key}
              parentKey={parentKey}
              focusable={focusKey === key}
              onFocusRow={setFocusKey}
              depth={depth}
              selected={selected}
              open={hasChildren ? open : undefined}
              onToggle={hasChildren ? () => toggle(key) : undefined}
              onClick={() => onSelect({ kind: "node", mapSrc, key: node.key })}
            >
              {invalid ? (
                <ExclamationCircleIcon
                  className="size-4 shrink-0 text-red-600"
                  aria-label="Has errors"
                />
              ) : isRoom ? (
                <MapPinIcon className="size-4 shrink-0 text-blue-600" />
              ) : node.isGroup ? (
                <FolderIcon className="size-4 shrink-0 text-slate-400" />
              ) : (
                <StopIcon className="size-4 shrink-0 text-slate-400" />
              )}
              <span className="flex min-w-0 flex-col">
                <span className={"truncate " + (invalid ? "text-red-700" : "")}>
                  {(node.id !== null &&
                    isRoom &&
                    labels[mapSrc].get(node.id)) || (
                    <span className="text-slate-400 italic">
                      {isRoom
                        ? "No label"
                        : node.id === null
                          ? "Unassignable"
                          : "Unassigned"}
                    </span>
                  )}
                </span>
                <span className="truncate font-mono text-xs text-slate-500">
                  {node.id ?? "(no id)"}
                </span>
              </span>
            </Row>
          </div>
          {hasChildren &&
            open &&
            renderNodes(mapSrc, node.children, depth + 1, key)}
        </div>
      );
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-slate-200 p-1">
        <button
          type="button"
          aria-pressed={showUnassigned}
          title="Show shapes that aren't assigned to a room"
          aria-label="Show unassigned"
          className={
            "flex rounded border p-1.5 " +
            (showUnassigned
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 text-slate-700 hover:bg-slate-100")
          }
          onClick={() => {
            setShowUnassigned(!showUnassigned);
            // The focused row may be filtered out, which would leave the
            // tree without a tab stop.
            setFocusKey(eventKey);
          }}
        >
          <Squares2X2Icon className="size-4" />
        </button>
      </div>
      <div
        ref={container}
        role="tree"
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 overflow-auto py-1"
      >
        <div data-selected-id={eventKey}>
          <Row
            rowKey={eventKey}
            focusable={focusKey === eventKey}
            onFocusRow={setFocusKey}
            depth={0}
            selected={selection.kind === "event"}
            open={expanded.has(eventKey)}
            onToggle={() => toggle(eventKey)}
            onClick={() => onSelect({ kind: "event" })}
          >
            <span className="truncate font-semibold">
              {doc.eventName || "(unnamed event)"}
            </span>
            <span className="text-xs text-slate-400">event</span>
          </Row>
        </div>
        {expanded.has(eventKey) && (
          <>
            {doc.maps.map((map) => {
              const key = mapKey(map.src);
              const data_ = data[map.src];
              const tree = Array.isArray(data_) ? data_ : undefined;
              const open = expanded.has(key);
              const refs = rooms[map.src];
              const shown = tree
                ? filterTree(tree, (n) =>
                    showUnassigned
                      ? n.id !== null
                      : n.id !== null && refs.has(n.id),
                  )
                : tree;
              return (
                <div key={key}>
                  <div data-selected-id={key}>
                    <Row
                      rowKey={key}
                      parentKey={eventKey}
                      focusable={focusKey === key}
                      onFocusRow={setFocusKey}
                      depth={1}
                      selected={
                        selection.kind === "map" && selection.mapSrc === map.src
                      }
                      open={open}
                      onToggle={() => toggle(key)}
                      onClick={() => onSelect({ kind: "map", mapSrc: map.src })}
                      trailing={
                        changedSvgs.has(map.src) && (
                          <button
                            type="button"
                            title="The SVG changed on disk. Reload it."
                            onClick={() => onReloadSvg(map.src)}
                            className="my-0.5 shrink-0 rounded-full bg-amber-100 px-2 text-xs leading-4 text-amber-800 hover:bg-amber-200"
                          >
                            Reload
                          </button>
                        )
                      }
                    >
                      <MapIcon className="size-4 shrink-0 text-slate-500" />
                      <span className="truncate font-semibold">
                        {map.label || map.id || map.src}
                      </span>
                      <span className="text-xs text-slate-400">
                        {map === defaultMap ? "map · default" : "map"}
                      </span>
                    </Row>
                  </div>
                  {open && data_ === undefined && (
                    <p className="py-1 pl-10 text-xs text-slate-400">
                      Loading...
                    </p>
                  )}
                  {open && data_ === "error" && (
                    <p className="py-1 pl-10 text-xs text-red-700">
                      Could not read this SVG.
                    </p>
                  )}
                  {open && shown && renderNodes(map.src, shown, 2, key)}
                  {open && shown && shown.length === 0 && (
                    <p className="py-1 pl-10 text-xs text-slate-400 italic">
                      {showUnassigned ? "No shapes with ids" : "No rooms"}
                    </p>
                  )}
                </div>
              );
            })}
            <div data-selected-id="addMap">
              <Row
                rowKey="addMap"
                parentKey={eventKey}
                focusable={focusKey === "addMap"}
                onFocusRow={setFocusKey}
                depth={1}
                selected={selection.kind === "addMap"}
                onClick={() => onSelect({ kind: "addMap" })}
                leading={<PlusIcon className="size-4" />}
              >
                <span className="text-slate-600 italic">Add map...</span>
              </Row>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
