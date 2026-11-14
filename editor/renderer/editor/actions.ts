import type { Config, MapConfig, Room } from "../../shared/schema";
import * as ops from "../document/ops";
import type { ActionItem } from "../ui/ActionsMenu";
import { plural } from "../ui/text";

/** The actions menu of a map, in the tree and on its panel. */
export function mapActions(
  doc: Config,
  apply: ops.Apply,
  map: MapConfig,
): ActionItem[] {
  const index = doc.maps.indexOf(map);
  return [
    {
      id: "up",
      label: "Move up",
      isDisabled: index === 0,
      onAction: () => apply(ops.moveMap(map.src, -1)),
    },
    {
      id: "down",
      label: "Move down",
      isDisabled: index === doc.maps.length - 1,
      onAction: () => apply(ops.moveMap(map.src, 1)),
    },
    {
      id: "default",
      label: "Make default",
      description: "The map shown when no map is chosen.",
      isDisabled: ops.defaultMapOf(doc) === map,
      onAction: () => apply(ops.makeDefaultMap(map.src)),
    },
    {
      id: "remove",
      label: "Remove map",
      onAction: () => apply(ops.removeMap(map.src)),
      confirm:
        map.rooms.length === 0
          ? undefined
          : {
              title: `Remove map "${map.label}"?`,
              message: `Its ${plural(map.rooms.length, "room")} will be removed too.`,
              action: "Remove map",
            },
    },
  ];
}

/** The actions menu of a room, in the tree and on its panel. */
export function roomActions(
  apply: ops.Apply,
  mapSrc: string,
  shape: string,
  room: Room,
): ActionItem[] {
  return [
    {
      id: "remove",
      label: "Remove room",
      description:
        "The shape stays on the map; only its room details are removed.",
      onAction: () => apply(ops.removeRoom(mapSrc, shape)),
      confirm: ops.roomHasData(room)
        ? {
            title: `Remove room "${room.label || room.id}"?`,
            message:
              "The shape stays on the map, but its room details are lost.",
            action: "Remove room",
          }
        : undefined,
    },
  ];
}
