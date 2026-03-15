import type { LLMRequest, LLMResponse } from '@town/shared';
import type { ILLMProvider } from './ILLMProvider.js';
import { stripThinking } from './stripThinking.js';

interface OllamaResponse {
  message: { content: string };
  eval_count?: number;
  prompt_eval_count?: number;
}

export class OllamaProvider implements ILLMProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
    this.model = process.env['OLLAMA_MODEL'] ?? 'llama3.2';
  }

  async complete(req: LLMRequest): Promise<LLMResponse> {
    const messages = req.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    if (req.systemPrompt) {
      messages.unshift({ role: 'system', content: req.systemPrompt });
    }

    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: req.temperature ?? 0.7,
          num_predict: req.maxTokens ?? 1024,
        },
      }),
    });

    if (!resp.ok) {
      throw new Error(`Ollama error ${resp.status}: ${await resp.text()}`);
    }

    const data = (await resp.json()) as OllamaResponse;
    return {
      content: stripThinking(data.message.content),
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
      model: this.model,
    };
  }
}
