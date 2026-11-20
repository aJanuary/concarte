import { getHeight, getWidth, type Extent } from "ol/extent";
import type { Size } from "ol/size";

// How much bigger than the room the framed view is, in each direction, so a
// large room fills about a third of the visible area and its surroundings show.
const ROOM_CONTEXT = Math.sqrt(3);

// The furthest a room can be zoomed in on, relative to showing the whole map,
// so a small room still shows enough of the map to place it.
const MAX_ZOOM_OVER_MAP = 2.5;

/**
 * The resolution to frame a room at: zoomed out enough to show context around
 * it, between showing 40% of the map and showing the whole map.
 */
export function roomFrameResolution(
  room: Extent,
  map: Extent,
  clearSize: Size,
): number {
  const resolutionFor = (extent: Extent) =>
    Math.max(getWidth(extent) / clearSize[0], getHeight(extent) / clearSize[1]);
  const wholeMap = resolutionFor(map);
  return Math.min(
    Math.max(resolutionFor(room) * ROOM_CONTEXT, wholeMap / MAX_ZOOM_OVER_MAP),
    wholeMap,
  );
}

/**
 * Whether the page was opened afresh (e.g. from a shared link) rather than
 * reloaded or returned to with back/forward.
 */
export function isFreshVisit(
  navigationType: NavigationTimingType | undefined,
): boolean {
  return navigationType !== "reload" && navigationType !== "back_forward";
}

export function currentNavigationType(): NavigationTimingType | undefined {
  if (typeof performance === "undefined") {
    return undefined;
  }
  const [entry] = performance.getEntriesByType("navigation") as
    PerformanceNavigationTiming[] | [];
  return entry?.type;
}
