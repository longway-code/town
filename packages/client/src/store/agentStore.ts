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
    const res = await fetch(`/api/memories/${agentId}?limit=30`);
    const memories = await res.json() as MemoryEntry[];
    set({ agentMemories: memories });
  },
}));
