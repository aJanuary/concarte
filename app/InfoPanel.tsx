import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import Markdown from "react-markdown";
import { Room } from "./config.types";
import { useTranslations } from "next-intl";
import { dedent } from "./text-utils";

interface InfoPanelProps {
  room?: Room;
  expanded: boolean;
  onInfoPanelExpandChange?: (expanded: boolean) => void;
}

export default function InfoPanel({
  room,
  expanded,
  onInfoPanelExpandChange,
}: InfoPanelProps) {
  let panel = <></>;
  if (room) {
    const onPanelClick = () => {
      if (room.description) {
        onInfoPanelExpandChange && onInfoPanelExpandChange(!expanded);
      }
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
      <div className="relative text-left bg-background p-4 pt-6 shadow-top">
        <header
          className={`${expanded && room.description ? "border-1 border-b border-border pb-2" : ""} ${room.description ? "cursor-pointer" : ""}`}
          onClick={onPanelClick}
        >
          <p className="absolute left-0 right-0 top-0">{icon}</p>
          <h1 className="text-xl">{room.label}</h1>
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
      <div className="inline-block bg-background shadow-xl rounded m-2 border border-border opacity-75 hover:opacity-100">
        <a href="/about" className="inline-block p-2">
          {t("about.title")}
        </a>
      </div>
      {panel}
    </div>
  );
}
