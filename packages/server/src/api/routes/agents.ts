import { Router } from 'express';
import type { AgentManager } from '../../agent/AgentManager.js';

export function createAgentsRouter(agentManager: AgentManager): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(agentManager.getAllStates());
  });

  router.get('/:id', (req, res) => {
    const agent = agentManager.getAgent(req.params['id']!);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    return res.json(agent.state);
  });

  router.post('/', (req, res) => {
    try {
      const state = agentManager.createAgent(req.body);
      res.status(201).json(state);
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  return router;
}
