import type { AgentState, AgentIdentity } from '@town/shared';
import { getDb } from './connection.js';

interface AgentRow {
  id: string;
  name: string;
  age: number;
  occupation: string;
  traits: string;
  goals: string;
  home_location_id: string;
  biography: string;
  position_x: number;
  position_y: number;
  status: string;
  current_action: string;
  current_plan: string | null;
  importance_accumulator: number;
  last_reflection_at: number;
  conversation_partner: string | null;
  created_at: number;
}

function rowToState(row: AgentRow): AgentState {
  return {
    identity: {
      id: row.id,
      name: row.name,
      age: row.age,
      occupation: row.occupation,
      traits: JSON.parse(row.traits),
      goals: JSON.parse(row.goals),
      homeLocationId: row.home_location_id,
      biography: row.biography,
    },
    position: { x: row.position_x, y: row.position_y },
    status: row.status as AgentState['status'],
    currentAction: JSON.parse(row.current_action),
    currentPlan: row.current_plan ? JSON.parse(row.current_plan) : null,
    importanceAccumulator: row.importance_accumulator,
    lastReflectionAt: row.last_reflection_at,
    conversationPartner: row.conversation_partner ?? undefined,
  };
}

export const agentRepo = {
  insert(identity: AgentIdentity, spawnX: number, spawnY: number): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO agents
        (id, name, age, occupation, traits, goals, home_location_id, biography,
         position_x, position_y, status, current_action, importance_accumulator,
         last_reflection_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idle', '{"type":"stay","description":"Just arrived"}', 0, 0, ?)
    `).run(
      identity.id, identity.name, identity.age, identity.occupation,
      JSON.stringify(identity.traits), JSON.stringify(identity.goals),
      identity.homeLocationId, identity.biography,
      spawnX, spawnY, Date.now()
    );
  },

  findAll(): AgentState[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM agents').all() as AgentRow[];
    return rows.map(rowToState);
  },

  findById(id: string): AgentState | undefined {
    const db = getDb();
    const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRow | undefined;
    return row ? rowToState(row) : undefined;
  },

  update(state: AgentState): void {
    const db = getDb();
    db.prepare(`
      UPDATE agents SET
        position_x = ?, position_y = ?, status = ?,
        current_action = ?, current_plan = ?,
        importance_accumulator = ?, last_reflection_at = ?,
        conversation_partner = ?
      WHERE id = ?
    `).run(
      state.position.x, state.position.y, state.status,
      JSON.stringify(state.currentAction),
      state.currentPlan ? JSON.stringify(state.currentPlan) : null,
      state.importanceAccumulator, state.lastReflectionAt,
      state.conversationPartner ?? null,
      state.identity.id
    );
  },

  deleteAll(): void {
    getDb().prepare('DELETE FROM agents').run();
  },

  count(): number {
    const row = getDb().prepare('SELECT COUNT(*) as c FROM agents').get() as { c: number };
    return row.c;
  },
};
