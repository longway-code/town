import type { AgentState } from '@town/shared';

export function buildDailyPlanPrompt(agent: AgentState, simDate: string, recentMemories: string[]): string {
  const { identity } = agent;
  return `你是${identity.name}，${identity.age}岁，职业是${identity.occupation}。
性格特点：${identity.traits.join('、')}。
人生目标：${identity.goals.join('；')}。
个人简介：${identity.biography}

今天是${simDate}。请为自己制定一份真实合理的日程安排。
近期记忆：
${recentMemories.slice(0, 10).map((m, i) => `${i + 1}. ${m}`).join('\n')}

请严格按照以下格式输出24行，每行对应一个小时（0到23时），描述该小时在做什么。
格式：HH:00 - 【简短的活动描述】
地点只能从以下选择：home（家）、park（公园）、cafe（咖啡馆）、library（图书馆）、town_hall（市政厅）、market（集市）
示例：
00:00 - 在家睡觉
06:00 - 在家起床，吃早餐
...`;
}

const LOCATION_LIST = `- home      住宅区
- park      中央公园
- cafe      咖啡馆
- library   图书馆
- town_hall 市政厅
- market    集市`;

export function buildActionDecisionPrompt(
  agent: AgentState,
  currentLocationId: string,
  hourPlan: string,
  recentMemories: string[],
  simTime: number
): string {
  const { identity } = agent;
  const d = new Date(simTime);
  const timeStr = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
  const memCtx = recentMemories.length ? recentMemories.map(m => `- ${m}`).join('\n') : '（暂无）';

  return `你是${identity.name}，${identity.age}岁，${identity.occupation}。
性格：${identity.traits.join('、')}
当前时间：${timeStr}，当前位置：${currentLocationId}
本时段计划：${hourPlan}
近期记忆：
${memCtx}

请决定接下来要做什么，调用以下工具之一：

工具A — 移动到某个地点：
TOOL: move_to
LOCATION: <地点英文ID>
DESCRIPTION: <用中文描述你要去做什么>

工具B — 在当前地点停留：
TOOL: stay
DURATION: <停留分钟数，10到60之间>
DESCRIPTION: <用中文描述你在做什么>

可用地点（LOCATION填写左边的英文ID）：
${LOCATION_LIST}

只输出工具调用内容，不要有其他解释。`;
}

export function parseDailyPlan(raw: string): string[] {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const plan: string[] = new Array(24).fill('在家休息');
  for (const line of lines) {
    const match = line.match(/^(\d{1,2})[:h](\d{2})?\s*[-–]\s*(.+)/);
    if (match) {
      const hour = parseInt(match[1]!, 10);
      if (hour >= 0 && hour < 24) {
        plan[hour] = match[3]!.trim();
      }
    }
  }
  return plan;
}

export interface DecomposedAction {
  startMinute: number;
  duration: number;
  description: string;
  locationId: string;
}

const VALID_LOCATION_IDS = ['home', 'park', 'cafe', 'library', 'town_hall', 'market'];

const LOCATION_ALIAS: Record<string, string> = {
  '住宅区': 'home', '家': 'home',
  '中央公园': 'park', '公园': 'park',
  '咖啡馆': 'cafe', '咖啡': 'cafe',
  '图书馆': 'library',
  '市政厅': 'town_hall', '市政': 'town_hall',
  '集市': 'market', '市场': 'market',
};

function normalizeLocationId(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (VALID_LOCATION_IDS.includes(trimmed)) return trimmed;
  return LOCATION_ALIAS[trimmed] ?? fallback;
}

export interface ActionDecision {
  tool: 'move_to' | 'stay';
  locationId: string;
  duration: number; // sim minutes
  description: string;
}

export function parseActionDecision(raw: string, currentLocationId: string): ActionDecision {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  let tool: 'move_to' | 'stay' = 'stay';
  let locationId = currentLocationId;
  let duration = 20;
  let description = '进行日常活动';

  for (const line of lines) {
    if (/^TOOL[：:]\s*move_to/i.test(line)) {
      tool = 'move_to';
    } else if (/^TOOL[：:]\s*stay/i.test(line)) {
      tool = 'stay';
    } else if (/^LOCATION[：:]/i.test(line)) {
      const raw = line.replace(/^LOCATION[：:]\s*/i, '');
      locationId = normalizeLocationId(raw, currentLocationId);
    } else if (/^DURATION[：:]/i.test(line)) {
      const d = parseInt(line.replace(/^DURATION[：:]\s*/i, ''));
      if (!isNaN(d) && d >= 5 && d <= 120) duration = d;
    } else if (/^DESCRIPTION[：:]/i.test(line)) {
      description = line.replace(/^DESCRIPTION[：:]\s*/i, '');
    }
  }

  return {
    tool,
    locationId: tool === 'move_to' ? locationId : currentLocationId,
    duration: tool === 'move_to' ? 60 : duration, // move_to: 60 min at destination
    description,
  };
}

// Keep for backward compat (unused now but referenced in Planner)
export interface DecomposedAction {
  startMinute: number;
  duration: number;
  description: string;
  locationId: string;
}

export function parseDecomposedActions(raw: string, fallbackLocationId: string): DecomposedAction[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    const parsed = JSON.parse(jsonMatch[0]) as DecomposedAction[];
    return parsed
      .filter(a => typeof a.startMinute === 'number' && typeof a.duration === 'number')
      .map(a => ({ ...a, locationId: normalizeLocationId(a.locationId, fallbackLocationId) }));
  } catch {
    return [{ startMinute: 0, duration: 60, description: '进行日常活动', locationId: fallbackLocationId }];
  }
}
