import { requestUrl, Notice } from "obsidian";
import { CoffeeRewriterSettings } from "../types/settings";
import { OpenAICompatibleModel, OpenAICompatibleModelListResponse } from "../types/llm-api";
import { stripReasoningTags } from "../utils/string-utils";

/**
 * Call a local Ollama server using its OpenAI-compatible chat endpoint.
 */
export async function callOllama(
  settings: CoffeeRewriterSettings, 
  text: string, 
  promptToUse: string
): Promise<string | undefined> {
  const { ollamaEndpoint, ollamaModel, stripReasoning } = settings;

  try {
    const res = await requestUrl({
      url: `${ollamaEndpoint}/v1/chat/completions`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: "system", content: promptToUse },
          { role: "user", content: text },
        ],
      }),
    });

    const content: string | undefined = res.json?.choices?.[0]?.message?.content;
    if (!content) return content;
    return stripReasoning ? stripReasoningTags(content) : content;
  } catch (err) {
    console.error("Coffee Rewriter – Ollama error", err);
    new Notice("Coffee Rewriter: Could not reach Ollama server.");
    return;
  }
}

/**
 * List models available from the Ollama server via /v1/models.
 */
export async function listOllamaModels(settings: CoffeeRewriterSettings): Promise<string[]> {
  const { ollamaEndpoint } = settings;
  try {
    const res = await requestUrl({
      url: `${ollamaEndpoint}/v1/models`,
      method: "GET",
      contentType: "application/json",
    });

    const responseJson = res.json as OpenAICompatibleModelListResponse | undefined;
    if (responseJson && Array.isArray(responseJson.data)) {
      return responseJson.data.map((m: OpenAICompatibleModel) => m.id).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error("Coffee Rewriter – Ollama models", err);
    return [];
  }
} 