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

export function buildHourlyDecomposePrompt(
  agent: AgentState,
  hourDescription: string,
  locationIds: string[]
): string {
  const { identity } = agent;
  return `你是${identity.name}，${identity.age}岁，职业是${identity.occupation}。
本小时的计划：「${hourDescription}」
可用地点：${locationIds.join('、')}

请将这一小时拆分为若干5分钟步骤，以JSON数组格式返回：
[
  { "startMinute": 0, "duration": 15, "description": "活动描述", "locationId": "地点ID" },
  ...
]
要求：所有步骤时长之和恰好等于60分钟，描述用中文，locationId必须是以下之一：${locationIds.join('、')}`;
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

export function parseDecomposedActions(raw: string, fallbackLocationId: string): DecomposedAction[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found');
    const parsed = JSON.parse(jsonMatch[0]) as DecomposedAction[];
    return parsed.filter(a => typeof a.startMinute === 'number' && typeof a.duration === 'number');
  } catch {
    return [{ startMinute: 0, duration: 60, description: '进行日常活动', locationId: fallbackLocationId }];
  }
}
