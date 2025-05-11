export type LlmProvider = "openai" | "gemini" | "lmstudio" | "claude" | "ollama";

export interface CoffeeRewriterSettings {
  provider: LlmProvider;
  openAiKey: string;
  openAiModel: string;
  geminiKey: string;
  geminiModel: string;
  lmstudioEndpoint: string;
  lmStudioModel: string;
  /** Anthropic/Claude */
  claudeKey: string;
  claudeModel: string;
  /** Ollama local server */
  ollamaEndpoint: string;
  ollamaModel: string;
  prompt: string;
  preserveQuotes: boolean;
  /** Only applicable to self-hosted providers (LM Studio, Ollama) */
  stripReasoning: boolean;
} 