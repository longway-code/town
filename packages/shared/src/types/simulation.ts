export type SimTime = number; // Unix timestamp in sim world

export interface SimulationConfig {
  tickIntervalMs: number;       // real-time ms per tick
  simMinutesPerTick: number;    // sim minutes advanced per tick
  maxAgents: number;
  dialogueProbability: number;  // 0–1, per co-located tick
  reflectionThreshold: number;  // importance accumulator threshold
}

export interface SimulationState {
  status: 'idle' | 'running' | 'paused';
  tick: number;
  simTime: SimTime;             // sim world unix timestamp
  config: SimulationConfig;
  agentCount: number;
  startedAt?: number;           // real wall-clock time
}

export const DEFAULT_CONFIG: SimulationConfig = {
  tickIntervalMs: 1000,
  simMinutesPerTick: 5,
  maxAgents: 25,
  dialogueProbability: 0.2,
  reflectionThreshold: 150,
};

// Retrieval scoring weights (must sum to 1)
export const RETRIEVAL_WEIGHTS = {
  recency: 1 / 3,
  importance: 1 / 3,
  relevance: 1 / 3,
} as const;

export const RECENCY_DECAY = 0.995; // per sim-minute
