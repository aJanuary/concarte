'use client';

import Map from './Map';
import RoomSelect from './RoomSelect';
import config from './config.json';

export default function Home({ params }: { params: { room: string } }) {
  return (
    <main>
      <Map className="w-screen h-screen" config={config}></Map>
      <RoomSelect config={config}></RoomSelect>
    </main>
  );
}
