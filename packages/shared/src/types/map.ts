export interface Position {
  x: number;
  y: number;
}

export type TileType = 'floor' | 'wall' | 'door' | 'grass' | 'path' | 'water';

export interface Tile {
  type: TileType;
  walkable: boolean;
  locationId?: string;          // which named location this tile belongs to
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  bounds: BoundingBox;
  spawnPoints: Position[];
}

export interface WorldMapData {
  width: number;
  height: number;
  tiles: Tile[][];              // [y][x]
  locations: Location[];
}
