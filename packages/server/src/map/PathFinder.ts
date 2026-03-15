import type { Position } from '@town/shared';
import type { WorldMap } from './WorldMap.js';

interface Node {
  pos: Position;
  g: number;  // cost from start
  h: number;  // heuristic to goal
  f: number;  // g + h
  parent: Node | null;
}

function heuristic(a: Position, b: Position): number {
  // Manhattan distance
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(p: Position): string {
  return `${p.x},${p.y}`;
}

export class PathFinder {
  constructor(private map: WorldMap) {}

  findPath(start: Position, goal: Position): Position[] {
    if (!this.map.isWalkable(goal.x, goal.y)) {
      // Try to find nearest walkable tile to goal
      const alt = this.findNearestWalkable(goal);
      if (!alt) return [];
      return this.findPath(start, alt);
    }

    if (start.x === goal.x && start.y === goal.y) return [start];

    const open = new Map<string, Node>();
    const closed = new Set<string>();

    const startNode: Node = {
      pos: start, g: 0, h: heuristic(start, goal),
      f: heuristic(start, goal), parent: null,
    };
    open.set(posKey(start), startNode);

    let iterations = 0;
    const MAX_ITER = 900; // 30x30 grid

    while (open.size > 0 && iterations++ < MAX_ITER) {
      // Find node with lowest f
      let current: Node | null = null;
      for (const node of open.values()) {
        if (!current || node.f < current.f) current = node;
      }
      if (!current) break;

      if (current.pos.x === goal.x && current.pos.y === goal.y) {
        return reconstructPath(current);
      }

      open.delete(posKey(current.pos));
      closed.add(posKey(current.pos));

      for (const neighbor of this.map.getNeighbors(current.pos)) {
        const key = posKey(neighbor);
        if (closed.has(key)) continue;

        const g = current.g + 1;
        const existing = open.get(key);
        if (!existing || g < existing.g) {
          const h = heuristic(neighbor, goal);
          const node: Node = { pos: neighbor, g, h, f: g + h, parent: current };
          open.set(key, node);
        }
      }
    }

    return []; // no path found
  }

  private findNearestWalkable(pos: Position): Position | null {
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = pos.x + dx;
          const ny = pos.y + dy;
          if (this.map.isWalkable(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }
}

function reconstructPath(node: Node): Position[] {
  const path: Position[] = [];
  let current: Node | null = node;
  while (current) {
    path.unshift(current.pos);
    current = current.parent;
  }
  return path;
}
