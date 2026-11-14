import { useCallback, useState } from "react";
import type { Config } from "../../shared/schema";
import { isOnMap, type Selection } from "./selection";

const EVENT: Selection = { kind: "event" };

/** What is selected in the document, and which map is on show. */
export function useSelection(doc: Config) {
  const [selected, setSelected] = useState(EVENT);
  const [activeMapSrc, setActiveMapSrc] = useState(doc.maps[0]?.src);

  // The selected map may have been removed, and undo can bring it back.
  const selection: Selection =
    isOnMap(selected) && !doc.maps.some((m) => m.src === selected.mapSrc)
      ? EVENT
      : selected;
  const activeMap = doc.maps.find((m) => m.src === activeMapSrc) ?? doc.maps[0];

  const select = useCallback((next: Selection) => {
    setSelected(next);
    if (isOnMap(next)) {
      setActiveMapSrc(next.mapSrc);
    }
  }, []);

  return { selection, select, activeMap };
}
