import { describe, it, expect } from 'vitest';
import { scoreMemory, rankMemories } from '../memory/scoring.js';
import type { MemoryEntry } from '@town/shared';

function makeMemory(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'test-id',
    agentId: 'agent-1',
    type: 'observation',
    content: 'test content',
    importance: 5,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('Memory Scoring', () => {
  it('scores high-importance memory higher than low-importance', () => {
    const simTime = Date.now();
    const high = scoreMemory(makeMemory({ importance: 9, createdAt: simTime }), [], simTime);
    const low = scoreMemory(makeMemory({ importance: 2, createdAt: simTime }), [], simTime);
    expect(high.totalScore).toBeGreaterThan(low.totalScore);
  });

  it('scores recent memory higher than old memory', () => {
    const simTime = Date.now();
    const recent = scoreMemory(makeMemory({ createdAt: simTime - 1000 }), [], simTime);
    const old = scoreMemory(makeMemory({ createdAt: simTime - 1000 * 60 * 60 * 24 }), [], simTime);
    expect(recent.totalScore).toBeGreaterThan(old.totalScore);
  });

  it('normalizes importance to 0–1 range', () => {
    const simTime = Date.now();
    const score = scoreMemory(makeMemory({ importance: 10, createdAt: simTime }), [], simTime);
    expect(score.importanceScore).toBeCloseTo(1.0);

    const score2 = scoreMemory(makeMemory({ importance: 1, createdAt: simTime }), [], simTime);
    expect(score2.importanceScore).toBeCloseTo(0.0);
  });

  it('rankMemories returns top K memories', () => {
    const simTime = Date.now();
    const memories = Array.from({ length: 10 }, (_, i) =>
      makeMemory({ id: `m${i}`, importance: i + 1, createdAt: simTime })
    );
    const ranked = rankMemories(memories, [], simTime, 3);
    expect(ranked.length).toBe(3);
    // Top should be highest importance (9/10 normalized)
    expect(ranked[0]!.memory.importance).toBe(10);
  });
});
