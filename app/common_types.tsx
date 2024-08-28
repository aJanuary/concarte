export interface Room {
  id: string;
  label: string;
  aliases?: string[];
  description?: string;
  area: number[][];
}

export interface Map {
  src: string;
  rooms: Room[];
}

export interface Theme {
  [key: string]: string;
}

export interface Config {
  theme: Theme;
  map: Map;
}