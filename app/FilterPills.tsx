import React from "react";
import { Map, Room, Config } from "./config.types";

interface FilterPillsProps {
  config: Config;
  selectedMap: Map;
  activePill: string | null;
  onPillSelected?: (pill: string | null, rooms: Room[]) => void;
}

export default function FilterPills({
  config,
  selectedMap,
  activePill,
  onPillSelected,
}: FilterPillsProps) {
  if (!config.filters || config.filters.length === 0) {
    return null;
  }

  const onPillClick = (pill: string) => {
    if (activePill === pill) {
      onPillSelected && onPillSelected(null, []);
    } else {
      const lowerPill = pill.toLowerCase();
      const matching = selectedMap.rooms.filter((room) => {
        if (room.label.toLowerCase().includes(lowerPill)) {
          return true;
        }
        if (room.aliases?.some((a) => a.toLowerCase().includes(lowerPill))) {
          return true;
        }
        return false;
      });
      onPillSelected && onPillSelected(pill, matching);
    }
  };

  return (
    <>
      {config.filters.map((pill) => (
        <button
          key={pill}
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm whitespace-nowrap ${
            activePill === pill
              ? "border-accent bg-accent text-white"
              : "border-border bg-background text-primary-text hover:bg-highlight-background"
          }`}
          onClick={() => onPillClick(pill)}
        >
          {pill}
        </button>
      ))}
    </>
  );
}
