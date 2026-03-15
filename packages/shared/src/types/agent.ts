import type { Position } from './map.js';
import type { SimTime } from './simulation.js';

export interface AgentIdentity {
  id: string;
  name: string;
  age: number;
  occupation: string;
  traits: string[];             // e.g. ['curious', 'friendly', 'creative']
  goals: string[];              // e.g. ['write a novel', 'meet new people']
  homeLocationId: string;
  biography: string;
}

export interface PlannedAction {
  startTime: SimTime;           // sim time when action starts
  duration: number;             // in sim minutes
  description: string;
  locationId: string;
}

export interface DailyPlan {
  date: string;                 // 'YYYY-MM-DD' in sim time
  hourlyPlan: string[];         // 24-element array, one description per hour
  currentActions: PlannedAction[]; // decomposed current-hour actions
  lastDecomposedHour: number;   // which hour was last decomposed
}

export type AgentStatus = 'idle' | 'moving' | 'acting' | 'conversing' | 'sleeping';

export interface AgentAction {
  type: 'move' | 'stay' | 'converse' | 'sleep';
  description: string;
  targetPosition?: Position;
  targetAgentId?: string;
  completesAt?: SimTime;
}

export interface AgentState {
  identity: AgentIdentity;
  position: Position;
  currentAction: AgentAction;
  currentPlan: DailyPlan | null;
  status: AgentStatus;
  importanceAccumulator: number; // triggers reflection at >= threshold
  lastReflectionAt: SimTime;
  conversationPartner?: string;  // agentId
}
