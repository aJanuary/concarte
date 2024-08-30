import { Room } from "./common_types";
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid'
import Markdown from 'react-markdown';

interface InfoPanelProps {
  room: Room;
  expanded: boolean;
  onInfoPanelExpandChange?: (expanded: boolean) => void;
}

const dedent = (str: string) => {
  const lines = str.trimEnd().split('\n');
  if (lines.length == 0) {
    return str;
  }
  let firstNonEmptyLine = 0;
  while (firstNonEmptyLine < lines.length && lines[firstNonEmptyLine].trim() === '') {
    firstNonEmptyLine++;
  }
  const indent = lines[firstNonEmptyLine].match(/^\s*/)![0];
  return lines.slice(firstNonEmptyLine).map(line => line.replace(new RegExp("^" + indent), '')).join('\n');
}

export default function InfoPanel({ room, expanded, onInfoPanelExpandChange }: InfoPanelProps) {
  const onPanelClick = () => {
    if (room.description) {
      onInfoPanelExpandChange && onInfoPanelExpandChange(!expanded);
    }
  }

  let icon;
  if (!room.description) {
    icon = <ChevronUpIcon className="size-6 m-auto stroke-disabled fill-disabled" />;
  } else if (expanded) {
    icon = <ChevronDownIcon className="size-6 m-auto" />;
  } else {
    icon = <ChevronUpIcon className="size-6 m-auto" />;
  }

  return <div className="absolute bottom-0 left-0 right-0 p-4 pt-6 shadow-top bg-background">
    <header className={`${(expanded && room.description) ? 'pb-2 border-border border-1 border-b' : ''} ${room.description ? 'cursor-pointer' : ''}`} onClick={onPanelClick}>
      <p className="absolute top-0 left-0 right-0">{ icon }</p>
      <h1 className="text-xl">{room.label}</h1>
      <h2 className="text-secondary-text">{room.aliases?.join(', ')}</h2>
    </header>
    {(expanded && room.description) && <div className="pt-2 max-h-72 overflow-y-auto prose prose-default max-w-none">
      <Markdown
        components={{
          h1: 'h3',
          h2: 'h4',
          h3: 'h5',
          h4: 'h6',
          h5: 'h6',
        }}
      >{dedent(room.description)}</Markdown>
    </div>}
  </div>
}