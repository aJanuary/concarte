'use client';

import { useState } from 'react';
import Map from './Map';
import RoomSelect from './RoomSelect';
import InfoPanel from './InfoPanel';
import { Room } from './common_types';
import config from './config';
import { usePathname } from 'next/navigation'

export default function Home() {
  const pathname = usePathname().slice(1);
  const room = config.map.rooms.find(room => room.id === pathname);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(room);

  const [infoPanelExpanded, setInfoPanelExpanded] = useState(() => {
    return Boolean(localStorage.getItem('infoPanelExpanded'));
  });

  const onRoomSelected = (room?: Room) => {
    if (!room) {
      setSelectedRoom(undefined);
      window.history.replaceState(null, '', '/');
    } else {
      history.replaceState(null, '', `/${room.id}`);
      setSelectedRoom(room);
    }
  };

  const onInfoPanelExpandChange = (expanded: boolean) => {
    setInfoPanelExpanded(expanded);
    localStorage.setItem('infoPanelExpanded', expanded ? 'true' : '');
  }

  return (
    <main>
      <Map className="w-screen h-screen" config={config} selectedRoom={selectedRoom} onRoomSelected={onRoomSelected} />
      <RoomSelect config={config} onRoomSelected={onRoomSelected} />
      { selectedRoom && <InfoPanel room={selectedRoom} expanded={infoPanelExpanded} onInfoPanelExpandChange={onInfoPanelExpandChange} /> }
    </main>
  );
}
