import {
  roomRef,
  type Config,
  type MapConfig,
  type Room,
} from "../shared/schema.ts";
import { tidyText } from "../shared/text.ts";

function tidyList(list: string[] | undefined): string[] | undefined {
  return list && list.length > 0 ? list : undefined;
}

function tidyRoom(room: Room): Room {
  const ref = roomRef(room);
  if (ref === undefined) {
    throw new Error(`Room "${room.id}" does not have a { ref } area`);
  }
  const description = room.description ? tidyText(room.description) : "";
  return {
    id: room.id,
    label: room.label,
    aliases: tidyList(room.aliases),
    description: description === "" ? undefined : description,
    link: room.link
      ? { href: room.link.href, title: room.link.title }
      : undefined,
    searchable: room.searchable,
    area: { ref },
  };
}

function tidyMap(map: MapConfig): MapConfig {
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

export function normalizeConfig(config: Config): Config {
  return {
    eventName: config.eventName,
    locale: config.locale,
    description: tidyText(config.description),
    attributions: tidyList(config.attributions?.filter((a) => a.trim() !== "")),
    theme: { ...config.theme },
    filters: tidyList(config.filters),
    defaultMap: config.defaultMap || undefined,
    maps: config.maps.map(tidyMap),
  };
}

/** Produces the contents of an event's concarte.json. */
export function serializeConfig(config: Config): string {
  return JSON.stringify(normalizeConfig(config), null, 2) + "\n";
}
