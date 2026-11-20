import { DOMParser } from "linkedom";
import type { Config, Ring } from "@concarte/core";

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;
const ASPECT = PREVIEW_WIDTH / PREVIEW_HEIGHT;

/** How much of the preview a whole map fills, leaving a margin. */
const MAP_FILL = 0.9;
/** How much of the preview a room fills, leaving its surroundings to show. */
const ROOM_FILL = 0.6;
/**
 * The narrowest a room's preview gets, as a share of the map's longer side,
 * so a booth still shows enough around it to be found.
 */
const MIN_ROOM_FRAME = 1 / 6;
/** In preview pixels, as the site outlines a selected room on screen. */
const OUTLINE_WIDTH = 4;

/** A rectangle in a map's SVG user units. */
export type Box = { x: number; y: number; width: number; height: number };

/**
 * The smallest box of the preview's shape, centred on `box`, in which `box`
 * fills `fill` of the width or height, and at least `minWidth` wide.
 */
function frameAround(box: Box, fill: number, minWidth = 0): Box {
  const width = Math.max(
    box.width / fill,
    (box.height / fill) * ASPECT,
    minWidth,
  );
  const height = width / ASPECT;
  return {
    x: box.x + box.width / 2 - width / 2,
    y: box.y + box.height / 2 - height / 2,
    width,
    height,
  };
}

/** The part of a map its preview shows: all of it, with a margin. */
export function mapFrame(map: Box): Box {
  return frameAround(map, MAP_FILL);
}

/**
 * Moves a span of `size` starting at `start` to lie within the map's span,
 * or centres it on the map's span when it is the larger.
 */
function slide(
  start: number,
  size: number,
  mapStart: number,
  mapSize: number,
): number {
  if (size >= mapSize) {
    return mapStart + (mapSize - size) / 2;
  }
  return Math.min(Math.max(start, mapStart), mapStart + mapSize - size);
}

/**
 * The part of a map a room's preview shows: the room and its surroundings,
 * kept within the map so a room by its edge doesn't leave half the preview
 * empty, and never more than the map's own preview.
 */
export function roomFrame(room: Box, map: Box): Box {
  const whole = mapFrame(map);
  const frame = frameAround(
    room,
    ROOM_FILL,
    Math.max(map.width, map.height) * MIN_ROOM_FRAME,
  );
  if (frame.width >= whole.width) {
    return whole;
  }
  return {
    ...frame,
    x: slide(frame.x, frame.width, map.x, map.width),
    y: slide(frame.y, frame.height, map.y, map.height),
  };
}

/** The bounding box of a room's area; throws if it has no points. */
export function areaBounds(area: Ring[]): Box {
  const points = area.flat();
  if (points.length === 0) {
    throw new Error("its shape has no points");
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

interface SvgRoot {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  toString(): string;
}

function parseMap(svg: string): SvgRoot {
  return new DOMParser().parseFromString(svg, "image/svg+xml")
    .documentElement as unknown as SvgRoot;
}

/**
 * A map's co-ordinate space: its viewBox, or else its width and height, as
 * the site reads it.
 */
function mapBox(root: SvgRoot): Box {
  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const [x, y, width, height] = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    return { x, y, width, height };
  }
  return {
    x: 0,
    y: 0,
    width: parseFloat(root.getAttribute("width") || "0"),
    height: parseFloat(root.getAttribute("height") || "0"),
  };
}

/**
 * A map's SVG, ready to nest in its previews, and the space it is drawn in.
 * Read once for all of the map's previews.
 */
export type PreviewMap = { svg: string; box: Box };

export function previewMap(svg: string): PreviewMap {
  const root = parseMap(svg);
  const box = mapBox(root);
  if (!(box.width > 0 && box.height > 0)) {
    throw new Error("its SVG has no viewBox, or no width and height");
  }
  // Nested so that its user units are the preview's, which frames and areas
  // are in, whatever size the map's own width and height would give it.
  root.setAttribute("x", String(box.x));
  root.setAttribute("y", String(box.y));
  root.setAttribute("width", String(box.width));
  root.setAttribute("height", String(box.height));
  root.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
  return { svg: root.toString(), box };
}

function ringPath(ring: Ring): string {
  return `M ${ring.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
}

/**
 * The SVG of a preview showing `frame` of the map, with `area` outlined as
 * the site outlines the selected room.
 */
export function previewSvg(
  map: PreviewMap,
  frame: Box,
  theme: Config["theme"],
  area?: Ring[],
): string {
  const outline = (area ?? [])
    .map(
      (ring) =>
        `<path d="${ringPath(ring)}" fill="${theme["highlighted-room-background"]}" stroke="${theme.accent}" stroke-width="${(OUTLINE_WIDTH * frame.width) / PREVIEW_WIDTH}" stroke-linejoin="round"/>`,
    )
    .join("");
  const view = `${frame.x} ${frame.y} ${frame.width} ${frame.height}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" viewBox="${view}"><rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" fill="${theme.background}"/>${map.svg}${outline}</svg>`;
}

/** Renders a preview as a PNG; see `previewSvg`. */
export async function renderPreview(
  ...args: Parameters<typeof previewSvg>
): Promise<Buffer> {
  // Loaded only here: under Electron on Linux, loading sharp can clash with
  // the GLib Electron brings, which should only affect events that ask for
  // preview images.
  const { default: sharp } = await import("sharp");
  return sharp(Buffer.from(previewSvg(...args)))
    .png()
    .toBuffer();
}
