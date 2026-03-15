import { create } from 'zustand';
import type { AgentDialoguePayload } from '@town/shared';

interface DialogueMessage {
  agentId: string;
  partnerAgentId: string;
  utterance: string;
  turn: number;
  timestamp: number;
}

interface WsStore {
  connected: boolean;
  dialogues: DialogueMessage[];
  setConnected: (v: boolean) => void;
  addDialogue: (msg: Omit<DialogueMessage, 'timestamp'>) => void;
  clearOldDialogues: () => void;
}

export const useWsStore = create<WsStore>((set) => ({
  connected: false,
  dialogues: [],

  setConnected: (connected) => set({ connected }),

  addDialogue: (msg) =>
    set((state) => ({
      dialogues: [...state.dialogues.slice(-20), { ...msg, timestamp: Date.now() }],
    })),

  clearOldDialogues: () =>
    set((state) => ({
      dialogues: state.dialogues.filter(d => Date.now() - d.timestamp < 10000),
    })),
}));
