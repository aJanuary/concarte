import {
  ActionButton,
  ActionButtonGroup,
  createIcon,
  IconContext,
  Text,
  Menu,
  MenuItem,
  MenuTrigger,
  Tooltip,
  TooltipTrigger,
  TreeView,
  TreeViewItem,
  TreeViewItemContent,
  type Key,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import AlertDiamond from "@react-spectrum/s2/icons/AlertDiamond";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import Filter from "@react-spectrum/s2/icons/Filter";
import Folder from "@react-spectrum/s2/icons/Folder";
import ImageIcon from "@react-spectrum/s2/icons/Image";
import Refresh from "@react-spectrum/s2/icons/Refresh";
import {
  iconStyle,
  style,
} from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { roomRef, type Config } from "../../shared/schema";
import {
  filterTree,
  findNode,
  walk,
  type SvgTreeNode,
} from "../../shared/tree";
import { defaultMapOf } from "../doc/ops";
import type { Issue } from "../../../../scripts/lib/validate-config";
import type { Selection } from "./Panels";

// Room pins, drawn from Spectrum's Location icon. Both are kept here rather
// than using Spectrum's own outline so the pair stays matched if the
// library's pin changes.
const PIN_OUTLINE =
  "M10.005 18.583H10c-.557-.001-1.071-.248-1.413-.679C6.688 15.514 3.5 10.98 3.5 7.49c0-3.446 2.916-6.25 6.5-6.25s6.5 2.804 6.5 6.25c0 3.55-3.186 8.052-5.084 10.421-.342.427-.856.672-1.411.672";

/** A room: the pin filled, with its centre dot cut out. */
const RoomPin = createIcon((props) => (
  <svg viewBox="0 0 20 20" {...props}>
    <path
      fill="var(--iconPrimary, currentColor)"
      fillRule="evenodd"
      d={`${PIN_OUTLINE}ZM10 5.49a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z`}
    />
  </svg>
));

/** A shape not yet assigned to a room: the pin's outline. */
const UnassignedPin = createIcon((props) => (
  <svg viewBox="0 0 20 20" {...props}>
    <g fill="var(--iconPrimary, currentColor)">
      <path d="M10 9.99c-1.379 0-2.5-1.12-2.5-2.5s1.121-2.5 2.5-2.5 2.5 1.121 2.5 2.5-1.121 2.5-2.5 2.5m0-3.5c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1" />
      <path
        d={`${PIN_OUTLINE}M10 2.74c-2.757 0-5 2.131-5 4.75 0 3.148 3.331 7.68 4.763 9.482.08.1.195.111.24.111h.002c.046 0 .161-.01.24-.11C11.675 15.19 15 10.698 15 7.49c0-2.619-2.243-4.75-5-4.75`}
      />
    </g>
  </svg>
));

type IssueCounts = { errors: number; warnings: number };

export type TreeData = Record<string, SvgTreeNode[] | "error" | undefined>;

const eventKey = "event";
const mapKey = (src: string) => `map:${src}`;
const nodeKey = (src: string, node: SvgTreeNode) => `${src}|${node.key}`;
const statusKey = (src: string) => `status:${src}`;

// TreeView's fixed row height at the default (medium) scale.
const ROW_PX = 40;

// TreeView draws row text in the subdued colour, so labels are raised to the
// full-strength colour to set ids and placeholders apart.
const labelStyle = style({ color: "neutral" });
const detailStyle = style({ color: "neutral-subdued", marginStart: 8 });
const issueIconsStyle = style({
  gridArea: "actions",
  display: "flex",
  alignItems: "center",
  gap: 4,
  marginEnd: 8,
});
const subduedStyle = style({ color: "neutral-subdued" });

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

function selectionKey(selection: Selection): string | undefined {
  switch (selection.kind) {
    case "event":
      return eventKey;
    case "addMap":
      return undefined;
    case "map":
      return mapKey(selection.mapSrc);
    case "node":
      return `${selection.mapSrc}|${selection.key}`;
  }
}

/** The row's single line: a label, then subdued detail such as the id. */
function RowText({
  label,
  placeholder,
  subdued,
  detail,
}: {
  label: ReactNode;
  placeholder?: boolean;
  subdued?: boolean;
  detail?: string;
}) {
  return (
    <Text>
      <span
        className={placeholder || subdued ? subduedStyle : labelStyle}
        // style() has no font-style property.
        style={placeholder ? { fontStyle: "italic" } : undefined}
      >
        {label}
      </span>
      {detail && <span className={detailStyle}>{detail}</span>}
    </Text>
  );
}

function IssueIcons({ counts }: { counts: IssueCounts }) {
  // In the row's actions area so long labels can't truncate them. TreeView
  // puts every icon in the row's leading icon slot; an empty context keeps
  // these here.
  return (
    <span className={issueIconsStyle}>
      <IconContext.Provider value={{}}>
        {counts.errors > 0 && (
          <span className={style({ display: "inline-flex" })}>
            <AlertDiamond
              aria-label={`${counts.errors} error${counts.errors === 1 ? "" : "s"}`}
              styles={iconStyle({ size: "S", color: "negative" })}
            />
          </span>
        )}
        {counts.warnings > 0 && (
          <span className={style({ display: "inline-flex" })}>
            <AlertTriangle
              aria-label={`${counts.warnings} warning${counts.warnings === 1 ? "" : "s"}`}
              styles={iconStyle({ size: "S", color: "notice" })}
            />
          </span>
        )}
      </IconContext.Provider>
    </span>
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
  const [expanded, setExpanded] = useState<Set<Key>>(
    () => new Set(keysToReveal(selection, data)),
  );
  const [seen, setSeen] = useState(selection);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);

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

  const rooms = useMemo(() => {
    const byMap: Record<string, Set<string>> = {};
    for (const map of doc.maps) {
      byMap[map.src] = new Set(map.rooms.flatMap((r) => roomRef(r) ?? []));
    }
    return byMap;
  }, [doc]);

  const roomIssues = useMemo(() => {
    const byMap: Record<string, Map<string, IssueCounts>> = {};
    for (const issue of issues) {
      if (issue.mapSrc === undefined || issue.ref === undefined) {
        continue;
      }
      const counts = (byMap[issue.mapSrc] ??= new Map()).get(issue.ref) ?? {
        errors: 0,
        warnings: 0,
      };
      counts[issue.severity === "error" ? "errors" : "warnings"] += 1;
      byMap[issue.mapSrc].set(issue.ref, counts);
    }
    return byMap;
  }, [issues]);

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

  const defaultMap = defaultMapOf(doc);

  // Filled while rendering: which selection each row stands for, and the
  // order of the rows currently shown (for scrolling to the selection).
  const selections = new Map<Key, Selection>([[eventKey, { kind: "event" }]]);
  const visible: Key[] = [eventKey];
  const statusKeys: Key[] = [];

  const renderNodes = (
    mapSrc: string,
    nodes: SvgTreeNode[],
    shown: boolean,
  ): ReactNode =>
    nodes.map((node) => {
      const key = nodeKey(mapSrc, node);
      selections.set(key, { kind: "node", mapSrc, key: node.key });
      if (shown) {
        visible.push(key);
      }
      const isRoom = node.id !== null && rooms[mapSrc].has(node.id);
      const label = isRoom && node.id !== null && labels[mapSrc].get(node.id);
      const counts =
        isRoom && node.id !== null
          ? roomIssues[mapSrc]?.get(node.id)
          : undefined;
      return (
        <TreeViewItem
          key={key}
          id={key}
          textValue={label || node.id || "(no id)"}
          hasChildItems={node.children.length > 0}
        >
          <TreeViewItemContent>
            {isRoom ? (
              <RoomPin />
            ) : node.isGroup ? (
              <Folder />
            ) : (
              <UnassignedPin />
            )}
            {/* The icon says whether it's a room; the text is its label
                when it has one, otherwise just its id. */}
            <RowText
              label={label || node.id || "(no id)"}
              placeholder={node.id === null}
              subdued={!isRoom}
              detail={label ? `(${node.id})` : undefined}
            />
            {counts && <IssueIcons counts={counts} />}
          </TreeViewItemContent>
          {renderNodes(mapSrc, node.children, shown && expanded.has(key))}
        </TreeViewItem>
      );
    });

  const mapItems = doc.maps.map((map) => {
    const key = mapKey(map.src);
    selections.set(key, { kind: "map", mapSrc: map.src });
    const mapShown = expanded.has(eventKey);
    if (mapShown) {
      visible.push(key);
    }
    const childrenShown = mapShown && expanded.has(key);
    const data_ = data[map.src];
    const tree = Array.isArray(data_) ? data_ : undefined;
    const refs = rooms[map.src];
    const shown = tree
      ? filterTree(tree, (n) =>
          showUnassigned ? n.id !== null : n.id !== null && refs.has(n.id),
        )
      : undefined;
    const status =
      data_ === undefined
        ? "Loading..."
        : data_ === "error"
          ? "Could not read this SVG."
          : shown?.length === 0
            ? showUnassigned
              ? "No shapes with ids"
              : "No rooms"
            : undefined;
    if (status) {
      statusKeys.push(statusKey(map.src));
      if (childrenShown) {
        visible.push(statusKey(map.src));
      }
    }
    return (
      <TreeViewItem
        key={key}
        id={key}
        textValue={map.label || map.id || map.src}
        hasChildItems
      >
        <TreeViewItemContent>
          <ImageIcon />
          <RowText
            label={map.label || map.id || map.src}
            detail={map === defaultMap ? "map · default" : "map"}
          />
          {changedSvgs.has(map.src) && (
            <ActionButtonGroup>
              <TooltipTrigger>
                <ActionButton
                  isQuiet
                  aria-label="Reload SVG"
                  onPress={() => onReloadSvg(map.src)}
                >
                  <Refresh />
                </ActionButton>
                <Tooltip>The SVG changed on disk. Reload it.</Tooltip>
              </TooltipTrigger>
            </ActionButtonGroup>
          )}
        </TreeViewItemContent>
        {status && (
          <TreeViewItem id={statusKey(map.src)} textValue={status}>
            <TreeViewItemContent>
              <RowText label={status} placeholder />
            </TreeViewItemContent>
          </TreeViewItem>
        )}
        {shown && renderNodes(map.src, shown, childrenShown)}
      </TreeViewItem>
    );
  });

  const selectedKey = selectionKey(selection);
  const selectedIndex =
    selectedKey === undefined ? -1 : visible.indexOf(selectedKey);

  // The tree only renders the rows on screen, so the selected row may not
  // exist yet to scroll into view; work out where it sits instead.
  useEffect(() => {
    const el =
      scroller.current?.querySelector<HTMLElement>('[role="treegrid"]');
    if (!el || selectedIndex < 0) {
      return;
    }
    const top = selectedIndex * ROW_PX;
    if (top < el.scrollTop) {
      el.scrollTop = top;
    } else if (top + ROW_PX > el.scrollTop + el.clientHeight) {
      el.scrollTop = top + ROW_PX - el.clientHeight;
    }
  }, [selectedIndex]);

  return (
    <div
      className={style({
        display: "flex",
        height: "full",
        flexDirection: "column",
      })}
    >
      <div
        className={style({
          display: "flex",
          gap: 4,
          padding: 4,
          borderWidth: 0,
          borderBottomWidth: 1,
          borderStyle: "solid",
          borderColor: "gray-200",
        })}
      >
        <ActionButton
          isQuiet
          size="S"
          onPress={() => onSelect({ kind: "addMap" })}
        >
          <Add />
          <Text>Add map</Text>
        </ActionButton>
        <MenuTrigger>
          <ActionButton
            aria-label="Filter"
            isQuiet
            size="S"
            styles={style({ marginStart: "auto" })}
          >
            <Filter />
          </ActionButton>
          <Menu
            aria-label="Shapes to show"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[showUnassigned ? "all" : "rooms"]}
            onSelectionChange={(keys) => {
              if (keys !== "all") {
                setShowUnassigned(keys.has("all"));
              }
            }}
          >
            <MenuItem id="all">All shapes</MenuItem>
            <MenuItem id="rooms">Rooms only</MenuItem>
          </Menu>
        </MenuTrigger>
      </div>
      <div ref={scroller} className={style({ minHeight: 0, flexGrow: 1 })}>
        <TreeView
          aria-label="Event structure"
          selectionMode="single"
          selectionStyle="highlight"
          disallowEmptySelection
          selectedKeys={selectedKey === undefined ? [] : [selectedKey]}
          onSelectionChange={(keys) => {
            const key = keys === "all" ? undefined : [...keys][0];
            const next = key === undefined ? undefined : selections.get(key);
            if (next) {
              onSelect(next);
            }
          }}
          expandedKeys={expanded}
          onExpandedChange={setExpanded}
          disabledKeys={statusKeys}
          styles={style({ height: "full" })}
        >
          <TreeViewItem
            id={eventKey}
            textValue={doc.eventName || "(unnamed event)"}
            hasChildItems
          >
            <TreeViewItemContent>
              <RowText
                label={doc.eventName || "(unnamed event)"}
                placeholder={!doc.eventName}
                detail="event"
              />
            </TreeViewItemContent>
            {mapItems}
          </TreeViewItem>
        </TreeView>
      </div>
    </div>
  );
}
