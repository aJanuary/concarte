export interface Room {
  id: string;
  label: string;
  aliases?: string[];
  area: number[][];
}

export interface Map {
  src: string;
  rooms: Room[];
}

export interface Config {
  map: Map;
}