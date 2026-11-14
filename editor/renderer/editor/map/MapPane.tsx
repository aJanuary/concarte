import { useSession } from "../session";
import { MapPlaceholder, MapView } from "./MapView";

/** Shows the active map, with the selection on it. */
export function MapPane() {
  const { activeMap, svgs, selection, select } = useSession();
  const svg = activeMap ? svgs.svgs[activeMap.src] : undefined;

  if (!activeMap) {
    return <MapPlaceholder state="none" />;
  }
  if (!svg || svg === "error") {
    return <MapPlaceholder state={svg === "error" ? "error" : "loading"} />;
  }
  const mapSrc = activeMap.src;
  return (
    <MapView
      // Keyed so view state, such as the overlays shown, starts afresh per map.
      key={mapSrc}
      map={activeMap}
      svg={svg}
      selectedKey={
        selection.kind === "node" && selection.mapSrc === mapSrc
          ? selection.key
          : undefined
      }
      onSelect={(id) =>
        select(id ? { kind: "node", mapSrc, key: id } : { kind: "map", mapSrc })
      }
    />
  );
}
