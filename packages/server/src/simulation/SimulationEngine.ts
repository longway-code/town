import type { SimulationConfig, SimulationState } from '@town/shared';
import { DEFAULT_CONFIG } from '@town/shared';
import { Clock } from './Clock.js';
import { globalBus } from './EventBus.js';
import { AgentManager } from '../agent/AgentManager.js';
import { logger } from '../utils/logger.js';

export class SimulationEngine {
  private clock: Clock;
  private agentManager: AgentManager;
  private config: SimulationConfig;
  private status: SimulationState['status'] = 'idle';
  private tick = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tickRunning = false;
  private startedAt?: number;

  constructor(agentManager: AgentManager, config: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = new Clock(this.config.simMinutesPerTick);
    this.agentManager = agentManager;
  }

  getState(): SimulationState {
    return {
      status: this.status,
      tick: this.tick,
      simTime: this.clock.simTime,
      config: this.config,
      agentCount: this.agentManager.getAgentCount(),
      startedAt: this.startedAt,
    };
  }

  start(): void {
    if (this.status === 'running') return;
    this.status = 'running';
    this.startedAt = Date.now();
    this.timer = setInterval(() => this.doTick(), this.config.tickIntervalMs);
    globalBus.emit('sim:state', this.getState());
    logger.info('Simulation started');
  }

  pause(): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    globalBus.emit('sim:state', this.getState());
    logger.info('Simulation paused');
  }

  resume(): void {
    if (this.status !== 'paused') return;
    this.start();
  }

  reset(): void {
    this.pause();
    this.tick = 0;
    this.status = 'idle';
    this.startedAt = undefined;
    this.clock = new Clock(this.config.simMinutesPerTick);
    this.agentManager.reset();
    globalBus.emit('sim:state', this.getState());
    logger.info('Simulation reset');
  }

  updateConfig(partial: Partial<SimulationConfig>): void {
    const wasRunning = this.status === 'running';
    if (wasRunning) this.pause();
    this.config = { ...this.config, ...partial };
    if (partial.tickIntervalMs || partial.simMinutesPerTick) {
      this.clock.setMinutesPerTick(this.config.simMinutesPerTick);
    }
    if (wasRunning) this.start();
  }

  private async doTick(): Promise<void> {
    if (this.tickRunning) return; // skip if previous tick is still processing
    this.tickRunning = true;
    this.tick++;
    this.clock.tick();
    const simTime = this.clock.simTime;

    try {
      const agentSnapshots = await this.agentManager.tick(simTime, this.config);

      globalBus.emit('sim:tick', {
        tick: this.tick,
        simTime,
        agents: agentSnapshots,
      });
    } catch (err) {
      logger.error({ err }, 'Tick error');
      globalBus.emit('sim:error', { message: String(err) });
    } finally {
      this.tickRunning = false;
    }
  }
}
