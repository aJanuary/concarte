import { useState, useMemo, MouseEvent } from "react";
import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Fuse from "fuse.js";
import { Map, Room, Config } from "./config.types";
import { useTranslations } from "next-intl";

interface RoomSelectProps {
  config: Config;
  onRoomSelected?: (map: Map, room: Room) => void;
}

type RoomWithMap = Room & { map: Map; mapLabel: string };

export default function RoomSelect({
  config,
  onRoomSelected,
}: RoomSelectProps) {
  const t = useTranslations("room-select");
  const [focused, setFocused] = useState(false);
  const onFocus = () => setFocused(true);
  const onDismiss = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget || e.currentTarget.tagName === "BUTTON") {
      setFocused(false);
    }
  };
  const [query, setQuery] = useState("");

  const onRoomClick = (room: RoomWithMap) => {
    setFocused(false);
    setQuery("");
    onRoomSelected && onRoomSelected(room.map, room);
  };

  const allRooms = useMemo(() => {
    return config.maps
      .flatMap((map) => {
        return map.rooms
          .filter((room) => room.searchable !== false)
          .map((room) => ({
            ...room,
            map: map,
            mapLabel: map.label,
          }));
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [config.maps]);

  let results;
  if (query === "") {
    results = allRooms;
  } else {
    let keys = ["label", "aliases"];
    if (config.maps.length > 1) {
      keys.push("mapLabel");
    }
    const fuse = new Fuse(allRooms, {
      keys: keys,
      ignoreLocation: true,
    });

    results = fuse.search(query).map((result) => result.item);
  }

  let icon;
  if (focused) {
    icon = (
      <button
        className="text-primary-text absolute top-2 left-6 cursor-pointer pt-2 pr-2 pb-2 pl-1"
        tabIndex={1}
        onClick={onDismiss}
      >
        <ChevronLeftIcon className="size-6" />
      </button>
    );
  } else {
    icon = (
      <MagnifyingGlassIcon className="text-primary-text absolute top-2 left-6 size-10 pt-2 pr-2 pb-2 pl-1" />
    );
  }

  return (
    <div
      className={`absolute top-0 z-50 w-screen transition ${focused ? "bg-background h-screen" : "bg-transparent"}`}
      onFocus={onFocus}
      onClick={onDismiss}
    >
      <div className="px-4 py-2">
        <input
          className="border-border bg-background text-primary-text placeholder-secondary-text w-full rounded-full border p-2 pl-12"
          tabIndex={2}
          type="text"
          placeholder={t("search-placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {icon}
      </div>
      <ul
        className={`absolute top-14 right-0 bottom-0 left-0 overflow-y-auto px-4 py-2 ${focused ? "" : "hidden"}`}
      >
        {results.map((room, i) => {
          let secondaryText = [];
          if (config.maps.length > 1) {
            secondaryText.push(room.mapLabel);
          }
          if (room.aliases && room.aliases.length > 0) {
            secondaryText = secondaryText.concat(room.aliases);
          }
          return (
            <li key={`${room.map.id}-${room.id}`}>
              <a
                className="border-border hover:bg-highlight-background block cursor-pointer border-b-2 p-2"
                href={`/room/${room.id}`}
                tabIndex={i + 3}
                onClick={(e) => {
                  e.preventDefault();
                  onRoomClick(room);
                }}
              >
                <p>{room.label}</p>
                {secondaryText.length > 0 && (
                  <p className="text-secondary-text">
                    {secondaryText.join(", ")}
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
