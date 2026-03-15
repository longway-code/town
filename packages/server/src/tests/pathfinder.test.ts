import { describe, it, expect } from 'vitest';
import { PathFinder } from '../map/PathFinder.js';
import type { WorldMap } from '../map/WorldMap.js';
import type { Tile, Position } from '@town/shared';

// Minimal mock map
function mockMap(walkable: boolean[][]): WorldMap {
  const width = walkable[0]?.length ?? 0;
  const height = walkable.length;
  const tiles: Tile[][] = walkable.map(row =>
    row.map(w => ({ type: w ? 'floor' : 'wall', walkable: w }))
  );
  return {
    width, height, tiles,
    getTile: (x: number, y: number) => tiles[y]?.[x] ?? null,
    isWalkable: (x: number, y: number) => tiles[y]?.[x]?.walkable ?? false,
    getNeighbors: (pos: Position) => {
      const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
      return dirs.map(d => ({ x: pos.x + d.x, y: pos.y + d.y }))
        .filter(p => tiles[p.y]?.[p.x]?.walkable ?? false);
    },
    toData: () => ({ width, height, tiles, locations: [] }),
  } as unknown as WorldMap;
}

describe('PathFinder', () => {
  it('finds direct path on open grid', () => {
    const map = mockMap([
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ]);
    const pf = new PathFinder(map);
    const path = pf.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 2, y: 2 });
  });

  it('navigates around a wall', () => {
    const map = mockMap([
      [true,  true,  true],
      [true,  false, true],
      [true,  true,  true],
    ]);
    const pf = new PathFinder(map);
    const path = pf.findPath({ x: 0, y: 1 }, { x: 2, y: 1 });
    expect(path.length).toBeGreaterThan(0);
    // Path should not include the wall tile
    for (const p of path) {
      expect(!(p.x === 1 && p.y === 1)).toBe(true);
    }
  });

  it('returns empty path when goal is unreachable', () => {
    const map = mockMap([
      [true,  false],
      [false, true ],
    ]);
    const pf = new PathFinder(map);
    const path = pf.findPath({ x: 0, y: 0 }, { x: 1, y: 1 });
    expect(path).toEqual([]);
  });

  it('returns single-element path when start equals goal', () => {
    const map = mockMap([[true, true], [true, true]]);
    const pf = new PathFinder(map);
    const path = pf.findPath({ x: 0, y: 0 }, { x: 0, y: 0 });
    expect(path).toEqual([{ x: 0, y: 0 }]);
  });
});
