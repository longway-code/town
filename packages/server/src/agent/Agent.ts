import type { AgentState, AgentAction, SimulationConfig } from '@town/shared';
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
    const clock = new Date(simTime);
    const simDate = clock.toISOString().split('T')[0]!;
    const simHour = clock.getUTCHours();

    // Create daily plan if needed
    if (!this.state.currentPlan || this.state.currentPlan.date !== simDate) {
      try {
        this.state.currentPlan = await this.planner.createDailyPlan(
          this.state, simTime, simDate
        );
        logger.info({ agentId: this.state.identity.id }, 'Daily plan created');
      } catch (err) {
        logger.warn({ err, agentId: this.state.identity.id }, 'Daily plan failed');
        return;
      }
    }

    // Decompose current hour if needed
    if (this.state.currentPlan.lastDecomposedHour !== simHour) {
      try {
        const actions = await this.planner.decomposeHour(
          this.state, this.state.currentPlan, simHour, simTime
        );
        this.state.currentPlan.currentActions = actions;
        this.state.currentPlan.lastDecomposedHour = simHour;
      } catch (err) {
        logger.warn({ err }, 'Hour decompose failed');
      }
    }
  }

  private async act(simTime: number, _config: SimulationConfig): Promise<void> {
    if (!this.state.currentPlan) {
      this.state.status = 'idle';
      return;
    }

    const action = this.planner.getCurrentAction(this.state.currentPlan, simTime);
    if (!action) {
      this.state.status = 'idle';
      return;
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
}
