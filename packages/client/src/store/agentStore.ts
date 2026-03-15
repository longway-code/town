import { create } from 'zustand';
import type { AgentState, MemoryEntry } from '@town/shared';

interface AgentStore {
  agents: AgentState[];
  selectedAgentId: string | null;
  agentMemories: MemoryEntry[];
  setAgents: (agents: AgentState[]) => void;
  updateAgent: (agent: Pick<AgentState, 'identity' | 'position' | 'status' | 'currentAction'>) => void;
  selectAgent: (id: string | null) => void;
  loadMemories: (agentId: string) => Promise<void>;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  selectedAgentId: null,
  agentMemories: [],

  setAgents: (agents) => set({ agents }),

  updateAgent: (partial) =>
    set((state) => ({
      agents: state.agents.map(a =>
        a.identity.id === partial.identity.id
          ? { ...a, position: partial.position, status: partial.status, currentAction: partial.currentAction }
          : a
      ),
    })),

  selectAgent: (id) => {
    set({ selectedAgentId: id, agentMemories: [] });
    if (id) {
      useAgentStore.getState().loadMemories(id);
    }
  },

  loadMemories: async (agentId: string) => {
    // Fetch each type separately so dialogue doesn't crowd out observation/reflection
    const [all, obs, ref] = await Promise.all([
      fetch(`/api/memories/${agentId}?limit=20&type=dialogue`).then(r => r.json()),
      fetch(`/api/memories/${agentId}?limit=20&type=observation`).then(r => r.json()),
      fetch(`/api/memories/${agentId}?limit=20&type=reflection`).then(r => r.json()),
    ]) as [MemoryEntry[], MemoryEntry[], MemoryEntry[]];
    // Merge and sort by time desc
    const merged = [...all, ...obs, ...ref].sort((a, b) => b.createdAt - a.createdAt);
    set({ agentMemories: merged });
  },
}));
