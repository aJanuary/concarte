import {
  roomRef,
  srcFromAsset,
  type Config,
  type MapConfig,
  type Overlay,
  type Room,
} from "../../shared/schema";

export type Doc = Config;
export type Edit = ((doc: Doc) => Doc) & { label: string };

const edit = (label: string, fn: (doc: Doc) => Doc): Edit =>
  Object.assign(fn, { label });

const fields = (patch: object) => Object.keys(patch).join(", ");
const mapName = (src: string) => `map ${src.replace(/^\/+/, "")}`;

const mapAt = (doc: Doc, src: string) =>
  doc.maps.findIndex((m) => m.src === src);

export const updateEvent = (
  patch: Partial<Omit<Config, "theme" | "maps">>,
): Edit =>
  edit(`Change event ${fields(patch)}`, (doc) => ({ ...doc, ...patch }));

export const updateTheme = (patch: Partial<Config["theme"]>): Edit =>
  edit(`Change theme ${fields(patch)}`, (doc) => ({
    ...doc,
    theme: { ...doc.theme, ...patch },
  }));

export const updateMap = (
  src: string,
  patch: Partial<Omit<MapConfig, "src" | "rooms">>,
): Edit =>
  edit(`Change ${fields(patch)} of ${mapName(src)}`, (doc) => {
    const old = doc.maps.find((m) => m.src === src);
    return {
      ...doc,
      // The default is referenced by id, so renaming the map must carry it.
      defaultMap:
        old && patch.id !== undefined && doc.defaultMap === old.id
          ? patch.id
          : doc.defaultMap,
      maps: doc.maps.map((m) => (m.src === src ? { ...m, ...patch } : m)),
    };
  });

export const removeMap = (src: string): Edit =>
  edit(`Remove ${mapName(src)}`, (doc) => {
    const removed = doc.maps.find((m) => m.src === src);
    return {
      ...doc,
      defaultMap:
        removed && doc.defaultMap === removed.id ? undefined : doc.defaultMap,
      maps: doc.maps.filter((m) => m.src !== src),
    };
  });

export const moveMap = (src: string, delta: -1 | 1): Edit =>
  edit(`Move ${mapName(src)} ${delta < 0 ? "up" : "down"}`, (doc) => {
    const from = mapAt(doc, src);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= doc.maps.length) {
      return doc;
    }
    const maps = [...doc.maps];
    [maps[from], maps[to]] = [maps[to], maps[from]];
    return { ...doc, maps };
  });

export const makeDefaultMap = (src: string): Edit =>
  edit(`Make ${mapName(src)} the default`, (doc) => {
    const map = doc.maps.find((m) => m.src === src);
    return map && doc.defaultMap !== map.id
      ? { ...doc, defaultMap: map.id }
      : doc;
  });

export const defaultMapOf = (doc: Doc): MapConfig | undefined =>
  doc.maps.find((m) => m.id === doc.defaultMap) ?? doc.maps[0];

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function newMap(doc: Doc, asset: string): MapConfig {
  const base = asset
    .split("/")
    .pop()!
    .replace(/\.[^.]+$/, "");
  const words = base.replace(/[-_]+/g, " ").trim();
  const label = words.charAt(0).toUpperCase() + words.slice(1);
  const taken = new Set(doc.maps.map((m) => m.id));
  const stem = slug(base) || "map";
  let id = stem;
  for (let n = 2; taken.has(id); n++) {
    id = `${stem}-${n}`;
  }
  return { id, label, src: srcFromAsset(asset), rooms: [] };
}

export const addMap = (map: MapConfig): Edit =>
  edit(`Add ${mapName(map.src)}`, (doc) => ({
    ...doc,
    maps: [...doc.maps, map],
  }));

const withMap = (
  label: string,
  src: string,
  fn: (map: MapConfig) => MapConfig,
): Edit =>
  edit(label, (doc) => ({
    ...doc,
    maps: doc.maps.map((m) => (m.src === src ? fn(m) : m)),
  }));

export const addOverlay = (mapSrc: string, overlay: Overlay): Edit =>
  withMap(`Add overlay to ${mapName(mapSrc)}`, mapSrc, (m) => ({
    ...m,
    overlays: [...(m.overlays ?? []), overlay],
  }));

export const updateOverlay = (
  mapSrc: string,
  index: number,
  patch: Partial<Overlay>,
): Edit =>
  withMap(`Change overlay ${fields(patch)}`, mapSrc, (m) => ({
    ...m,
    overlays: m.overlays?.map((o, i) => (i === index ? { ...o, ...patch } : o)),
  }));

export const removeOverlay = (mapSrc: string, index: number): Edit =>
  withMap(`Remove overlay from ${mapName(mapSrc)}`, mapSrc, (m) => ({
    ...m,
    overlays: m.overlays?.filter((_, i) => i !== index),
  }));

export const addRoom = (mapSrc: string, ref: string): Edit =>
  withMap(`Add room ${ref}`, mapSrc, (m) => ({
    ...m,
    rooms: [...m.rooms, { id: ref, label: "", area: { ref } }],
  }));

export const updateRoom = (
  mapSrc: string,
  ref: string,
  patch: Partial<Omit<Room, "area">>,
): Edit =>
  withMap(`Change ${fields(patch)} of room ${ref}`, mapSrc, (m) => ({
    ...m,
    rooms: m.rooms.map((r) => (roomRef(r) === ref ? { ...r, ...patch } : r)),
  }));

export const removeRoom = (mapSrc: string, ref: string): Edit =>
  withMap(`Remove room ${ref}`, mapSrc, (m) => ({
    ...m,
    rooms: m.rooms.filter((r) => roomRef(r) !== ref),
  }));

export function findRoom(
  doc: Doc,
  mapSrc: string,
  ref: string,
): Room | undefined {
  return doc.maps
    .find((m) => m.src === mapSrc)
    ?.rooms.find((r) => roomRef(r) === ref);
}

export function roomHasData(room: Room): boolean {
  return (
    room.label.trim() !== "" ||
    room.id !== roomRef(room) ||
    (room.aliases?.length ?? 0) > 0 ||
    (room.description?.trim() ?? "") !== "" ||
    room.link !== undefined ||
    room.searchable !== undefined
  );
}
