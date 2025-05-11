export interface PromptTemplate {
  id: string; // Unique ID for each template
  name: string;
  prompt: string;
}

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
  // prompt: string; // This will be replaced by promptTemplates
  promptTemplates: PromptTemplate[];
  preserveQuotes: boolean;
  /** Only applicable to self-hosted providers (LM Studio, Ollama) */
  stripReasoning: boolean;
}

export type LlmProvider = "openai" | "gemini" | "lmstudio" | "claude" | "ollama"; 