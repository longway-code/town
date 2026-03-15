import type { Tile, TileType, WorldMapData, Position } from '@town/shared';
import { LOCATIONS } from './locations.js';

const MAP_WIDTH = 30;
const MAP_HEIGHT = 30;

function makeTile(type: TileType, locationId?: string): Tile {
  const walkable = type !== 'wall' && type !== 'water';
  return { type, walkable, locationId };
}

function buildBaseGrid(): Tile[][] {
  // Initialize with grass
  const grid: Tile[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => makeTile('grass'))
  );

  // Add outer walls
  for (let x = 0; x < MAP_WIDTH; x++) {
    grid[0]![x] = makeTile('wall');
    grid[MAP_HEIGHT - 1]![x] = makeTile('wall');
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    grid[y]![0] = makeTile('wall');
    grid[y]![MAP_WIDTH - 1] = makeTile('wall');
  }

  // Add paths (horizontal and vertical roads)
  // Horizontal road at y=9-10
  for (let x = 1; x < MAP_WIDTH - 1; x++) {
    grid[9]![x] = makeTile('path');
    grid[10]![x] = makeTile('path');
  }
  // Vertical road at x=9-10
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    grid[y]![9] = makeTile('path');
    grid[y]![10] = makeTile('path');
  }
  // Vertical road at x=19-20
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    grid[y]![19] = makeTile('path');
    grid[y]![20] = makeTile('path');
  }
  // Horizontal road at y=19-20
  for (let x = 1; x < MAP_WIDTH - 1; x++) {
    grid[19]![x] = makeTile('path');
    grid[20]![x] = makeTile('path');
  }

  return grid;
}

function applyLocations(grid: Tile[][]): void {
  for (const loc of LOCATIONS) {
    const { x, y, width, height } = loc.bounds;
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (ty >= 0 && ty < MAP_HEIGHT && tx >= 0 && tx < MAP_WIDTH) {
          const isEdge = dx === 0 || dx === width - 1 || dy === 0 || dy === height - 1;
          if (isEdge) {
            // Check if it's a door position (middle of each edge)
            const isMidX = dx === Math.floor(width / 2);
            const isMidY = dy === Math.floor(height / 2);
            if (isMidX || isMidY) {
              grid[ty]![tx] = makeTile('door', loc.id);
            } else {
              grid[ty]![tx] = makeTile('wall');
            }
          } else {
            grid[ty]![tx] = makeTile('floor', loc.id);
          }
        }
      }
    }
  }
}

let worldMapInstance: WorldMap | null = null;

export class WorldMap {
  readonly width = MAP_WIDTH;
  readonly height = MAP_HEIGHT;
  readonly tiles: Tile[][];

  constructor() {
    this.tiles = buildBaseGrid();
    applyLocations(this.tiles);
  }

  static getInstance(): WorldMap {
    if (!worldMapInstance) worldMapInstance = new WorldMap();
    return worldMapInstance;
  }

  getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[y]![x] ?? null;
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.walkable ?? false;
  }

  getNeighbors(pos: Position): Position[] {
    const dirs = [
      { x: 0, y: -1 }, { x: 0, y: 1 },
      { x: -1, y: 0 }, { x: 1, y: 0 },
    ];
    return dirs
      .map(d => ({ x: pos.x + d.x, y: pos.y + d.y }))
      .filter(p => this.isWalkable(p.x, p.y));
  }

  toData(): WorldMapData {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      locations: LOCATIONS,
    };
  }
}
