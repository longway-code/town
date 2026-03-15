import type { AgentState } from '@town/shared';
import { getLLMProvider } from '../llm/provider.js';
import { buildReflectionPrompt, parseReflections } from '../llm/prompts/reflection.js';
import { MemoryStream } from '../memory/MemoryStream.js';
import { globalBus } from '../simulation/EventBus.js';
import { logger } from '../utils/logger.js';

export class Reflector {
  private memoryStream: MemoryStream;

  constructor(memoryStream: MemoryStream) {
    this.memoryStream = memoryStream;
  }

  async reflect(agent: AgentState, simTime: number): Promise<void> {
    const memories = this.memoryStream.getTopImportant(agent.identity.id, 15);
    if (memories.length < 5) return; // not enough to reflect on

    try {
      const provider = getLLMProvider();
      const prompt = buildReflectionPrompt(agent, memories);
      const response = await provider.complete({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.9,
      });

      const insights = parseReflections(response.content);
      for (const insight of insights) {
        await this.memoryStream.addMemory(
          agent.identity.id,
          'reflection',
          insight,
          simTime,
          memories.map(m => m.id)
        );
        globalBus.emit('agent:reflection', {
          agentId: agent.identity.id,
          insight,
        });
        logger.info({ agentId: agent.identity.id, insight }, 'Agent reflected');
      }
    } catch (err) {
      logger.warn({ err, agentId: agent.identity.id }, 'Reflection failed');
    }
  }
}
