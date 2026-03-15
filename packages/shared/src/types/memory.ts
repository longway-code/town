import type { SimTime } from './simulation.js';

export type MemoryType = 'observation' | 'reflection' | 'dialogue';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  importance: number;           // 1–10, LLM-scored
  createdAt: SimTime;
  embedding?: number[];
  linkedMemoryIds?: string[];
}

export interface ScoredMemory {
  memory: MemoryEntry;
  recencyScore: number;         // 0–1
  importanceScore: number;      // 0–1 (normalized from 1–10)
  relevanceScore: number;       // 0–1 (cosine similarity)
  totalScore: number;           // weighted sum
}

export interface RetrievalQuery {
  agentId: string;
  queryText: string;
  topK?: number;
  currentSimTime: SimTime;
  minImportance?: number;
}
