import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fileURLToPath } from 'url';
import { AgentManager } from './agent/AgentManager.js';
import { getDb } from './db/connection.js';
import { logger } from './utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seed(): Promise<void> {
  // Ensure DB is initialized
  getDb();

  const agentManager = new AgentManager();
  agentManager.loadFromDb();

  if (agentManager.getAgentCount() > 0) {
    logger.info({ count: agentManager.getAgentCount() }, 'Agents already seeded, skipping');
    return;
  }

  const seedPath = join(__dirname, '..', 'seed', 'agents.seed.json');
  const seedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as Array<{
    name: string;
    age: number;
    occupation: string;
    traits: string[];
    goals: string[];
    homeLocationId: string;
    biography: string;
  }>;

  for (const agentData of seedData) {
    const state = agentManager.createAgent(agentData);
    logger.info({ name: state.identity.name }, 'Agent seeded');
  }

  logger.info({ count: seedData.length }, 'Seeding complete');
}

seed().catch(err => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
