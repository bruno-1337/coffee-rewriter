export interface PromptTemplate {
  id: string; // Unique ID for each template
  name: string;
  prompt: string;
}

export interface CoffeeRewriterSettings {
  provider: LlmProvider;
  
  // OpenAI settings
  openAiKey: string;
  openAiModel: string;
  openAiTemperature: number;
  
  // Gemini settings
  geminiKey: string;
  geminiModel: string;
  geminiTemperature: number;
  
  // LM Studio settings
  lmstudioEndpoint: string;
  lmStudioModel: string;
  lmStudioTemperature: number;
  
  // Claude settings
  claudeKey: string;
  claudeModel: string;
  claudeTemperature: number;
  
  // Ollama settings
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaTemperature: number;
  
  // Common settings
  promptTemplates: PromptTemplate[];
  preserveQuotes: boolean;
  /** Only applicable to self-hosted providers (LM Studio, Ollama) */
  stripReasoning: boolean;
}

export type LlmProvider = "openai" | "gemini" | "lmstudio" | "claude" | "ollama"; 