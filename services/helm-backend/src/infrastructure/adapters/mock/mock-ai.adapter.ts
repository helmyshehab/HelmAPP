import { Injectable } from '@nestjs/common';
import type { AiGenerateInput, AiGenerateResult, AiPort } from '../../ports/ai.port';

/**
 * MOCK AI adapter — deterministic offline itineraries from candidate IDs.
 * Not a real LLM. Paid AI requires Helmy approval (BD-09).
 */
@Injectable()
export class MockAiAdapter implements AiPort {
  async generate(input: AiGenerateInput): Promise<AiGenerateResult> {
    return {
      provider: 'mock',
      content: {
        mock: true,
        purpose: input.purpose,
        // Only echo allow-listed candidate IDs — never invent entities.
        items: input.candidateIds.map((id, index) => ({
          poiId: id,
          dayIndex: (index % 3) + 1,
          source: 'mock',
        })),
        note: 'MOCK: replace with real AiPort after Helmy approval',
      },
    };
  }
}
