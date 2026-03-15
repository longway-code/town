import BetterSqlite3 from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { initSchema } from './schema.js';

let db: BetterSqlite3.Database | null = null;

export function getDb(): BetterSqlite3.Database {
  if (!db) {
    const dbPath = process.env['DB_PATH'] ?? './data/town.db';
    mkdirSync(dirname(dbPath), { recursive: true });
    db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
