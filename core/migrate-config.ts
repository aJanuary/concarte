function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Rewrites a room's `area: { ref }`, the format before `shape`, as
 * `shape`. The key takes `area`'s place so a re-saved file diffs cleanly.
 */
function migrateRoom(room: unknown): unknown {
  if (!isObject(room) || room.shape !== undefined) {
    return room;
  }
  const area = room.area;
  if (!isObject(area) || typeof area.ref !== "string") {
    return room;
  }
  return Object.fromEntries(
    Object.entries(room).map(([key, value]) =>
      key === "area" ? ["shape", area.ref] : [key, value],
    ),
  );
}

/**
 * Brings a config written in an older format up to date. Takes and returns
 * untrusted JSON: anything it doesn't recognise is passed through for
 * `configShapeProblems` to report.
 */
export function migrateConfig(value: unknown): unknown {
  if (!isObject(value) || !Array.isArray(value.maps)) {
    return value;
  }
  return {
    ...value,
    maps: value.maps.map((map: unknown) =>
      isObject(map) && Array.isArray(map.rooms)
        ? { ...map, rooms: map.rooms.map(migrateRoom) }
        : map,
    ),
  };
}
