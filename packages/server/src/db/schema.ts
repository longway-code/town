import type Database from 'better-sqlite3';

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      occupation TEXT NOT NULL,
      traits TEXT NOT NULL,       -- JSON array
      goals TEXT NOT NULL,        -- JSON array
      home_location_id TEXT NOT NULL,
      biography TEXT NOT NULL,
      position_x INTEGER NOT NULL DEFAULT 15,
      position_y INTEGER NOT NULL DEFAULT 15,
      status TEXT NOT NULL DEFAULT 'idle',
      current_action TEXT NOT NULL DEFAULT '{}', -- JSON
      current_plan TEXT,                          -- JSON or NULL
      importance_accumulator REAL NOT NULL DEFAULT 0,
      last_reflection_at INTEGER NOT NULL DEFAULT 0,
      conversation_partner TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,         -- observation | reflection | dialogue
      content TEXT NOT NULL,
      importance REAL NOT NULL DEFAULT 5,
      created_at INTEGER NOT NULL,
      embedding BLOB,             -- Float32Array serialized as Buffer
      linked_memory_ids TEXT,     -- JSON array
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );

    CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
    CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);

    CREATE TABLE IF NOT EXISTS simulation_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
