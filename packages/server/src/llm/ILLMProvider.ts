import type { LLMRequest, LLMResponse } from '@town/shared';

export interface ILLMProvider {
  complete(req: LLMRequest): Promise<LLMResponse>;
}
