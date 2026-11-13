import ArrowUpSend from "@react-spectrum/s2/icons/ArrowUpSend";
import ZoomFitToScreen from "@react-spectrum/s2/icons/ZoomFitToScreen";
import ZoomIn from "@react-spectrum/s2/icons/ZoomIn";
import ZoomOut from "@react-spectrum/s2/icons/ZoomOut";
import { ActionButton, ToggleButton } from "@react-spectrum/s2";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  findNode,
  selectableParent,
  type SvgTreeNode,
} from "../../shared/tree";
import type { Overlay } from "../../shared/schema";
import { assetPath } from "../../shared/schema";
import type { ParsedSvg } from "../svg/parse";

type View = { x: number; y: number; k: number };

const SHAPES = "path,rect,circle,ellipse,polygon,polyline";
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 60;
const DRAG_THRESHOLD = 4;

const attr = (id: string) => `[id="${id.replace(/["\\]/g, "\\$&")}"]`;

const shapesOf = (id: string) =>
  `${attr(id)}:is(${SHAPES}), ${attr(id)} :is(${SHAPES})`;

function buildStyle(rooms: Set<string>, selected?: string, hovered?: string) {
  const rules: string[] = [];
  if (rooms.size > 0) {
    rules.push(
      `${[...rooms].map(shapesOf).join(",")} { stroke: #2563eb !important; stroke-width: 2px !important; stroke-opacity: 1 !important; stroke-dasharray: 2 3 !important; vector-effect: non-scaling-stroke; }`,
    );
  }
  if (hovered && hovered !== selected) {
    rules.push(
      `${shapesOf(hovered)} { stroke: #60a5fa !important; stroke-width: 2px !important; stroke-opacity: 1 !important; stroke-dasharray: none !important; vector-effect: non-scaling-stroke; }`,
    );
  }
  if (selected) {
    rules.push(
      `${shapesOf(selected)} { stroke: #f97316 !important; stroke-width: 3px !important; stroke-opacity: 1 !important; stroke-dasharray: none !important; vector-effect: non-scaling-stroke; }`,
    );
  }
  rules.push(
    ".editor-hover, .editor-hover * { pointer-events: none; fill: #3b82f6 !important; fill-opacity: 0.25 !important; stroke: none !important; }",
    ".editor-selected, .editor-selected * { pointer-events: none; fill: #f97316 !important; fill-opacity: 0.4 !important; stroke: none !important; }",
  );
  return rules.join("\n");
}

function idAt(
  target: EventTarget | null,
  boundary: Element,
  ids: Set<string>,
): string | undefined {
  let el = target instanceof Element ? target : null;
  while (el && el !== boundary) {
    if (el.id && ids.has(el.id)) {
      return el.id;
    }
    el = el.parentElement;
  }
  return undefined;
}

function hitAt(
  event: { clientX: number; clientY: number },
  boundary: Element,
  ids: Set<string>,
): string | undefined {
  for (const el of document.elementsFromPoint(event.clientX, event.clientY)) {
    if (!boundary.contains(el)) {
      continue;
    }
    const found = idAt(el, boundary, ids);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function HudButton({
  label,
  title,
  onClick,
  isDisabled,
  children,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  isDisabled?: boolean;
  children: React.ReactNode;
}) {
  // A native title rather than a Spectrum Tooltip, which doesn't show on
  // disabled buttons.
  return (
    <span title={title ?? label} className={style({ display: "inline-flex" })}>
      <ActionButton
        aria-label={label}
        size="S"
        isDisabled={isDisabled}
        onPress={onClick}
      >
        {children}
      </ActionButton>
    </span>
  );
}

export function MapView({
  title,
  svg,
  tree,
  roomRefs,
  ids,
  selectedKey,
  overlays,
  onSelect,
}: {
  title: string;
  svg: ParsedSvg;
  tree: SvgTreeNode[];
  roomRefs: Set<string>;
  ids: Set<string>;
  selectedKey: string | undefined;
  overlays: Overlay[];
  onSelect: (id: string | undefined) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [hovered, setHovered] = useState<string>();
  const [shownOverlays, setShownOverlays] = useState<Set<string>>(new Set());
  const [panning, setPanning] = useState(false);
  const drag = useRef<{
    startX: number;
    startY: number;
    origin: View;
    moved: boolean;
  } | null>(null);
  const { width, height } = svg;

  const fit = useCallback(() => {
    const el = viewport.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const k = Math.min(rect.width / width, rect.height / height) * 0.95;
    setView({
      k,
      x: (rect.width - width * k) / 2,
      y: (rect.height - height * k) / 2,
    });
  }, [width, height]);

  useLayoutEffect(() => fit(), [fit]);

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      const ratio = k / v.k;
      return { k, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio };
    });
  }, []);

  // React registers wheel listeners as passive, so this can't be a prop.
  useEffect(() => {
    const el = viewport.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(
        Math.exp(-e.deltaY * 0.002),
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const zoomFromCentre = (factor: number) => {
    const rect = viewport.current!.getBoundingClientRect();
    zoomAt(factor, rect.width / 2, rect.height / 2);
  };

  const inner = useMemo(
    () => (
      <div
        ref={content}
        className={style({ size: "full" })}
        dangerouslySetInnerHTML={{ __html: svg.markup }}
      />
    ),
    [svg.markup],
  );

  // Drawn as copies on top of the map so the shape's own colours show through
  // the tint, instead of being replaced by it.
  useEffect(() => {
    const root = content.current?.querySelector("svg");
    if (!root) {
      return;
    }
    const added: Element[] = [];
    const highlight = (el: Element | null, className: string) => {
      const parent = el?.parentElement;
      if (!el || !(parent instanceof SVGGraphicsElement)) {
        return;
      }
      const rootMatrix = root.getScreenCTM();
      const parentMatrix = parent.getScreenCTM();
      if (!rootMatrix || !parentMatrix) {
        return;
      }
      const m = rootMatrix.inverse().multiply(parentMatrix);
      const copy = el.cloneNode(true) as Element;
      copy.removeAttribute("id");
      copy.querySelectorAll("[id]").forEach((d) => d.removeAttribute("id"));
      const wrapper = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      wrapper.setAttribute("class", className);
      wrapper.setAttribute(
        "transform",
        `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`,
      );
      wrapper.appendChild(copy);
      root.appendChild(wrapper);
      added.push(wrapper);
    };
    const byId = (id: string | undefined) =>
      id ? root.querySelector(attr(id)) : null;
    // Keys of nodes without an id are child-index paths from the root.
    const byPath = (path: string) =>
      path
        .split("/")
        .slice(1)
        .reduce<Element | null>(
          (el, i) => el?.children[Number(i)] ?? null,
          root,
        );
    const selected = selectedKey
      ? findNode(tree, selectedKey)?.node
      : undefined;
    if (hovered !== selected?.id) {
      highlight(byId(hovered), "editor-hover");
    }
    if (selected) {
      highlight(
        selected.id === null ? byPath(selected.key) : byId(selected.id),
        "editor-selected",
      );
    }
    return () => added.forEach((g) => g.remove());
  }, [svg.markup, tree, selectedKey, hovered]);
  const selectedId = selectedKey
    ? (findNode(tree, selectedKey)?.node.id ?? undefined)
    : undefined;
  const svgCss = useMemo(
    () => buildStyle(roomRefs, selectedId, hovered),
    [roomRefs, selectedId, hovered],
  );

  const parent = selectedId ? selectableParent(tree, selectedId) : undefined;

  return (
    <div
      ref={viewport}
      className={style({
        position: "relative",
        // Own stacking context: the controls' z-index stays inside the map
        // and can't rise above dialogs.
        isolation: "isolate",
        height: "full",
        touchAction: "none",
        overflow: "hidden",
        userSelect: "none",
        backgroundColor: "layer-1",
      })}
      style={{ cursor: panning ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        // The panel handles' hit areas reach into the map; they claim those
        // presses by preventing default.
        if (e.button !== 0 || e.defaultPrevented) {
          return;
        }
        drag.current = {
          startX: e.clientX,
          startY: e.clientY,
          origin: view,
          moved: false,
        };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d) {
          const dx = e.clientX - d.startX;
          const dy = e.clientY - d.startY;
          if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            d.moved = true;
            setPanning(true);
            e.currentTarget.setPointerCapture(e.pointerId);
            setHovered(undefined);
          }
          if (d.moved) {
            setView({ ...d.origin, x: d.origin.x + dx, y: d.origin.y + dy });
          }
          return;
        }
        // A button held without a press here is another drag (a panel
        // handle) passing over the map.
        setHovered(e.buttons ? undefined : hitAt(e, e.currentTarget, ids));
      }}
      onPointerLeave={() => setHovered(undefined)}
      onPointerCancel={() => {
        drag.current = null;
        setPanning(false);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        setPanning(false);
        if (!d || d.moved) {
          return;
        }
        const hit = hitAt(e, e.currentTarget, ids);
        if (hit && e.altKey) {
          onSelect(selectableParent(tree, hit) ?? hit);
        } else {
          onSelect(hit);
        }
      }}
    >
      <div
        className={style({
          pointerEvents: "none",
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 10,
          backgroundColor: "layer-2",
          borderRadius: "default",
          paddingX: 8,
          paddingY: 2,
          font: "ui-sm",
          color: "neutral-subdued",
        })}
      >
        {title}
      </div>

      <div
        className={style({ position: "absolute", top: 0, left: 0 })}
        style={{
          width,
          height,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          transformOrigin: "0 0",
        }}
      >
        <style>{svgCss}</style>
        {inner}
        {overlays
          .filter((o) => shownOverlays.has(o.src))
          .map((o) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={o.src}
              src={`/assets/${assetPath(o.src)}`}
              alt=""
              className={style({
                pointerEvents: "none",
                position: "absolute",
                inset: 0,
                size: "full",
              })}
            />
          ))}
      </div>

      {overlays.length > 0 && (
        <div
          className={style({
            position: "absolute",
            bottom: 8,
            left: 8,
            zIndex: 10,
            display: "flex",
            gap: 4,
          })}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {overlays.map((o) => {
            const on = shownOverlays.has(o.src);
            return (
              <ToggleButton
                key={o.src}
                size="S"
                isSelected={on}
                onChange={(selected) => {
                  const next = new Set(shownOverlays);
                  if (selected) {
                    next.add(o.src);
                  } else {
                    next.delete(o.src);
                  }
                  setShownOverlays(next);
                }}
              >
                {`Overlay: ${o.label || o.id}`}
              </ToggleButton>
            );
          })}
        </div>
      )}

      <div
        className={style({
          position: "absolute",
          right: 8,
          bottom: 8,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        })}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <HudButton label="Zoom in" onClick={() => zoomFromCentre(1.5)}>
          <ZoomIn />
        </HudButton>
        <HudButton label="Zoom out" onClick={() => zoomFromCentre(1 / 1.5)}>
          <ZoomOut />
        </HudButton>
        <HudButton label="Fit to view" onClick={fit}>
          <ZoomFitToScreen />
        </HudButton>
        <HudButton
          label="Select parent"
          title="Select parent group (Alt+click also does this)"
          isDisabled={parent === undefined}
          onClick={() => parent && onSelect(parent)}
        >
          <ArrowUpSend />
        </HudButton>
      </div>
    </div>
  );
}
