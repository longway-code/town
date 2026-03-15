export type LLMProviderType = 'anthropic' | 'openai' | 'ollama';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface LLMResponse {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
}
