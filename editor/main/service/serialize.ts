import {
  THEME_KEYS,
  type Complete,
  type Config,
  type MapConfig,
  type Room,
} from "../../shared/schema.ts";

// Each tidy function lists every key of its type, in the order the file is
// written. Complete makes leaving out a newly added optional key a compile
// error rather than a field the editor silently drops on save.

function tidyList(list: string[] | undefined): string[] | undefined {
  return list && list.length > 0 ? list : undefined;
}

function tidyRoom(room: Room): Complete<Room> {
  const description = room.description?.trim() ?? "";
  return {
    id: room.id,
    label: room.label,
    aliases: tidyList(room.aliases),
    description: description === "" ? undefined : description,
    link: room.link
      ? { href: room.link.href, title: room.link.title }
      : undefined,
    searchable: room.searchable === false ? false : undefined,
    shape: room.shape,
  };
}

function tidyMap(map: MapConfig): Complete<MapConfig> {
  return {
    id: map.id,
    label: map.label,
    src: map.src,
    overlays:
      map.overlays && map.overlays.length > 0
        ? map.overlays.map((o) => ({ id: o.id, label: o.label, src: o.src }))
        : undefined,
    rooms: map.rooms.map(tidyRoom),
  };
}

export function normalizeConfig(config: Config): Complete<Config> {
  return {
    eventName: config.eventName,
    locale: config.locale,
    description: config.description.trim(),
    attributions: tidyList(config.attributions?.filter((a) => a.trim() !== "")),
    theme: Object.fromEntries(
      THEME_KEYS.map((key) => [key, config.theme[key]]),
    ) as Config["theme"],
    filters: tidyList(config.filters),
    defaultMap: config.defaultMap || undefined,
    maps: config.maps.map(tidyMap),
  };
}

/** Produces the contents of an event's concarte.json. */
export function serializeConfig(config: Config): string {
  return JSON.stringify(normalizeConfig(config), null, 2) + "\n";
}
