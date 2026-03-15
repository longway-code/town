import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseDailyPlan, parseDecomposedActions } from '../llm/prompts/planning.js';
import { parseReflections } from '../llm/prompts/reflection.js';
import { parseImportance } from '../llm/prompts/dialogue.js';

describe('LLM prompt parsers', () => {
  describe('parseDailyPlan', () => {
    it('parses 24-line output correctly', () => {
      const raw = Array.from({ length: 24 }, (_, i) =>
        `${String(i).padStart(2, '0')}:00 - Action at hour ${i}`
      ).join('\n');
      const plan = parseDailyPlan(raw);
      expect(plan).toHaveLength(24);
      expect(plan[0]).toBe('Action at hour 0');
      expect(plan[23]).toBe('Action at hour 23');
    });

    it('fills missing hours with default', () => {
      const raw = '06:00 - Morning coffee\n12:00 - Lunch';
      const plan = parseDailyPlan(raw);
      expect(plan).toHaveLength(24);
      expect(plan[6]).toBe('Morning coffee');
      expect(plan[12]).toBe('Lunch');
      expect(plan[0]).toBe('idle at home'); // default
    });
  });

  describe('parseDecomposedActions', () => {
    it('parses valid JSON array', () => {
      const raw = JSON.stringify([
        { startMinute: 0, duration: 30, description: 'Reading', locationId: 'library' },
        { startMinute: 30, duration: 30, description: 'Note-taking', locationId: 'library' },
      ]);
      const actions = parseDecomposedActions(raw, 'home');
      expect(actions).toHaveLength(2);
      expect(actions[0]!.description).toBe('Reading');
    });

    it('falls back to single action on invalid JSON', () => {
      const actions = parseDecomposedActions('not json at all', 'home');
      expect(actions).toHaveLength(1);
      expect(actions[0]!.locationId).toBe('home');
    });
  });

  describe('parseReflections', () => {
    it('extracts 3 insights', () => {
      const raw = `1. Alice tends to visit the library often.
2. She values quiet and solitude for her work.
3. Her writing improves when she observes others.`;
      const reflections = parseReflections(raw);
      expect(reflections).toHaveLength(3);
      expect(reflections[0]).toContain('library');
    });
  });

  describe('parseImportance', () => {
    it('parses integer from response', () => {
      expect(parseImportance('7')).toBe(7);
      expect(parseImportance('The importance is 8.')).toBe(8);
      expect(parseImportance('10')).toBe(10);
    });

    it('returns 5 as default on invalid input', () => {
      expect(parseImportance('unknown')).toBe(5);
    });
  });
});
