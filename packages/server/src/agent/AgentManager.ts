import type { AgentIdentity, AgentState, SimulationConfig } from '@town/shared';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from './Agent.js';
import { Planner } from './Planner.js';
import { Reflector } from './Reflector.js';
import { DialogueManager } from './Dialogue.js';
import { MemoryStream } from '../memory/MemoryStream.js';
import { agentRepo } from '../db/agentRepo.js';
import { memoryRepo } from '../db/memoryRepo.js';
import { getRandomSpawnPoint } from '../map/locations.js';
import { logger } from '../utils/logger.js';

export class AgentManager {
  private agents = new Map<string, Agent>();
  private memoryStream: MemoryStream;
  private planner: Planner;
  private reflector: Reflector;
  private dialogue: DialogueManager;

  constructor() {
    this.memoryStream = new MemoryStream();
    this.planner = new Planner(this.memoryStream);
    this.reflector = new Reflector(this.memoryStream);
    this.dialogue = new DialogueManager(this.memoryStream);
  }

  loadFromDb(): void {
    const states = agentRepo.findAll();
    for (const state of states) {
      const agent = new Agent(state, this.memoryStream, this.planner, this.reflector);
      this.agents.set(state.identity.id, agent);
    }
    logger.info({ count: this.agents.size }, 'Agents loaded from DB');
  }

  createAgent(identityData: Omit<AgentIdentity, 'id'>): AgentState {
    const identity: AgentIdentity = { id: uuidv4(), ...identityData };
    const spawn = getRandomSpawnPoint(identity.homeLocationId);
    agentRepo.insert(identity, spawn.x, spawn.y);

    const state: AgentState = {
      identity,
      position: spawn,
      status: 'idle',
      currentAction: { type: 'stay', description: 'Just arrived' },
      currentPlan: null,
      importanceAccumulator: 0,
      lastReflectionAt: 0,
    };
    const agent = new Agent(state, this.memoryStream, this.planner, this.reflector);
    this.agents.set(identity.id, agent);
    return state;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllStates(): AgentState[] {
    return Array.from(this.agents.values()).map(a => a.state);
  }

  getAgentCount(): number {
    return this.agents.size;
  }

  async tick(simTime: number, config: SimulationConfig): Promise<AgentState[]> {
    const agentList = Array.from(this.agents.values());

    // Handle dialogues first
    await this.handleDialogues(agentList, simTime, config);

    // Tick non-conversing agents in parallel
    await Promise.allSettled(
      agentList
        .filter(a => a.state.status !== 'conversing')
        .map(a => a.tick(simTime, config))
    );

    // Find agents at same location for dialogue triggers
    await this.triggerDialogues(agentList, simTime, config);

    return agentList.map(a => a.state);
  }

  private async handleDialogues(
    agents: Agent[],
    simTime: number,
    _config: SimulationConfig
  ): Promise<void> {
    for (const [aId, bId] of this.dialogue.getActivePairs()) {
      const agentA = this.agents.get(aId);
      const agentB = this.agents.get(bId);
      if (!agentA || !agentB) continue;

      const nextSpeakerId = this.dialogue.getNextSpeaker(aId, bId);
      if (!nextSpeakerId) continue;

      const [speaker, listener] = nextSpeakerId === aId
        ? [agentA, agentB]
        : [agentB, agentA];

      const result = await this.dialogue.advanceTurn(speaker.state, listener.state, simTime);
      if (result === null) {
        // Dialogue ended (max turns reached)
        agentA.state.status = 'idle';
        agentB.state.status = 'idle';
        agentA.state.conversationPartner = undefined;
        agentB.state.conversationPartner = undefined;
      }
    }
  }

  private async triggerDialogues(
    agents: Agent[],
    simTime: number,
    config: SimulationConfig
  ): Promise<void> {
    // Group agents by position (within 2 tiles)
    const colocated = new Map<string, Agent[]>();
    for (const agent of agents) {
      if (agent.state.status === 'conversing') continue;
      const key = `${Math.floor(agent.state.position.x / 3)},${Math.floor(agent.state.position.y / 3)}`;
      const group = colocated.get(key) ?? [];
      group.push(agent);
      colocated.set(key, group);
    }

    for (const group of colocated.values()) {
      if (group.length < 2) continue;
      // Try to trigger dialogue between first two idle agents
      const idle = group.filter(a => a.state.status !== 'conversing' && a.state.status !== 'sleeping');
      if (idle.length < 2) continue;

      if (Math.random() < config.dialogueProbability) {
        const [agentA, agentB] = idle;
        if (!agentA || !agentB) continue;
        if (this.dialogue.isInDialogue(agentA.state.identity.id)) continue;
        if (this.dialogue.isInDialogue(agentB.state.identity.id)) continue;

        const started = await this.dialogue.startDialogue(agentA.state, agentB.state);
        if (started) {
          agentA.state.status = 'conversing';
          agentA.state.conversationPartner = agentB.state.identity.id;
          agentB.state.status = 'conversing';
          agentB.state.conversationPartner = agentA.state.identity.id;

          // First turn immediately
          await this.dialogue.advanceTurn(agentA.state, agentB.state, simTime);
        }
      }
    }
  }

  reset(): void {
    this.agents.clear();
    agentRepo.deleteAll();
    memoryRepo.deleteAll();
  }

  getMemoryStream(): MemoryStream {
    return this.memoryStream;
  }

  getDialogueManager(): DialogueManager {
    return this.dialogue;
  }
}
