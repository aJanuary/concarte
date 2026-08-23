"use client";

import { useSyncExternalStore, useState, useEffect } from "react";
import Map from "./Map";
import RoomSelect from "./RoomSelect";
import MapSelect from "./MapSelect";
import FilterPills from "./FilterPills";
import OverlayPills from "./OverlayPills";
import InfoPanel from "./InfoPanel";
import config from "@/generated/config";
import { Map as MapConfig, Room } from "./config.types";

// localStorage-backed stores using useSyncExternalStore. Defined at module
// level for stable subscribe/getSnapshot references. Snapshots are cached so
// React doesn't see a new reference on every call (which would loop).
const EMPTY_OVERLAYS: string[] = [];

const infoPanelStore = (() => {
  const listeners = new Set<() => void>();
  let cache: boolean | null = null;
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): boolean {
      if (cache === null) {
        cache = localStorage.getItem("infoPanelExpanded") === "true";
      }
      return cache;
    },
    getServerSnapshot(): boolean {
      return false;
    },
    set(value: boolean): void {
      cache = value;
      localStorage.setItem("infoPanelExpanded", value ? "true" : "false");
      for (const listener of listeners) {
        listener();
      }
    },
  };
})();

const overlayStore = (() => {
  const listeners = new Set<() => void>();
  let cache: string[] | null = null;
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot(): string[] {
      if (cache === null) {
        const raw = localStorage.getItem("activeOverlays");
        cache = raw ? (JSON.parse(raw) as string[]) : EMPTY_OVERLAYS;
      }
      return cache;
    },
    getServerSnapshot(): string[] {
      return EMPTY_OVERLAYS;
    },
    set(value: string[]): void {
      cache = value;
      localStorage.setItem("activeOverlays", JSON.stringify(value));
      for (const listener of listeners) {
        listener();
      }
    },
  };
})();

export default function App({
  mapId,
  roomId,
}: {
  mapId?: string;
  roomId?: string;
}) {
  const map = config.maps.find((m) => m.id === mapId) || config.maps[0];
  const room = map.rooms.find((room) => room.id === roomId);
  const [selectedMap, setSelectedMap] = useState<MapConfig>(map);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(room);
  const [focusedRoom, setFocusedRoom] = useState<Room | undefined>(undefined);
  const [highlightedRooms, setHighlightedRooms] = useState<Room[]>([]);
  const [activePill, setActivePill] = useState<string | null>(null);
  const activeOverlays = useSyncExternalStore(
    overlayStore.subscribe,
    overlayStore.getSnapshot,
    overlayStore.getServerSnapshot,
  );

  const infoPanelExpanded = useSyncExternalStore(
    infoPanelStore.subscribe,
    infoPanelStore.getSnapshot,
    infoPanelStore.getServerSnapshot,
  );

  useEffect(() => {
    if (!mapId) {
      window.history.replaceState(null, "", `/map/${selectedMap.id}`);
    }
  }, [mapId, selectedMap.id]);

  const onRoomSelected = (map: MapConfig, room?: Room) => {
    setHighlightedRooms([]);
    setActivePill(null);
    setSelectedMap(map);
    if (!room) {
      setSelectedRoom(undefined);
      window.history.replaceState(null, "", `/map/${map.id}`);
    } else {
      history.replaceState(null, "", `/map/${map.id}/room/${room.id}`);
      setSelectedRoom(room);
    }
  };

  const onMapSelected = (map: MapConfig) => {
    setFocusedRoom(undefined);
    onRoomSelected(map, undefined);
  };

  const onRoomSelectedFromMap = (room?: Room) => {
    setFocusedRoom(undefined);
    onRoomSelected(selectedMap, room);
  };

  const onRoomSelectedFromDropdown = (map: MapConfig, room?: Room) => {
    setFocusedRoom(room);
    onRoomSelected(map, room);
  };

  const onInfoPanelExpandChange = (expanded: boolean) => {
    infoPanelStore.set(expanded);
  };

  const onOverlayToggle = (id: string) => {
    const next = activeOverlays.includes(id)
      ? activeOverlays.filter((x) => x !== id)
      : [...activeOverlays, id];
    overlayStore.set(next);
  };

  const onZoomClick = (room: Room) => {
    setFocusedRoom(room);
  };

  const onPan = () => {
    setFocusedRoom(undefined);
  };

  return (
    <main>
      <Map
        className="h-dvh w-dvw"
        config={config}
        selectedMap={selectedMap}
        selectedRoom={selectedRoom}
        focusedRoom={focusedRoom}
        highlightedRooms={highlightedRooms}
        activeOverlays={activeOverlays}
        onRoomSelected={onRoomSelectedFromMap}
        onPan={onPan}
      />
      <RoomSelect config={config} onRoomSelected={onRoomSelectedFromDropdown} />
      <div className="absolute top-15 left-10 z-40 flex flex-wrap items-center gap-2 px-4 pb-2 pointer-coarse:left-14">
        {config.maps.length > 1 && (
          <MapSelect
            config={config}
            selectedMap={selectedMap}
            onMapSelected={onMapSelected}
          />
        )}
        <OverlayPills
          config={config}
          activeOverlays={activeOverlays}
          onToggle={onOverlayToggle}
        />
        <FilterPills
          config={config}
          selectedMap={selectedMap}
          activePill={activePill}
          onPillSelected={(pill, rooms) => {
            setActivePill(pill);
            setHighlightedRooms(rooms);
            setSelectedRoom(undefined);
            window.history.replaceState(null, "", `/map/${selectedMap.id}`);
          }}
        />
      </div>
      <InfoPanel
        room={selectedRoom}
        expanded={infoPanelExpanded}
        focusedRoom={focusedRoom}
        onInfoPanelExpandChange={onInfoPanelExpandChange}
        onZoomClick={onZoomClick}
      />
    </main>
  );
}
