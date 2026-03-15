import type { AgentState, DailyPlan, PlannedAction } from '@town/shared';
import { getLLMProvider } from '../llm/provider.js';
import {
  buildDailyPlanPrompt, buildActionDecisionPrompt,
  parseDailyPlan, parseActionDecision,
} from '../llm/prompts/planning.js';
import { MemoryStream } from '../memory/MemoryStream.js';
import { WorldMap } from '../map/WorldMap.js';
import { getLocationById, LOCATION_IDS } from '../map/locations.js';
import { logger } from '../utils/logger.js';

export class Planner {
  private memoryStream: MemoryStream;

  constructor(memoryStream: MemoryStream) {
    this.memoryStream = memoryStream;
  }

  async createDailyPlan(agent: AgentState, simTime: number, simDate: string): Promise<DailyPlan> {
    const recentMemories = this.memoryStream.getRecent(agent.identity.id, 10)
      .map(m => m.content);

    let hourlyPlan: string[];
    try {
      const provider = getLLMProvider();
      const prompt = buildDailyPlanPrompt(agent, simDate, recentMemories);
      const response = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.8,
      });
      hourlyPlan = parseDailyPlan(response.content);
    } catch (err) {
      logger.warn({ err, agentId: agent.identity.id }, 'Failed to generate daily plan, using fallback');
      hourlyPlan = this.fallbackDailyPlan(agent.identity.homeLocationId);
    }

    return {
      date: simDate,
      hourlyPlan,
      currentActions: [],
      lastDecomposedHour: -1,
    };
  }

  async decideNextAction(agent: AgentState, simTime: number): Promise<PlannedAction> {
    const simHour = new Date(simTime).getUTCHours();
    const hourPlan = agent.currentPlan?.hourlyPlan[simHour] ?? '进行日常活动';
    const recentMems = this.memoryStream.getRecent(agent.identity.id, 5).map(m => m.content);

    const map = WorldMap.getInstance();
    const tile = map.getTile(agent.position.x, agent.position.y);
    const currentLocationId = tile?.locationId ?? agent.identity.homeLocationId;

    const prompt = buildActionDecisionPrompt(agent, currentLocationId, hourPlan, recentMems, simTime);

    try {
      const provider = getLLMProvider();
      const response = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 150,
        temperature: 0.8,
      });
      const decision = parseActionDecision(response.content, currentLocationId);
      logger.info(
        { agentId: agent.identity.id, tool: decision.tool, locationId: decision.locationId },
        'Action decided'
      );
      return {
        startTime: simTime,
        duration: decision.duration,
        description: decision.description,
        locationId: decision.locationId,
      };
    } catch (err) {
      logger.warn({ err, agentId: agent.identity.id }, 'decideNextAction failed, staying put');
      return { startTime: simTime, duration: 15, description: hourPlan, locationId: currentLocationId };
    }
  }

  async decomposeHour(
    agent: AgentState,
    plan: DailyPlan,
    hour: number,
    simTime: number
  ): Promise<PlannedAction[]> {
    const hourDescription = plan.hourlyPlan[hour] ?? 'idle at home';
    const baseSimTime = simTime - (simTime % (60 * 60 * 1000)); // start of current sim hour

    let actions: PlannedAction[];
    try {
      const provider = getLLMProvider();
      const prompt = buildHourlyDecomposePrompt(agent, hourDescription, LOCATION_IDS);
      const response = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.7,
      });
      const parsed = parseDecomposedActions(response.content, agent.identity.homeLocationId);
      actions = parsed.map(a => ({
        startTime: baseSimTime + a.startMinute * 60 * 1000,
        duration: a.duration,
        description: a.description,
        locationId: LOCATION_IDS.includes(a.locationId) ? a.locationId : agent.identity.homeLocationId,
      }));
    } catch (err) {
      logger.warn({ err, agentId: agent.identity.id }, 'Failed to decompose hour, using fallback');
      actions = [{
        startTime: baseSimTime,
        duration: 60,
        description: hourDescription,
        locationId: agent.identity.homeLocationId,
      }];
    }

    return actions;
  }

  getCurrentAction(plan: DailyPlan, simTime: number): PlannedAction | null {
    for (const action of plan.currentActions) {
      const endTime = action.startTime + action.duration * 60 * 1000;
      if (simTime >= action.startTime && simTime < endTime) return action;
    }
    return null;
  }

  private fallbackDailyPlan(homeLocationId: string): string[] {
    const plan = new Array(24).fill('sleeping at home');
    plan[6] = `waking up and having breakfast at ${homeLocationId}`;
    plan[7] = `getting ready for the day at ${homeLocationId}`;
    plan[8] = 'going for a morning walk at park';
    plan[9] = 'working at the library';
    plan[10] = 'working at the library';
    plan[11] = 'getting coffee at cafe';
    plan[12] = 'having lunch at cafe';
    plan[13] = 'socializing at town_hall';
    plan[14] = 'shopping at market';
    plan[15] = 'relaxing at park';
    plan[16] = 'working at library';
    plan[17] = 'cooking dinner at home';
    plan[18] = `having dinner at ${homeLocationId}`;
    plan[19] = `relaxing at ${homeLocationId}`;
    plan[20] = `reading at ${homeLocationId}`;
    plan[21] = `winding down at ${homeLocationId}`;
    plan[22] = `sleeping at ${homeLocationId}`;
    plan[23] = `sleeping at ${homeLocationId}`;
    return plan;
  }
}
