import { createServer } from 'http';
import express from 'express';
import { AgentManager } from './agent/AgentManager.js';
import { SimulationEngine } from './simulation/SimulationEngine.js';
import { WsServer } from './ws/WsServer.js';
import { createSimulationRouter } from './api/routes/simulation.js';
import { createAgentsRouter } from './api/routes/agents.js';
import { createMemoriesRouter } from './api/routes/memories.js';
import { createMapRouter } from './api/routes/map.js';
import { getDb } from './db/connection.js';
import { logger } from './utils/logger.js';

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

async function main(): Promise<void> {
  // Initialize DB
  getDb();

  // Bootstrap agents
  const agentManager = new AgentManager();
  agentManager.loadFromDb();

  // Simulation engine
  const engine = new SimulationEngine(agentManager);

  // Express app
  const app = express();
  app.use(express.json());

  // CORS for development
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Routes
  app.use('/api/simulation', createSimulationRouter(engine));
  app.use('/api/agents', createAgentsRouter(agentManager));
  app.use('/api/memories', createMemoriesRouter());
  app.use('/api/map', createMapRouter());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // HTTP + WS server
  const server = createServer(app);
  new WsServer(server);

  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    engine.pause();
    server.close(() => process.exit(0));
  });
}

main().catch(err => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
