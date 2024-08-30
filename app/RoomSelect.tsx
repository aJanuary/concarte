import React from "react";
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Fuse from "fuse.js";
import { Room, Config } from "./config.types";

interface RoomSelectProps {
  config: Config;
  onRoomSelected?: (room: Room) => void;
}

export default function RoomSelect({
  config,
  onRoomSelected,
}: RoomSelectProps) {
  const [focused, setFocused] = React.useState(false);
  const onFocus = () => setFocused(true);
  const onDismiss = (e: React.MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget || e.currentTarget.tagName === "BUTTON") {
      setFocused(false);
    }
  };
  const [query, setQuery] = React.useState("");

  const onRoomClick = (room: Room) => {
    setFocused(false);
    setQuery("");
    onRoomSelected && onRoomSelected(room);
  };

  let results;
  if (query === "") {
    results = config.map.rooms.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    const fuse = new Fuse(config.map.rooms, {
      keys: ["label", "aliases"],
      ignoreLocation: true,
    });

    results = fuse.search(query).map((result) => result.item);
  }

  let icon;
  if (focused) {
    icon = (
      <button
        className="absolute left-6 top-2 cursor-pointer pb-2 pl-1 pr-2 pt-2 text-primary-text"
        tabIndex={1}
        onClick={onDismiss}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
    );
  } else {
    icon = (
      <MagnifyingGlassIcon className="absolute left-6 top-2 size-10 pb-2 pl-1 pr-2 pt-2 text-primary-text" />
    );
  }

  return (
    <div
      className={`absolute top-0 z-50 w-screen transition ${focused ? "h-screen bg-background" : "bg-transparent"}`}
      onFocus={onFocus}
      onClick={onDismiss}
    >
      <div className="px-4 py-2">
        <input
          className="w-full rounded-full border border-border bg-background p-2 pl-12 text-primary-text placeholder-secondary-text"
          tabIndex={2}
          type="text"
          placeholder="Search for a room..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {icon}
      </div>
      <ul
        className={`absolute bottom-0 left-0 right-0 top-14 overflow-y-auto px-4 py-2 ${focused ? "" : "hidden"}`}
      >
        {results.map((room, i) => {
          return (
            <li key={room.id}>
              <a
                className="block cursor-pointer border-b-2 border-border p-2 hover:bg-highlight-background"
                href={`/room/${room.id}`}
                tabIndex={i + 3}
                onClick={(e) => {
                  e.preventDefault();
                  onRoomClick(room);
                }}
              >
                <p>{room.label}</p>
                {room.aliases && (
                  <p className="text-secondary-text">
                    {room.aliases.join(", ")}
                  </p>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
