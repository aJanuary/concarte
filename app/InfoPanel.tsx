import {
  ChevronUpIcon,
  ChevronDownIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/solid";
import Markdown from "react-markdown";
import { Room } from "./config.types";
import { useTranslations } from "next-intl";
import { dedent } from "./text-utils";

interface InfoPanelProps {
  room?: Room;
  expanded: boolean;
  focusedRoom?: Room;
  onInfoPanelExpandChange?: (expanded: boolean) => void;
  onZoomClick?: (room: Room) => void;
}

export default function InfoPanel({
  room,
  expanded,
  focusedRoom,
  onInfoPanelExpandChange,
  onZoomClick,
}: InfoPanelProps) {
  let panel = <></>;
  if (room) {
    const handlePanelClick = () => {
      if (room.description) {
        onInfoPanelExpandChange && onInfoPanelExpandChange(!expanded);
      }
    };

    const handleZoomClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onZoomClick) return;
      e.stopPropagation();
      onZoomClick(room);
    };

    let icon;
    if (!room.description) {
      icon = (
        <ChevronUpIcon className="m-auto size-6 fill-disabled stroke-disabled" />
      );
    } else if (expanded) {
      icon = <ChevronDownIcon className="m-auto size-6" />;
    } else {
      icon = <ChevronUpIcon className="m-auto size-6" />;
    }

    panel = (
      <div className="relative bg-background p-4 pt-6 text-left shadow-top">
        <header
          className={`${expanded && room.description ? "border-1 border-b border-border pb-2" : ""} ${room.description ? "cursor-pointer" : ""}`}
          onClick={handlePanelClick}
        >
          <p className="absolute left-0 right-0 top-0">{icon}</p>
          <h1 className="text-xl">
            <button
              className="mr-2 align-text-bottom"
              onClick={handleZoomClick}
            >
              <ViewfinderCircleIcon className="m-auto size-6" />
            </button>
            {room.label}
          </h1>
          <h2 className="text-secondary-text">{room.aliases?.join(", ")}</h2>
        </header>
        {expanded && room.description && (
          <div className="prose prose-default max-h-72 max-w-none overflow-y-auto pt-2">
            <Markdown
              components={{
                h1: "h3",
                h2: "h4",
                h3: "h5",
                h4: "h6",
                h5: "h6",
              }}
            >
              {dedent(room.description)}
            </Markdown>
          </div>
        )}
      </div>
    );
  }

  const t = useTranslations();

  return (
    <div className="absolute bottom-0 left-0 right-0 text-right">
      <div className="m-2 inline-block rounded border border-border bg-background opacity-75 shadow-xl hover:opacity-100">
        <a href="/about" className="inline-block p-2">
          {t("about.title")}
        </a>
      </div>
      {panel}
    </div>
  );
}
