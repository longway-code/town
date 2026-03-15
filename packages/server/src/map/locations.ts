import type { Location } from '@town/shared';

export const LOCATIONS: Location[] = [
  {
    id: 'home',
    name: 'Residential Area',
    description: 'Cozy homes where agents live and sleep',
    bounds: { x: 1, y: 1, width: 8, height: 8 },
    spawnPoints: [
      { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 6, y: 2 },
      { x: 2, y: 4 }, { x: 4, y: 4 }, { x: 6, y: 4 },
      { x: 2, y: 6 }, { x: 4, y: 6 }, { x: 6, y: 6 },
    ],
  },
  {
    id: 'park',
    name: 'Central Park',
    description: 'A peaceful park for relaxation and socializing',
    bounds: { x: 11, y: 1, width: 8, height: 8 },
    spawnPoints: [
      { x: 13, y: 3 }, { x: 15, y: 3 }, { x: 17, y: 3 },
      { x: 13, y: 5 }, { x: 15, y: 5 }, { x: 17, y: 5 },
    ],
  },
  {
    id: 'cafe',
    name: 'Town Cafe',
    description: 'A bustling cafe where locals gather for coffee and conversation',
    bounds: { x: 21, y: 1, width: 7, height: 6 },
    spawnPoints: [
      { x: 23, y: 2 }, { x: 25, y: 2 }, { x: 23, y: 4 }, { x: 25, y: 4 },
    ],
  },
  {
    id: 'library',
    name: 'Public Library',
    description: 'A quiet place for reading and intellectual pursuits',
    bounds: { x: 1, y: 11, width: 8, height: 8 },
    spawnPoints: [
      { x: 3, y: 13 }, { x: 5, y: 13 }, { x: 3, y: 16 }, { x: 5, y: 16 },
    ],
  },
  {
    id: 'town_hall',
    name: 'Town Hall',
    description: 'The civic center of the community',
    bounds: { x: 11, y: 11, width: 8, height: 8 },
    spawnPoints: [
      { x: 13, y: 13 }, { x: 15, y: 13 }, { x: 17, y: 13 },
      { x: 13, y: 16 }, { x: 15, y: 16 },
    ],
  },
  {
    id: 'market',
    name: 'Town Market',
    description: 'A lively marketplace for shopping and trading',
    bounds: { x: 21, y: 11, width: 8, height: 8 },
    spawnPoints: [
      { x: 23, y: 13 }, { x: 25, y: 13 }, { x: 23, y: 16 }, { x: 25, y: 16 },
    ],
  },
];

export const LOCATION_IDS = LOCATIONS.map(l => l.id);

export function getLocationById(id: string): Location | undefined {
  return LOCATIONS.find(l => l.id === id);
}

export function getRandomSpawnPoint(locationId: string): { x: number; y: number } {
  const loc = getLocationById(locationId);
  if (!loc || loc.spawnPoints.length === 0) return { x: 15, y: 15 };
  const idx = Math.floor(Math.random() * loc.spawnPoints.length);
  return loc.spawnPoints[idx]!;
}
