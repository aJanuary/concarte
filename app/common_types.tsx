export interface Room {
  id: string;
  label: string;
  aliases?: string[];
  area: number[][];
}

export interface Level {
  name: string;
  src: string;
  rooms: Room[];
}

export interface Config {
  levels: Level[];
}