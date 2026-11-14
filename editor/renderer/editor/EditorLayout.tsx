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
import { useImperativeHandle, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type PanelImperativeHandle,
} from "react-resizable-panels";

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

/** A tab of the panel along the bottom. */
export type BottomTab = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** Set when the content doesn't scroll itself, so the panel must. */
  scrolls?: boolean;
};

export type EditorLayoutHandle = {
  /** Opens the bottom panel on a tab. */
  showTab: (id: string) => void;
};

function TabBar({
  tabs,
  collapsed,
  onToggle,
  onExpand,
  toolbar,
}: {
  tabs: BottomTab[];
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
        gap: 8,
        paddingX: 8,
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

/**
 * The editor's panes: the tree, properties and map side by side, above a
 * collapsible panel of tabs. It arranges them and knows nothing of what they
 * hold.
 */
export function EditorLayout({
  ref,
  tree,
  properties,
  map,
  tabs,
  toolbar,
}: {
  ref?: Ref<EditorLayoutHandle>;
  tree: ReactNode;
  properties: ReactNode;
  map: ReactNode;
  tabs: BottomTab[];
  /** Shown at the right of the tab bar. */
  toolbar: ReactNode;
}) {
  const columns = useDefaultLayout({
    id: "editor.columns",
    storage: localStorage,
  });
  const rows = useDefaultLayout({ id: "editor.rows", storage: localStorage });
  const bottomPanel = useRef<PanelImperativeHandle>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState(tabs[0]?.id);

  const showTab = (id: string) => {
    setTab(id);
    bottomPanel.current?.expand();
  };
  useImperativeHandle(ref, () => ({ showTab }));

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
          className={style({ height: "full", overflow: "auto", padding: 16 })}
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
        panelRef={bottomPanel}
        collapsible
        collapsedSize={HEADER_PX}
        minSize={120}
        defaultSize={220}
        groupResizeBehavior="preserve-pixel-size"
        // The library scrolls a panel's whole contents by default; the tab
        // bar must stay put, and a collapsed panel must not scroll the tab
        // contents that overflow it.
        style={{ overflow: "hidden" }}
        onResize={() =>
          setCollapsed(bottomPanel.current?.isCollapsed() ?? true)
        }
      >
        <Tabs
          aria-label="Panels"
          density="compact"
          selectedKey={tab}
          onSelectionChange={(key) => showTab(String(key))}
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
            onExpand={() => bottomPanel.current?.expand()}
            onToggle={() =>
              collapsed
                ? bottomPanel.current?.expand()
                : bottomPanel.current?.collapse()
            }
          />
          {tabs.map((item) => (
            <TabPanel
              key={item.id}
              id={item.id}
              UNSAFE_style={{
                minHeight: 0,
                flexGrow: 1,
                overflow: item.scrolls ? "auto" : undefined,
              }}
            >
              {item.content}
            </TabPanel>
          ))}
        </Tabs>
      </Panel>
    </Group>
  );
}
