export type AiGenerateInput = {
  purpose: 'itinerary' | 'recommend';
  candidateIds: string[];
  constraints: Record<string, unknown>;
};

export type AiGenerateResult = {
  provider: string;
  content: Record<string, unknown>;
};

/** Port for AI providers. Paid APIs require Helmy approval. */
export interface AiPort {
  generate(input: AiGenerateInput): Promise<AiGenerateResult>;
}
