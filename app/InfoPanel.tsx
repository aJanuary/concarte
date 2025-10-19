import {
  ChevronUpIcon,
  ChevronDownIcon,
  ViewfinderCircleIcon,
} from "@heroicons/react/24/solid";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { Room } from "./config.types";
import { useTranslations } from "next-intl";
import { dedent } from "./text-utils";
import Link from "next/link";

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
  const t = useTranslations();

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
      icon = <ChevronUpIcon className="fill-disabled stroke-disabled size-6" />;
    } else if (expanded) {
      icon = <ChevronDownIcon className="size-6" />;
    } else {
      icon = <ChevronUpIcon className="size-6" />;
    }

    panel = (
      <div
        className={`bg-background shadow-top pointer-events-auto relative p-4 text-left ${room.description ? "pt-10" : "pt-6"}`}
      >
        <header
          className={`${expanded && room.description ? "border-border border-b pb-2" : ""} ${room.description ? "cursor-pointer" : ""}`}
          onClick={handlePanelClick}
        >
          <p className="absolute top-0 right-0 left-0 flex flex-col items-center leading-none">
            {icon}
            {room.description && (
              <span className="text-secondary-text text-xs leading-none">
                {expanded
                  ? t("infoPanel.hideDetails")
                  : t("infoPanel.showDetails")}
              </span>
            )}
          </p>
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
                a: ({ href, children, ...props }) => {
                  // Use Next.js Link for internal links, regular <a> for external
                  if (href && href.startsWith("/")) {
                    return (
                      <Link href={href} {...props}>
                        {children}
                      </Link>
                    );
                  }
                  return (
                    <a href={href} {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {dedent(room.description)}
            </Markdown>
            {room.link && (
              <p>
                <a
                  href={room.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {room.link.title}
                </a>
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute right-0 bottom-0 left-0 text-right">
      <div className="border-border bg-background m-2 inline-block rounded border opacity-75 shadow-xl hover:opacity-100">
        <a href="/about" className="pointer-events-auto inline-block p-2">
          {t("about.title")}
        </a>
      </div>
      {panel}
    </div>
  );
}
