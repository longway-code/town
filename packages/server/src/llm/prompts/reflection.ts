import type { AgentState, MemoryEntry } from '@town/shared';

export function buildReflectionPrompt(agent: AgentState, memories: MemoryEntry[]): string {
  const { identity } = agent;
  const memoryList = memories
    .map((m, i) => `${i + 1}. [${m.type}] ${m.content}`)
    .join('\n');

  return `你是${identity.name}，${identity.age}岁，职业是${identity.occupation}。
性格特点：${identity.traits.join('、')}。

以下是你近期的记忆与经历：
${memoryList}

基于这些经历，请总结出3条最重要的深层感悟或规律性认识。
这些感悟应该揭示某种规律、人际关系或更深层的理解，而非简单重复事实。

请用中文，严格按以下格式输出3条，每条一行：
1. 【感悟内容】
2. 【感悟内容】
3. 【感悟内容】`;
}

export function parseReflections(raw: string): string[] {
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const insights: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+\.\s*(.+)/);
    if (match) insights.push(match[1]!.trim());
  }
  return insights.slice(0, 3);
}
