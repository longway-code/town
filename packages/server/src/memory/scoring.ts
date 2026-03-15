import type { MemoryEntry, ScoredMemory } from '@town/shared';
import { RETRIEVAL_WEIGHTS, RECENCY_DECAY } from '@town/shared';
import { cosineSimilarity } from './embeddings.js';

export function scoreMemory(
  memory: MemoryEntry,
  queryEmbedding: number[],
  currentSimTime: number,
  maxImportance = 10
): ScoredMemory {
  // Recency: exponential decay based on sim-time minutes elapsed
  const minutesElapsed = Math.max(0, (currentSimTime - memory.createdAt) / 60000);
  const recencyScore = Math.pow(RECENCY_DECAY, minutesElapsed);

  // Importance: normalize from 1–10 to 0–1
  const importanceScore = (memory.importance - 1) / (maxImportance - 1);

  // Relevance: cosine similarity (0 if no embedding)
  const relevanceScore = memory.embedding && queryEmbedding.length > 0
    ? Math.max(0, cosineSimilarity(memory.embedding, queryEmbedding))
    : 0;

  const totalScore =
    RETRIEVAL_WEIGHTS.recency * recencyScore +
    RETRIEVAL_WEIGHTS.importance * importanceScore +
    RETRIEVAL_WEIGHTS.relevance * relevanceScore;

  return { memory, recencyScore, importanceScore, relevanceScore, totalScore };
}

export function rankMemories(
  memories: MemoryEntry[],
  queryEmbedding: number[],
  currentSimTime: number,
  topK: number
): ScoredMemory[] {
  const scored = memories.map(m => scoreMemory(m, queryEmbedding, currentSimTime));
  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored.slice(0, topK);
}
