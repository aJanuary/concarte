import ChevronDown from "@react-spectrum/s2/icons/ChevronDown";
import ChevronUp from "@react-spectrum/s2/icons/ChevronUp";
import {
  ActionButton,
  Tab as S2Tab,
  TabList,
  TabPanel,
  Tabs,
} from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
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
import { IssueCounts } from "../components/widgets";
import { ProblemsList } from "./ProblemsList";

const HEADER_PX = 40;

const handleColor = {
  default: "gray-300",
  ":hover": "blue-700",
  ":focus-visible": "blue-700",
  ":is([data-separator=active])": "blue-800",
} as const;
const columnHandle = style({
  width: "[1px]",
  backgroundColor: handleColor,
  outlineStyle: "none",
  transition: "default",
});
const rowHandle = style({
  height: "[1px]",
  backgroundColor: handleColor,
  outlineStyle: "none",
  transition: "default",
});

function Handle({ vertical }: { vertical?: boolean }) {
  return <Separator className={vertical ? rowHandle : columnHandle} />;
}

type Tab = "problems" | "build";

function TabBar({
  tabs,
  collapsed,
  onToggle,
  onExpand,
  toolbar,
}: {
  tabs: { id: Tab; label: ReactNode }[];
  collapsed: boolean;
  onToggle: () => void;
  onExpand: () => void;
  toolbar: ReactNode;
}) {
  const Icon = collapsed ? ChevronUp : ChevronDown;
  return (
    <div
      className={style({
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        gap: 4,
        paddingX: 12,
        backgroundColor: "layer-1",
        borderWidth: 0,
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: "gray-200",
        userSelect: "none",
      })}
      style={{ height: HEADER_PX }}
    >
      <ActionButton
        isQuiet
        size="S"
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        aria-expanded={!collapsed}
        onPress={onToggle}
      >
        <Icon />
      </ActionButton>
      {/* Tabs only report a change of tab, and clicking the current tab
          should still open a collapsed panel. */}
      <div onClickCapture={() => collapsed && onExpand()}>
        <TabList aria-label="Panels">
          {tabs.map((tab) => (
            <S2Tab key={tab.id} id={tab.id}>
              {tab.label}
            </S2Tab>
          ))}
        </TabList>
      </div>
      <span className={style({ flexGrow: 1 })} />
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
          <IssueCounts errors={errors} warnings={warnings} />
        </>
      ),
    },
  ];
  if (build) {
    tabs.push({ id: "build", label: "Build" });
  }
  const selectTab = (next: Tab) => {
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
        <nav className={style({ height: "full" })} aria-label="Event structure">
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
        <section
          className={style({ height: "full", overflow: "auto", padding: 12 })}
        >
          {properties}
        </section>
      </Panel>
      <Handle />
      <Panel id="map" minSize={200}>
        <section className={style({ height: "full" })}>{map}</section>
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
        <Tabs
          aria-label="Panels"
          density="compact"
          selectedKey={tab}
          onSelectionChange={(key) => selectTab(key as Tab)}
          UNSAFE_style={{
            display: "flex",
            height: "100%",
            flexDirection: "column",
          }}
        >
          <TabBar
            tabs={tabs}
            collapsed={collapsed}
            toolbar={toolbar}
            onExpand={() => buildPanel.current?.expand()}
            onToggle={() =>
              collapsed
                ? buildPanel.current?.expand()
                : buildPanel.current?.collapse()
            }
          />
          <TabPanel id="problems" UNSAFE_style={{ minHeight: 0, flexGrow: 1 }}>
            <ProblemsList issues={issues} onSelect={onSelectIssue} />
          </TabPanel>
          {build && (
            <TabPanel id="build" UNSAFE_style={{ minHeight: 0, flexGrow: 1 }}>
              {build}
            </TabPanel>
          )}
        </Tabs>
      </Panel>
    </Group>
  );
}
