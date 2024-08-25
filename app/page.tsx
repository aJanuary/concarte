'use client';

import { useState } from 'react';
import Map from './Map';
import RoomSelect from './RoomSelect';
import { Room } from './common_types';
import config from './config.json';

export default function Home({ params }: { params: { room: string } }) {
  let room;
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const roomId = path.slice(1);
    room = config.levels.flatMap(level => level.rooms).find(room => room.id === roomId);
  } else {
    room = undefined;
  }
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(room);

  const onRoomSelected = (room: Room) => {
    history.replaceState(null, '', `/${room.id}`);
    setSelectedRoom(room);
  };

  return (
    <main>
      <Map className="w-screen h-screen" config={config} selectedRoom={selectedRoom} onRoomSelected={onRoomSelected} />
      <RoomSelect config={config} onRoomSelected={onRoomSelected} />
    </main>
  );
}
