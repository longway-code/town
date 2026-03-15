import type { AgentState, AgentAction, SimulationConfig, PlannedAction } from '@town/shared';
import { WorldMap } from '../map/WorldMap.js';
import { PathFinder } from '../map/PathFinder.js';
import { getLocationById, getRandomSpawnPoint } from '../map/locations.js';
import { MemoryStream } from '../memory/MemoryStream.js';
import { Planner } from './Planner.js';
import { Reflector } from './Reflector.js';
import { agentRepo } from '../db/agentRepo.js';
import { logger } from '../utils/logger.js';

export class Agent {
  state: AgentState;
  private pathFinder: PathFinder;
  private memoryStream: MemoryStream;
  private planner: Planner;
  private reflector: Reflector;
  private currentPath: { x: number; y: number }[] = [];
  private pathIndex = 0;
  private lastObservedLocationId: string | null = null;
  private lastDecisionAt = 0; // simTime of last decideNextAction call

  constructor(
    state: AgentState,
    memoryStream: MemoryStream,
    planner: Planner,
    reflector: Reflector
  ) {
    this.state = state;
    this.memoryStream = memoryStream;
    this.planner = planner;
    this.reflector = reflector;
    const map = WorldMap.getInstance();
    this.pathFinder = new PathFinder(map);
  }

  async tick(simTime: number, config: SimulationConfig): Promise<void> {
    if (this.state.status === 'conversing') return; // handled by AgentManager

    await this.perceive(simTime);
    await this.plan(simTime);
    await this.act(simTime, config);
    await this.maybeReflect(simTime, config);
  }

  private async perceive(simTime: number): Promise<void> {
    const map = WorldMap.getInstance();
    const tile = map.getTile(this.state.position.x, this.state.position.y);
    const locationId = tile?.locationId ?? null;
    // Only write an observation when the agent arrives at a new location
    if (locationId && locationId !== this.lastObservedLocationId) {
      this.lastObservedLocationId = locationId;
      const loc = getLocationById(locationId);
      if (loc) {
        const observation = `${this.state.identity.name} arrived at ${loc.name}`;
        await this.memoryStream.addMemory(
          this.state.identity.id,
          'observation',
          observation,
          simTime
        );
      }
    }
  }

  private async plan(simTime: number): Promise<void> {
    const simDate = new Date(simTime).toISOString().split('T')[0]!;

    // Create daily plan if new day
    if (!this.state.currentPlan || this.state.currentPlan.date !== simDate) {
      try {
        this.state.currentPlan = await this.planner.createDailyPlan(
          this.state, simTime, simDate
        );
        logger.info({ agentId: this.state.identity.id }, 'Daily plan created');
      } catch (err) {
        logger.warn({ err, agentId: this.state.identity.id }, 'Daily plan failed');
      }
    }
  }

  private async act(simTime: number, _config: SimulationConfig): Promise<void> {
    if (!this.state.currentPlan) {
      this.state.status = 'idle';
      return;
    }

    let action = this.planner.getCurrentAction(this.state.currentPlan, simTime);

    // No current action — decide what to do next
    if (!action) {
      // Cold start: no previous decision, send agent to a random non-home location immediately
      if (this.lastDecisionAt === 0) {
        this.lastDecisionAt = simTime;
        const locations = ['park', 'cafe', 'library', 'town_hall', 'market'];
        const randomLoc = locations[Math.floor(Math.random() * locations.length)]!;
        action = { startTime: simTime, duration: 60, description: '出门活动', locationId: randomLoc };
        this.state.currentPlan.currentActions = [action];
      } else {
        // Debounce: wait at least 10 sim minutes between LLM decisions
        const TEN_SIM_MINUTES = 10 * 60 * 1000;
        if (simTime - this.lastDecisionAt < TEN_SIM_MINUTES) {
          this.state.status = 'idle';
          return;
        }
        this.lastDecisionAt = simTime;
        action = await this.planner.decideNextAction(this.state, simTime);
        this.state.currentPlan.currentActions = [action];
      }
    }

    // Check if we need to navigate to the action's location
    const map = WorldMap.getInstance();
    const currentTile = map.getTile(this.state.position.x, this.state.position.y);
    const currentLocationId = currentTile?.locationId;

    if (action.locationId && currentLocationId !== action.locationId) {
      // Need to move
      if (this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
        const target = getRandomSpawnPoint(action.locationId);
        this.currentPath = this.pathFinder.findPath(this.state.position, target);
        this.pathIndex = 1; // skip start position
      }

      if (this.pathIndex < this.currentPath.length) {
        this.state.position = this.currentPath[this.pathIndex]!;
        this.pathIndex++;
        this.state.status = 'moving';
        this.state.currentAction = {
          type: 'move',
          description: `Moving to ${action.locationId}`,
          targetPosition: this.currentPath[this.currentPath.length - 1],
        };
      }
    } else {
      // At target location, perform action
      this.currentPath = [];
      this.pathIndex = 0;
      this.state.status = action.description.toLowerCase().includes('sleep') ? 'sleeping' : 'acting';
      this.state.currentAction = {
        type: 'stay',
        description: action.description,
        completesAt: action.startTime + action.duration * 60 * 1000,
      };
    }

    agentRepo.update(this.state);
  }

  private async maybeReflect(simTime: number, config: SimulationConfig): Promise<void> {
    if (this.state.importanceAccumulator >= config.reflectionThreshold) {
      this.state.importanceAccumulator = 0;
      this.state.lastReflectionAt = simTime;
      await this.reflector.reflect(this.state, simTime);
      agentRepo.update(this.state);
    }
  }

  addImportance(amount: number): void {
    this.state.importanceAccumulator += amount;
  }

  forceMoveTo(locationId: string, simTime: number, description = '前往其他地点'): void {
    if (!this.state.currentPlan) return;
    const action: PlannedAction = { startTime: simTime, duration: 60, description, locationId };
    this.state.currentPlan.currentActions = [action];
    this.lastDecisionAt = simTime;
    this.currentPath = [];
    this.pathIndex = 0;
  }
}
