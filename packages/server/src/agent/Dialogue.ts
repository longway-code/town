import type { AgentState } from '@town/shared';
import { getLLMProvider } from '../llm/provider.js';
import { buildDialoguePrompt, type DialogueTurn } from '../llm/prompts/dialogue.js';
import { MemoryStream } from '../memory/MemoryStream.js';
import { globalBus } from '../simulation/EventBus.js';
import { logger } from '../utils/logger.js';

const MAX_TURNS = 8;

export class DialogueManager {
  private memoryStream: MemoryStream;
  // Active dialogues: key = sorted agentId pair
  private activeDialogues = new Map<string, { turns: DialogueTurn[]; nextSpeaker: string }>();

  constructor(memoryStream: MemoryStream) {
    this.memoryStream = memoryStream;
  }

  dialogueKey(agentA: string, agentB: string): string {
    return [agentA, agentB].sort().join(':');
  }

  isInDialogue(agentId: string): string | null {
    for (const [key, d] of this.activeDialogues) {
      const [a, b] = key.split(':');
      if ((a === agentId || b === agentId) && d.turns.length > 0) {
        return key;
      }
    }
    return null;
  }

  async startDialogue(agentA: AgentState, agentB: AgentState): Promise<boolean> {
    const key = this.dialogueKey(agentA.identity.id, agentB.identity.id);
    if (this.activeDialogues.has(key)) return false;

    this.activeDialogues.set(key, { turns: [], nextSpeaker: agentA.identity.id });
    logger.info({ agentA: agentA.identity.name, agentB: agentB.identity.name }, 'Dialogue started');
    return true;
  }

  async advanceTurn(
    speaker: AgentState,
    listener: AgentState,
    simTime: number
  ): Promise<string | null> {
    const key = this.dialogueKey(speaker.identity.id, listener.identity.id);
    const dialogue = this.activeDialogues.get(key);
    if (!dialogue) return null;
    if (dialogue.nextSpeaker !== speaker.identity.id) return null;

    // Retrieve relevant memories
    const relevantMems = (await this.memoryStream.retrieve({
      agentId: speaker.identity.id,
      queryText: `conversation with ${listener.identity.name}`,
      topK: 5,
      currentSimTime: simTime,
    })).map(sm => sm.memory);

    let utterance: string;
    try {
      const provider = getLLMProvider();
      const prompt = buildDialoguePrompt(speaker, listener, dialogue.turns, relevantMems);
      const response = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.9,
      });
      utterance = response.content.trim();
      if (!utterance) {
        logger.warn({ agentId: speaker.identity.id }, 'Dialogue LLM returned empty utterance, skipping turn');
        return utterance; // skip storing/emitting empty turn
      }
    } catch (err) {
      logger.warn({ err }, 'Dialogue LLM failed');
      utterance = '我先走了，改天再聊。';
    }

    dialogue.turns.push({ speakerName: speaker.identity.name, utterance });
    dialogue.nextSpeaker = listener.identity.id;

    globalBus.emit('agent:dialogue', {
      agentId: speaker.identity.id,
      partnerAgentId: listener.identity.id,
      utterance,
      turn: dialogue.turns.length,
    });

    // Store as dialogue memory for both agents
    const memContent = `${speaker.identity.name} said to ${listener.identity.name}: "${utterance}"`;
    await this.memoryStream.addMemory(speaker.identity.id, 'dialogue', memContent, simTime);
    await this.memoryStream.addMemory(listener.identity.id, 'dialogue', memContent, simTime);

    // End dialogue after max turns
    if (dialogue.turns.length >= MAX_TURNS) {
      await this.endDialogue(speaker.identity.id, listener.identity.id, simTime);
      return null; // signals dialogue ended
    }

    return utterance;
  }

  async endDialogue(agentAId: string, agentBId: string, simTime: number): Promise<void> {
    const key = this.dialogueKey(agentAId, agentBId);
    const dialogue = this.activeDialogues.get(key);
    if (!dialogue) return;

    this.activeDialogues.delete(key);
    logger.info({ key }, 'Dialogue ended');
  }

  getNextSpeaker(agentAId: string, agentBId: string): string | null {
    const key = this.dialogueKey(agentAId, agentBId);
    return this.activeDialogues.get(key)?.nextSpeaker ?? null;
  }

  getActivePairs(): Array<[string, string]> {
    return Array.from(this.activeDialogues.keys()).map(key => {
      const [a, b] = key.split(':') as [string, string];
      return [a, b];
    });
  }
}
