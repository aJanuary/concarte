"use client";

import { useState } from "react";
import Map from "./Map";
import RoomSelect from "./RoomSelect";
import InfoPanel from "./InfoPanel";
import config from "./config";
import { Room } from "./config.types";
import { set } from "ol/transform";

export default function App({ roomId }: { roomId?: string }) {
  const room = config.map.rooms.find((room) => room.id === roomId);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(room);
  const [focusedRoom, setFocusedRoom] = useState<Room | undefined>(undefined);

  const [infoPanelExpanded, setInfoPanelExpanded] = useState(() => {
    return Boolean(
      typeof localStorage !== "undefined" &&
        localStorage.getItem("infoPanelExpanded"),
    );
  });

  const onRoomSelected = (room?: Room) => {
    if (!room) {
      setSelectedRoom(undefined);
      window.history.replaceState(null, "", "/");
    } else {
      history.replaceState(null, "", `/room/${room.id}`);
      setSelectedRoom(room);
    }
  };

  const onRoomSelectedFromMap = (room?: Room) => {
    setFocusedRoom(undefined);
    onRoomSelected(room);
  };

  const onRoomSelectedFromDropdown = (room?: Room) => {
    setFocusedRoom(room);
    onRoomSelected(room);
  };

  const onInfoPanelExpandChange = (expanded: boolean) => {
    setInfoPanelExpanded(expanded);
    typeof localStorage !== "undefined" &&
      localStorage.setItem("infoPanelExpanded", expanded ? "true" : "");
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
        className="h-screen w-screen"
        config={config}
        selectedRoom={selectedRoom}
        focusedRoom={focusedRoom}
        onRoomSelected={onRoomSelectedFromMap}
        onPan={onPan}
      />
      <RoomSelect config={config} onRoomSelected={onRoomSelectedFromDropdown} />
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
