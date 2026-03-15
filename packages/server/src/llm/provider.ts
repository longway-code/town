import type { ILLMProvider } from './ILLMProvider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import type { LLMProviderType } from '@town/shared';

export type { ILLMProvider };

let instance: ILLMProvider | null = null;

export function getLLMProvider(): ILLMProvider {
  if (!instance) {
    const providerType = (process.env['LLM_PROVIDER'] ?? 'anthropic') as LLMProviderType;
    switch (providerType) {
      case 'anthropic':
        instance = new AnthropicProvider();
        break;
      case 'openai':
        instance = new OpenAIProvider();
        break;
      case 'ollama':
        instance = new OllamaProvider();
        break;
      default:
        throw new Error(`Unknown LLM_PROVIDER: ${providerType}`);
    }
  }
  return instance;
}
