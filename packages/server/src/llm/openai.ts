import OpenAI from 'openai';
import type { LLMRequest, LLMResponse } from '@town/shared';
import type { ILLMProvider } from './ILLMProvider.js';
import { stripThinking } from './stripThinking.js';

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env['OPENAI_API_KEY'],
      ...(process.env['OPENAI_BASE_URL'] && { baseURL: process.env['OPENAI_BASE_URL'] }),
    });
    this.model = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = req.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (req.systemPrompt) {
      messages.unshift({ role: 'system', content: req.systemPrompt });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature ?? 0.7,
      messages,
    });

    return {
      content: stripThinking(response.choices[0]?.message?.content ?? ''),
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      model: response.model,
    };
  }
}
