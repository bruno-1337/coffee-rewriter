/** OpenAI and OpenAI-Compatible (LM Studio, Ollama) Model Structure */
export interface OpenAICompatibleModel {
  id: string;
  object?: string; // Typically "model"
  created?: number;
  owned_by?: string;
  // other potential fields...
}

export interface OpenAICompatibleModelListResponse {
  data: OpenAICompatibleModel[];
  object?: string; // Typically "list"
}

/** Gemini Model Structure */
export interface GeminiModel {
  name: string; // e.g., "models/gemini-pro"
  version?: string;
  displayName?: string;
  // other potential fields...
}

export interface GeminiModelListResponse {
  models: GeminiModel[];
}

/** Anthropic/Claude Model Structure */
export interface ClaudeModel {
  id: string;
  name?: string; // Older versions might use name
  display_name?: string;
  created_at?: string;
  // other potential fields...
}

export interface ClaudeModelListResponse {
  data: ClaudeModel[];
}

/** Structured response for rewrites */
export interface RewriteResponse {
  rewrittenText: string;
  note: string;
} 