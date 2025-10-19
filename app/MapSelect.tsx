import { Map, Config } from "./config.types";
import { MapIcon } from "@heroicons/react/24/outline";

export default function MapSelect({
  config,
  selectedMap,
  onMapSelected,
}: {
  config: Config;
  selectedMap: Map;
  onMapSelected: (map: Map) => void;
}) {
  return (
    <div className="relative">
      <MapIcon className="text-secondary-text pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <select
        className="bg-background border-border text-primary-text rounded border py-2 pr-4 pl-8 text-sm"
        value={selectedMap.id}
        onChange={(e) => {
          const map = config.maps.find((m) => m.id === e.target.value);
          if (map) {
            onMapSelected(map);
          }
        }}
      >
        {config.maps.map((map) => (
          <option key={map.id} value={map.id}>
            {map.label}
          </option>
        ))}
      </select>
    </div>
  );
}
