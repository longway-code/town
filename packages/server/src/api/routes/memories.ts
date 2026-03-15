import { Router } from 'express';
import { memoryRepo } from '../../db/memoryRepo.js';

export function createMemoriesRouter(): Router {
  const router = Router();

  router.get('/:agentId', (req, res) => {
    const limit = parseInt(String(req.query['limit'] ?? '50'), 10);
    const type = req.query['type'] as string | undefined;
    const memories = memoryRepo.findByAgentId(req.params['agentId']!, limit, type);
    res.json(memories);
  });

  return router;
}
