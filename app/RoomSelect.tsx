import React from 'react';
import { Room, Config } from './common_types';
import { ChevronLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'

interface RoomSelectProps {
  config: Config;
  onRoomSelected?: (room: Room) => void;
}

export default function RoomSelect({ config, onRoomSelected }: RoomSelectProps) {
  const [focused, setFocused] = React.useState(false);
  const onFocus = () => setFocused(true);
  const onDismiss = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget || e.currentTarget.tagName === 'BUTTON') {
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

  let icon;
  if (focused) {
    icon = <button className="absolute top-2 left-6 pl-1 pr-2 pt-2 pb-2 cursor-pointer text-primary-text" tabIndex={1} onClick={onDismiss}>
    <ChevronLeftIcon className="size-6" />
  </button>
  } else {
    icon = <MagnifyingGlassIcon className="absolute size-10 top-2 left-6 pl-1 pr-2 pt-2 pb-2 text-primary-text" />
  }

  return <div className={`transition absolute top-0 w-screen ${focused ? 'h-screen bg-background' : 'bg-transparent'}`}  onFocus={onFocus} onClick={onDismiss} >
    <div className="px-4 py-2">
      <input className="p-2 pl-12 border rounded-full w-full border-border bg-background text-primary-text placeholder-secondary-text" tabIndex={2} type="text" placeholder="Search for a room..." value={query} onChange={e => setQuery(e.target.value)}/>
      { icon }
    </div>
    <ul className={`absolute top-14 right-0 bottom-0 left-0 px-4 py-2 overflow-y-auto ${!focused && 'hidden'}`}>
      {results.map(((room, i) => {
        return <li key={room.id}>
          <a className="block p-2 border-b-2 border-border cursor-pointer hover:bg-highlight-background" href={`/${room.id}`} tabIndex={i+3} onClick={e => { e.preventDefault(); onRoomClick(room); }}>
            <p>{room.label}</p>
            {room.aliases && <p className="text-secondary-text">{room.aliases.join(', ')}</p>}
          </a>
        </li>;
      }))}
    </ul>
  </div>;
}