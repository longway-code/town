/**
 * 过滤掉推理模型（DeepSeek-R1、MiniMax M2.5 等）返回的 <think>...</think> 思考块。
 */
export function stripThinking(content: string): string {
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}
