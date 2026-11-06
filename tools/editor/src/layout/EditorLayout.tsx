import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import type { Issue } from "../../../../scripts/lib/validate-config";
import { IssueBadges } from "../components/widgets";
import { ProblemsList } from "./ProblemsList";

const HEADER_PX = 40;

function Handle({ vertical }: { vertical?: boolean }) {
  return (
    <Separator
      className={
        "bg-slate-300 transition-colors hover:bg-blue-400 focus-visible:bg-blue-400 focus-visible:outline-none data-[separator=active]:bg-blue-500 " +
        (vertical ? "h-px" : "w-px")
      }
    />
  );
}

type Tab = "problems" | "build";

function TabBar({
  tabs,
  active,
  collapsed,
  onSelect,
  onToggle,
  toolbar,
}: {
  tabs: { id: Tab; label: ReactNode }[];
  active: Tab;
  collapsed: boolean;
  onSelect: (tab: Tab) => void;
  onToggle: () => void;
  toolbar: ReactNode;
}) {
  const Icon = collapsed ? ChevronUpIcon : ChevronDownIcon;
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b border-slate-300 bg-slate-50 px-3 text-slate-700 select-none"
      style={{ height: HEADER_PX }}
    >
      <button
        type="button"
        className="rounded p-1 hover:bg-slate-200"
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <Icon className="size-4" />
      </button>
      <div role="tablist" className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            className={
              "flex items-center gap-1 rounded px-2 py-1 " +
              (tab.id === active && !collapsed
                ? "bg-white shadow-sm"
                : "hover:bg-slate-200")
            }
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <span className="flex-1" />
      {toolbar}
    </div>
  );
}

export function EditorLayout({
  tree,
  properties,
  map,
  build,
  revealBuild,
  toolbar,
  issues,
  onSelectIssue,
}: {
  tree: ReactNode;
  properties: ReactNode;
  map: ReactNode;
  /** Absent when the editor can't build. */
  build?: ReactNode;
  /** Bump to expand the build panel. */
  revealBuild: number;
  /** Status text and build actions, shown at the right of the tab bar. */
  toolbar: ReactNode;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
}) {
  const columns = useDefaultLayout({
    id: "editor.columns",
    storage: localStorage,
  });
  const rows = useDefaultLayout({ id: "editor.rows", storage: localStorage });
  const buildPanel = useRef<PanelImperativeHandle>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>("problems");

  const [seenReveal, setSeenReveal] = useState(revealBuild);
  if (seenReveal !== revealBuild) {
    setSeenReveal(revealBuild);
    setTab("build");
  }

  useEffect(() => {
    if (revealBuild > 0) {
      buildPanel.current?.expand();
    }
  }, [revealBuild]);

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  const tabs: { id: Tab; label: ReactNode }[] = [
    {
      id: "problems",
      label: (
        <>
          Problems
          <IssueBadges errors={errors} warnings={warnings} />
        </>
      ),
    },
  ];
  if (build) {
    tabs.push({ id: "build", label: "Build" });
  }
  const selectTab = (next: Tab) => {
    if (next === tab && !collapsed) {
      buildPanel.current?.collapse();
      return;
    }
    setTab(next);
    buildPanel.current?.expand();
  };

  const top = (
    <Group
      orientation="horizontal"
      defaultLayout={columns.defaultLayout}
      onLayoutChanged={columns.onLayoutChanged}
    >
      <Panel
        id="tree"
        defaultSize={260}
        minSize={160}
        groupResizeBehavior="preserve-pixel-size"
      >
        <nav className="h-full" aria-label="Event structure">
          {tree}
        </nav>
      </Panel>
      <Handle />
      <Panel
        id="properties"
        defaultSize={440}
        minSize={200}
        groupResizeBehavior="preserve-pixel-size"
      >
        <section className="h-full overflow-auto p-3">{properties}</section>
      </Panel>
      <Handle />
      <Panel id="map" minSize={200}>
        <section className="h-full">{map}</section>
      </Panel>
    </Group>
  );

  return (
    <Group
      orientation="vertical"
      defaultLayout={rows.defaultLayout}
      onLayoutChanged={rows.onLayoutChanged}
    >
      <Panel id="top" minSize={200}>
        {top}
      </Panel>
      <Handle vertical />
      <Panel
        id="build"
        panelRef={buildPanel}
        collapsible
        collapsedSize={HEADER_PX}
        minSize={120}
        defaultSize={220}
        groupResizeBehavior="preserve-pixel-size"
        onResize={() => setCollapsed(buildPanel.current?.isCollapsed() ?? true)}
      >
        <div className="flex h-full flex-col">
          <TabBar
            tabs={tabs}
            active={tab}
            collapsed={collapsed}
            toolbar={toolbar}
            onSelect={selectTab}
            onToggle={() =>
              collapsed
                ? buildPanel.current?.expand()
                : buildPanel.current?.collapse()
            }
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab === "build" && build ? (
              build
            ) : (
              <ProblemsList issues={issues} onSelect={onSelectIssue} />
            )}
          </div>
        </div>
      </Panel>
    </Group>
  );
}
