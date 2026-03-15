import { v4 as uuidv4 } from 'uuid';
import type { MemoryEntry, RetrievalQuery, ScoredMemory } from '@town/shared';
import { memoryRepo } from '../db/memoryRepo.js';
import { embed } from './embeddings.js';
import { rankMemories } from './scoring.js';
import { getLLMProvider } from '../llm/provider.js';
import { buildImportancePrompt, parseImportance } from '../llm/prompts/dialogue.js';
import { logger } from '../utils/logger.js';

// Only score importance for dialogue and reflection, not every observation
const SCORE_TYPES: MemoryEntry['type'][] = ['dialogue', 'reflection'];
const IMPORTANCE_BATCH_SIZE = 3;
const BATCH_DELAY_MS = 5000; // 5s between batches to avoid rate limits

interface PendingImportance {
  memoryId: string;
  content: string;
}

const importanceQueue: PendingImportance[] = [];
let importanceBatchTimeout: ReturnType<typeof setTimeout> | null = null;

async function scoreWithRetry(
  memoryId: string,
  content: string,
  retries = 2
): Promise<void> {
  const provider = getLLMProvider();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await provider.complete({
        messages: [{ role: 'user', content: buildImportancePrompt(content) }],
        maxTokens: 10,
        temperature: 0,
      });
      memoryRepo.updateImportance(memoryId, parseImportance(resp.content));
      return;
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < retries) {
        const delay = 10000 * (attempt + 1); // 10s, 20s
        logger.warn({ memoryId, attempt, delay }, 'Rate limited on importance scoring, retrying');
        await new Promise(r => setTimeout(r, delay));
      } else {
        logger.warn({ err, memoryId }, 'Failed to score importance');
        return;
      }
    }
  }
}

async function flushImportanceBatch(): Promise<void> {
  if (importanceQueue.length === 0) return;
  const batch = importanceQueue.splice(0, IMPORTANCE_BATCH_SIZE);
  // Serial to avoid hammering the rate limit
  for (const { memoryId, content } of batch) {
    await scoreWithRetry(memoryId, content);
  }
}

function scheduleImportanceBatch(): void {
  if (importanceBatchTimeout) return;
  importanceBatchTimeout = setTimeout(async () => {
    importanceBatchTimeout = null;
    await flushImportanceBatch();
    if (importanceQueue.length > 0) scheduleImportanceBatch();
  }, BATCH_DELAY_MS);
}

export class MemoryStream {
  async addMemory(
    agentId: string,
    type: MemoryEntry['type'],
    content: string,
    simTime: number,
    linkedMemoryIds?: string[]
  ): Promise<MemoryEntry> {
    const embedding = await embed(content).catch(() => [] as number[]);
    const entry: MemoryEntry = {
      id: uuidv4(),
      agentId,
      type,
      content,
      importance: 5, // default; updated asynchronously for dialogue/reflection
      createdAt: simTime,
      embedding,
      linkedMemoryIds,
    };
    memoryRepo.insert(entry);

    // Only queue LLM importance scoring for high-value memory types
    if (SCORE_TYPES.includes(type)) {
      importanceQueue.push({ memoryId: entry.id, content });
      scheduleImportanceBatch();
    }

    return entry;
  }

  async retrieve(query: RetrievalQuery): Promise<ScoredMemory[]> {
    const { agentId, queryText, topK = 10, currentSimTime } = query;
    const memories = memoryRepo.findByAgentId(agentId, 300);
    if (memories.length === 0) return [];

    const queryEmbedding = await embed(queryText).catch(() => [] as number[]);
    return rankMemories(memories, queryEmbedding, currentSimTime, topK);
  }

  getRecent(agentId: string, limit = 20): MemoryEntry[] {
    return memoryRepo.findRecent(agentId, limit);
  }

  getTopImportant(agentId: string, limit = 15): MemoryEntry[] {
    return memoryRepo.findTopImportant(agentId, limit);
  }
}
