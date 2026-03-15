import { Router } from 'express';
import { memoryRepo } from '../../db/memoryRepo.js';

export function createMemoriesRouter(): Router {
  const router = Router();

  router.get('/:agentId', (req, res) => {
    const limit = parseInt(String(req.query['limit'] ?? '50'), 10);
    const memories = memoryRepo.findByAgentId(req.params['agentId']!, limit);
    res.json(memories);
  });

  return router;
}
