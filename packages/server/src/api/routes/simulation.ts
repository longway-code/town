import { Router } from 'express';
import type { SimulationEngine } from '../../simulation/SimulationEngine.js';

export function createSimulationRouter(engine: SimulationEngine): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json(engine.getState());
  });

  router.post('/start', (_req, res) => {
    engine.start();
    res.json(engine.getState());
  });

  router.post('/pause', (_req, res) => {
    engine.pause();
    res.json(engine.getState());
  });

  router.post('/resume', (_req, res) => {
    engine.resume();
    res.json(engine.getState());
  });

  router.post('/reset', (_req, res) => {
    engine.reset();
    res.json(engine.getState());
  });

  router.patch('/config', (req, res) => {
    const { tickIntervalMs, simMinutesPerTick, dialogueProbability } = req.body as Record<string, number>;
    engine.updateConfig({
      ...(tickIntervalMs !== undefined && { tickIntervalMs }),
      ...(simMinutesPerTick !== undefined && { simMinutesPerTick }),
      ...(dialogueProbability !== undefined && { dialogueProbability }),
    });
    res.json(engine.getState());
  });

  return router;
}
