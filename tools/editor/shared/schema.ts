import type {
  Config,
  Map as MapConfig,
  Overlay,
  Room,
} from "../../../app/config.types.ts";

export type { Config, MapConfig, Overlay, Room };
export type Theme = Config["theme"];
export type RoomLink = NonNullable<Room["link"]>;

// Declared key order for each type. Used by the serializer, and typed as
// Record so that adding a field to the config types is a compile error here.
export const configOrder = {
  eventName: true,
  locale: true,
  description: true,
  attributions: true,
  theme: true,
  filters: true,
  defaultMap: true,
  maps: true,
} satisfies Record<keyof Config, true>;

export const themeOrder = {
  background: true,
  "control-background": true,
  "highlight-background": true,
  border: true,
  "primary-text": true,
  "secondary-text": true,
  accent: true,
  disabled: true,
} satisfies Record<keyof Theme, true>;

export const mapOrder = {
  id: true,
  label: true,
  src: true,
  overlays: true,
  rooms: true,
} satisfies Record<keyof MapConfig, true>;

export const overlayOrder = {
  id: true,
  label: true,
  src: true,
} satisfies Record<keyof Overlay, true>;

export const roomOrder = {
  id: true,
  label: true,
  aliases: true,
  description: true,
  link: true,
  searchable: true,
  area: true,
} satisfies Record<keyof Room, true>;

export const linkOrder = {
  href: true,
  title: true,
} satisfies Record<keyof RoomLink, true>;

export function keysOf<T extends object>(order: Record<keyof T, true>) {
  return Object.keys(order) as (keyof T)[];
}

export function roomRef(room: Room): string | undefined {
  const area = room.area;
  if (
    typeof area === "object" &&
    area !== null &&
    !Array.isArray(area) &&
    typeof area.ref === "string"
  ) {
    return area.ref;
  }
  return undefined;
}

export function assetPath(src: string): string {
  return src.replace(/^\/+/, "");
}

export function srcFromAsset(asset: string): string {
  return "/" + asset;
}
