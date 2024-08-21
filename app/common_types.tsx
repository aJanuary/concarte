export interface Room {
  id: string;
  label: string;
  aliases?: string[];
  position: { x: number, y: number };
}

export interface Level {
  name: string;
  src: string;
  rooms: Room[];
}

export interface Config {
  levels: Level[];
}