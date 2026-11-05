import React from "react";
import { Map as MapConfig } from "./config.types";

interface OverlayPillsProps {
  selectedMap: MapConfig;
  activeOverlays: string[];
  onToggle: (id: string) => void;
}

export default function OverlayPills({
  selectedMap,
  activeOverlays,
  onToggle,
}: OverlayPillsProps) {
  if (!selectedMap.overlays || selectedMap.overlays.length === 0) {
    return null;
  }

  return (
    <>
      {selectedMap.overlays.map((overlay) => (
        <button
          key={overlay.id}
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm whitespace-nowrap shadow-md transition-shadow hover:shadow-lg ${
            activeOverlays.includes(overlay.id)
              ? "border-accent bg-accent text-white"
              : "border-border bg-control-background text-primary-text hover:bg-highlight-background"
          }`}
          onClick={() => onToggle(overlay.id)}
        >
          {overlay.label}
        </button>
      ))}
    </>
  );
}
