import React from 'react';
import { Room, Config } from './common_types';

interface RoomSelectProps {
  config: Config;
  onRoomSelected?: (room: Room) => void;
}

export default function RoomSelect({ config, onRoomSelected }: RoomSelectProps) {
  const [focused, setFocused] = React.useState(false);
  const onFocus = () => setFocused(true);
  const onDismiss = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) {
      setFocused(false);
    }
  };
  const [query, setQuery] = React.useState('');

  const onRoomClick = (room: Room) => {
    setFocused(false);
    setQuery('');
    onRoomSelected && onRoomSelected(room);
  };

  let results;
  if (query === '') {
    results = config.map.rooms.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    results = config.map.rooms.filter(room => {
      return room.label.toLowerCase().includes(query.toLowerCase()) ||
        room.aliases?.some(alias => alias.toLowerCase().includes(query.toLowerCase()));
    }).sort((a, b) => a.label.localeCompare(b.label));
  }

  return <div className={`transition absolute top-0 w-screen ${focused ? 'h-screen bg-white' : 'bg-transparent'}`}  onFocus={onFocus} onClick={onDismiss} >
    <div className="px-4 py-2">
      <input className="p-2 pl-12 border rounded-full w-full" tabIndex={2} type="text" placeholder="Search for a room..." value={query} onChange={e => setQuery(e.target.value)}/>
      { focused && <button className="absolute top-2 left-6 pl-1 pr-2 text-3xl cursor-pointer text-slate-700" tabIndex={1} onClick={onDismiss}>&lt;</button>}
    </div>
    <ul className={`absolute top-14 right-0 bottom-0 left-0 px-4 py-2 overflow-y-auto ${!focused && 'hidden'}`}>
      {results.map(((room, i) => {
        return <li key={room.id}>
          <a className="block p-2 border-b-2 border-slate-100 cursor-pointer hover:bg-slate-100" href={`/${room.id}`} tabIndex={i+3} onClick={e => { e.preventDefault(); onRoomClick(room); }}>
            <p>{room.label}</p>
            {room.aliases && <p className="text-slate-500">{room.aliases.join(', ')}</p>}
          </a>
        </li>;
      }))}
    </ul>
  </div>;
}