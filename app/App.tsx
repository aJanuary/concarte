"use client";

import { useState } from "react";
import Map from "./Map";
import RoomSelect from "./RoomSelect";
import InfoPanel from "./InfoPanel";
import config from "./config";
import { Room } from "./config.types";

export default function App({ roomId }: { roomId?: string }) {
  const room = config.map.rooms.find((room) => room.id === roomId);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(room);

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

  const onInfoPanelExpandChange = (expanded: boolean) => {
    setInfoPanelExpanded(expanded);
    typeof localStorage !== "undefined" &&
      localStorage.setItem("infoPanelExpanded", expanded ? "true" : "");
  };

  return (
    <main>
      <Map
        className="h-screen w-screen"
        config={config}
        selectedRoom={selectedRoom}
        onRoomSelected={onRoomSelected}
      />
      <RoomSelect config={config} onRoomSelected={onRoomSelected} />
      {selectedRoom && (
        <InfoPanel
          room={selectedRoom}
          expanded={infoPanelExpanded}
          onInfoPanelExpandChange={onInfoPanelExpandChange}
        />
      )}
    </main>
  );
}
