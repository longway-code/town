import type { MemoryEntry } from '@town/shared';
import { getDb } from './connection.js';

interface MemoryRow {
  id: string;
  agent_id: string;
  type: string;
  content: string;
  importance: number;
  created_at: number;
  embedding: Buffer | null;
  linked_memory_ids: string | null;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    type: row.type as MemoryEntry['type'],
    content: row.content,
    importance: row.importance,
    createdAt: row.created_at,
    embedding: row.embedding
      ? Array.from(new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4))
      : undefined,
    linkedMemoryIds: row.linked_memory_ids ? JSON.parse(row.linked_memory_ids) : undefined,
  };
}

export const memoryRepo = {
  insert(entry: MemoryEntry): void {
    const db = getDb();
    let embeddingBuf: Buffer | null = null;
    if (entry.embedding) {
      const arr = new Float32Array(entry.embedding);
      embeddingBuf = Buffer.from(arr.buffer);
    }
    db.prepare(`
      INSERT INTO memories (id, agent_id, type, content, importance, created_at, embedding, linked_memory_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.agentId, entry.type, entry.content, entry.importance,
      entry.createdAt, embeddingBuf,
      entry.linkedMemoryIds ? JSON.stringify(entry.linkedMemoryIds) : null
    );
  },

  findByAgentId(agentId: string, limit = 200, type?: string): MemoryEntry[] {
    const db = getDb();
    const rows = type
      ? db.prepare('SELECT * FROM memories WHERE agent_id = ? AND type = ? ORDER BY created_at DESC LIMIT ?').all(agentId, type, limit) as MemoryRow[]
      : db.prepare('SELECT * FROM memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?').all(agentId, limit) as MemoryRow[];
    return rows.map(rowToEntry);
  },

  findRecent(agentId: string, limit = 50): MemoryEntry[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM memories WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(agentId, limit) as MemoryRow[];
    return rows.map(rowToEntry);
  },

  findTopImportant(agentId: string, limit = 15): MemoryEntry[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM memories WHERE agent_id = ? ORDER BY importance DESC LIMIT ?'
    ).all(agentId, limit) as MemoryRow[];
    return rows.map(rowToEntry);
  },

  updateImportance(id: string, importance: number): void {
    getDb().prepare('UPDATE memories SET importance = ? WHERE id = ?').run(importance, id);
  },

  deleteByAgentId(agentId: string): void {
    getDb().prepare('DELETE FROM memories WHERE agent_id = ?').run(agentId);
  },

  deleteAll(): void {
    getDb().prepare('DELETE FROM memories').run();
  },
};
