import type { AgentState, MemoryEntry } from '@town/shared';

export interface DialogueTurn {
  speakerName: string;
  utterance: string;
}

export function buildDialoguePrompt(
  speaker: AgentState,
  listener: AgentState,
  history: DialogueTurn[],
  relevantMemories: MemoryEntry[]
): string {
  const { identity } = speaker;
  const memCtx = relevantMemories.slice(0, 5)
    .map(m => `- ${m.content}`)
    .join('\n');

  const historyCtx = history.map(t => `${t.speakerName}：${t.utterance}`).join('\n');

  return `你是${identity.name}，${identity.age}岁，职业是${identity.occupation}。
性格特点：${identity.traits.join('、')}。
你正在与${listener.identity.name}（${listener.identity.occupation}）交谈。

相关记忆：
${memCtx || '（暂无相关记忆）'}

对话记录：
${historyCtx || '（对话刚刚开始）'}

请以${identity.name}的身份，用中文回复一句自然的话（1到3句），符合你的性格。
不要在回复中包含你的名字，直接输出对话内容。`;
}

export function buildImportancePrompt(content: string): string {
  return `请对以下记忆的重要程度打分，分值为1到10的整数。
1分 = 日常琐事，无关紧要
10分 = 改变人生轨迹的重大事件或深刻顿悟

记忆内容：「${content}」

只需输出一个1到10之间的整数，不要有其他内容。`;
}

export function parseImportance(raw: string): number {
  const match = raw.trim().match(/\b([1-9]|10)\b/);
  if (match) {
    const val = parseInt(match[1]!, 10);
    if (val >= 1 && val <= 10) return val;
  }
  return 5;
}
