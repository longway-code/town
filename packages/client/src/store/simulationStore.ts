import { create } from 'zustand';
import type { SimulationState } from '@town/shared';

interface SimulationStore {
  simulation: SimulationState | null;
  setSimulation: (sim: SimulationState) => void;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  reset: () => Promise<void>;
  updateSpeed: (tickIntervalMs: number) => Promise<void>;
}

const API = '/api/simulation';

export const useSimulationStore = create<SimulationStore>((set) => ({
  simulation: null,

  setSimulation: (simulation) => set({ simulation }),

  start: async () => {
    const res = await fetch(`${API}/start`, { method: 'POST' });
    set({ simulation: await res.json() as SimulationState });
  },

  pause: async () => {
    const res = await fetch(`${API}/pause`, { method: 'POST' });
    set({ simulation: await res.json() as SimulationState });
  },

  reset: async () => {
    const res = await fetch(`${API}/reset`, { method: 'POST' });
    set({ simulation: await res.json() as SimulationState });
  },

  updateSpeed: async (tickIntervalMs: number) => {
    const res = await fetch(`${API}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickIntervalMs }),
    });
    set({ simulation: await res.json() as SimulationState });
  },
}));
