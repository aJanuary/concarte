import {
  ActionButton,
  ActionButtonGroup,
  IconContext,
  Text,
  Menu,
  MenuItem,
  MenuTrigger,
  ToggleButton,
  Tooltip,
  TooltipTrigger,
  TreeView,
  TreeViewItem,
  TreeViewItemContent,
  type Key,
} from "@react-spectrum/s2";
import Filter from "@react-spectrum/s2/icons/Filter";
import Folder from "@react-spectrum/s2/icons/Folder";
import ImageIcon from "@react-spectrum/s2/icons/Image";
import Refresh from "@react-spectrum/s2/icons/Refresh";
import Settings from "@react-spectrum/s2/icons/Settings";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Issue } from "@concarte/core";
import type { Room } from "../../../shared/schema";
import { defaultMapOf } from "../../document/ops";
import { filterTree, findNode, walk, type SvgTreeNode } from "../../svg/tree";
import type { Svgs } from "../../svg/useSvgs";
import { ActionsMenu } from "../../ui/ActionsMenu";
import { RoomPin, UnassignedPin } from "../../ui/icons";
import { countIssues, SeverityIcon } from "../../ui/IssueCounts";
import { plural } from "../../ui/text";
import { mapActions, roomActions } from "../actions";
import { isOnMap, sameSelection, type Selection } from "../selection";
import { useSession } from "../session";
import { AddMapButton } from "./AddMapButton";

const mapKey = (src: string) => `map:${src}`;
const nodeKey = (src: string, key: string) => `${src}|${key}`;
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

function keysToReveal(selection: Selection, trees: Svgs["trees"]): string[] {
  if (!isOnMap(selection)) {
    return [];
  }
  const keys = [mapKey(selection.mapSrc)];
  if (selection.kind === "node") {
    const tree = trees[selection.mapSrc];
    const found = tree ? findNode(tree, selection.key) : undefined;
    for (const ancestor of found?.ancestors ?? []) {
      keys.push(nodeKey(selection.mapSrc, ancestor.key));
    }
  }
  return keys;
}

function selectionKey(selection: Selection): string | undefined {
  switch (selection.kind) {
    case "event":
      return undefined;
    case "map":
      return mapKey(selection.mapSrc);
    case "node":
      return nodeKey(selection.mapSrc, selection.key);
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

function IssueIcons({ issues }: { issues: Issue[] }) {
  const counts = countIssues(issues);
  // In the row's actions area so long labels can't truncate them. TreeView
  // puts every icon in the row's leading icon slot; an empty context keeps
  // these here.
  return (
    <span className={issueIconsStyle}>
      <IconContext.Provider value={{}}>
        {(["error", "warning"] as const).map(
          (severity) =>
            counts[severity] > 0 && (
              <span
                key={severity}
                className={style({ display: "inline-flex" })}
              >
                <SeverityIcon
                  severity={severity}
                  size="S"
                  label={plural(counts[severity], severity)}
                />
              </span>
            ),
        )}
      </IconContext.Provider>
    </span>
  );
}

/** The event's maps and the shapes of each, for selecting and assigning. */
export function Tree() {
  const {
    doc,
    svgs: loadedSvgs,
    issues,
    selection,
    select,
    apply,
  } = useSession();
  const { svgs, trees, changed: changedSvgs, reload: reloadSvg } = loadedSvgs;
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [expanded, setExpanded] = useState<Set<Key>>(
    () => new Set(keysToReveal(selection, trees)),
  );
  const [seen, setSeen] = useState(selection);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);

  // A map starts fully expanded once its SVG loads, and the selection's
  // ancestors are expanded whenever it changes.
  const fresh = doc.maps.filter((m) => trees[m.src] && !opened.has(m.src));
  const selectionChanged = !sameSelection(seen, selection);
  if (fresh.length > 0 || selectionChanged) {
    const next = new Set(expanded);
    for (const map of fresh) {
      next.add(mapKey(map.src));
      walk(trees[map.src]!, (node) => {
        if (node.children.length > 0) {
          next.add(nodeKey(map.src, node.key));
        }
      });
    }
    if (selectionChanged) {
      keysToReveal(selection, trees).forEach((key) => next.add(key));
      setSeen(selection);
    }
    if (fresh.length > 0) {
      setOpened(new Set([...opened, ...fresh.map((m) => m.src)]));
    }
    setExpanded(next);
  }

  /** Each map's rooms, by their shape. */
  const rooms = useMemo(() => {
    const byMap: Record<string, Map<string, Room>> = {};
    for (const map of doc.maps) {
      byMap[map.src] = new Map(map.rooms.map((r) => [r.shape, r] as const));
    }
    return byMap;
  }, [doc]);

  const roomIssues = useMemo(() => {
    const byRoom = new Map<string, Issue[]>();
    for (const issue of issues) {
      if (issue.mapSrc !== undefined && issue.shape !== undefined) {
        const key = nodeKey(issue.mapSrc, issue.shape);
        byRoom.set(key, [...(byRoom.get(key) ?? []), issue]);
      }
    }
    return byRoom;
  }, [issues]);

  // Issues on the map itself, such as its fields or its overlays, which name
  // no room.
  const mapIssues = useMemo(() => {
    const byMap = new Map<string, Issue[]>();
    for (const issue of issues) {
      if (issue.mapSrc !== undefined && issue.shape === undefined) {
        byMap.set(issue.mapSrc, [...(byMap.get(issue.mapSrc) ?? []), issue]);
      }
    }
    return byMap;
  }, [issues]);

  const defaultMap = defaultMapOf(doc);

  // Filled while rendering: which selection each row stands for, and the
  // order of the rows currently shown (for scrolling to the selection).
  const selections = new Map<Key, Selection>();
  const visible: Key[] = [];
  const statusKeys: Key[] = [];

  const renderNodes = (
    mapSrc: string,
    nodes: SvgTreeNode[],
    shown: boolean,
  ): ReactNode =>
    nodes.map((node) => {
      const key = nodeKey(mapSrc, node.key);
      selections.set(key, { kind: "node", mapSrc, key: node.key });
      if (shown) {
        visible.push(key);
      }
      const room = node.id === null ? undefined : rooms[mapSrc].get(node.id);
      const text = room?.label || node.id || "(no id)";
      const rowIssues = room && roomIssues.get(key);
      return (
        <TreeViewItem
          key={key}
          id={key}
          textValue={text}
          hasChildItems={node.children.length > 0}
        >
          <TreeViewItemContent>
            {room ? <RoomPin /> : node.isGroup ? <Folder /> : <UnassignedPin />}
            {/* The icon says whether it's a room; the text is its label
                when it has one, otherwise just its id. */}
            <RowText
              label={text}
              placeholder={node.id === null}
              subdued={!room}
              detail={room?.label ? `(${node.id})` : undefined}
            />
            {rowIssues && <IssueIcons issues={rowIssues} />}
            {room && (
              <ActionsMenu
                label="Room actions"
                actions={roomActions(apply, mapSrc, node.id!, room)}
              />
            )}
          </TreeViewItemContent>
          {renderNodes(mapSrc, node.children, shown && expanded.has(key))}
        </TreeViewItem>
      );
    });

  const mapItems = doc.maps.map((map) => {
    const key = mapKey(map.src);
    selections.set(key, { kind: "map", mapSrc: map.src });
    visible.push(key);
    const childrenShown = expanded.has(key);
    const svg = svgs[map.src];
    const tree = trees[map.src];
    const roomsByShape = rooms[map.src];
    const ownIssues = mapIssues.get(map.src);
    const shown = tree
      ? filterTree(tree, (n) =>
          showUnassigned
            ? n.id !== null
            : n.id !== null && roomsByShape.has(n.id),
        )
      : undefined;
    const status =
      svg === undefined
        ? "Loading..."
        : svg === "error"
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
          {ownIssues && <IssueIcons issues={ownIssues} />}
          {changedSvgs.has(map.src) && (
            <ActionButtonGroup>
              <TooltipTrigger>
                <ActionButton
                  isQuiet
                  aria-label="Reload SVG"
                  onPress={() => reloadSvg(map.src)}
                >
                  <Refresh />
                </ActionButton>
                <Tooltip>The SVG changed on disk. Reload it.</Tooltip>
              </TooltipTrigger>
            </ActionButtonGroup>
          )}
          <ActionsMenu
            label="Map actions"
            actions={mapActions(doc, apply, map)}
          />
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
          padding: 8,
          borderWidth: 0,
          borderBottomWidth: 1,
          borderStyle: "solid",
          borderColor: "gray-200",
        })}
      >
        {/* The event's own settings: the tree holds only its maps. */}
        <ToggleButton
          isQuiet
          size="S"
          isSelected={selection.kind === "event"}
          onChange={() => select({ kind: "event" })}
          styles={style({ flexShrink: 1, minWidth: 0 })}
        >
          <Settings />
          <Text>
            <span style={doc.eventName ? undefined : { fontStyle: "italic" }}>
              {doc.eventName || "(unnamed event)"}
            </span>
          </Text>
        </ToggleButton>
        <AddMapButton />
        <MenuTrigger>
          <ActionButton
            aria-label="Filter"
            isQuiet
            size="S"
            styles={style({ flexShrink: 0 })}
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
          aria-label="Maps"
          selectionMode="single"
          selectionStyle="highlight"
          disallowEmptySelection
          selectedKeys={selectedKey === undefined ? [] : [selectedKey]}
          onSelectionChange={(keys) => {
            const key = keys === "all" ? undefined : [...keys][0];
            const next = key === undefined ? undefined : selections.get(key);
            if (next) {
              select(next);
            }
          }}
          expandedKeys={expanded}
          onExpandedChange={setExpanded}
          disabledKeys={statusKeys}
          styles={style({ height: "full" })}
        >
          {mapItems}
        </TreeView>
      </div>
    </div>
  );
}
