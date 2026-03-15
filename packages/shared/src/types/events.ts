import type { AgentState } from './agent.js';
import type { SimulationState } from './simulation.js';

export type WsEventType =
  | 'sim:tick'
  | 'sim:state'
  | 'agent:moved'
  | 'agent:action'
  | 'agent:dialogue'
  | 'agent:reflection'
  | 'sim:error';

export interface SimTickPayload {
  tick: number;
  simTime: number;
  agents: Pick<AgentState, 'identity' | 'position' | 'status' | 'currentAction'>[];
}

export interface AgentDialoguePayload {
  agentId: string;
  partnerAgentId: string;
  utterance: string;
  turn: number;
}

export interface AgentReflectionPayload {
  agentId: string;
  insight: string;
}

export interface WsEvent {
  type: WsEventType;
  payload:
    | SimTickPayload
    | SimulationState
    | AgentDialoguePayload
    | AgentReflectionPayload
    | { message: string };
}
