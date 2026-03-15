import { Router } from 'express';
import { WorldMap } from '../../map/WorldMap.js';

export function createMapRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const map = WorldMap.getInstance();
    res.json(map.toData());
  });

  return router;
}
