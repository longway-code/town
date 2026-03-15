import Anthropic from '@anthropic-ai/sdk';
import type { LLMRequest, LLMResponse } from '@town/shared';
import type { ILLMProvider } from './ILLMProvider.js';
import { stripThinking } from './stripThinking.js';

export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env['ANTHROPIC_API_KEY'],
      ...(process.env['ANTHROPIC_BASE_URL'] && { baseURL: process.env['ANTHROPIC_BASE_URL'] }),
    });
    this.model = process.env['ANTHROPIC_MODEL'] ?? 'claude-haiku-4-5-20251001';
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const messages = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const systemMsg = req.systemPrompt ??
      req.messages.find(m => m.role === 'system')?.content;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.7,
      system: systemMsg,
      messages,
    });

    const content = response.content[0];
    return {
      content: stripThinking(content.type === 'text' ? content.text : ''),
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}
