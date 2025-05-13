import { requestUrl, Notice } from "obsidian";
import { CoffeeRewriterSettings } from "../types/settings";
import { ClaudeModel, ClaudeModelListResponse } from "../types/llm-api";
import { isContextWindowError, showContextWindowError } from "../utils/error-utils";

/**
 * Send a chat completion request to Anthropic Claude.
 */
export async function callClaude(
  settings: CoffeeRewriterSettings, 
  text: string, 
  promptToUse: string
): Promise<string | undefined> {
  const { claudeKey, claudeModel, claudeTemperature } = settings;

  if (!claudeKey) {
    new Notice("Coffee Rewriter: Claude API key missing. Add it in the settings.");
    return;
  }

  try {
    const res = await requestUrl({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      contentType: "application/json",
      headers: {
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 2048,
        system: promptToUse,
        messages: [
          { role: "user", content: text },
        ],
        temperature: claudeTemperature
      }),
    });

    const firstContentBlock = res.json?.content?.[0];
    if (firstContentBlock && firstContentBlock.type === "text") {
      return firstContentBlock.text;
    }
    return undefined;
  } catch (err) {
    console.error("Coffee Rewriter – Claude error", err);
    
    // Check if this is a context window error
    if (isContextWindowError(err)) {
      showContextWindowError("Claude");
    } else {
      new Notice("Coffee Rewriter: Claude request failed (see console).");
    }
    
    return;
  }
}

/**
 * Retrieve available Claude models via the provider's /models endpoint.
 */
export async function listClaudeModels(settings: CoffeeRewriterSettings): Promise<string[]> {
  const { claudeKey } = settings;
  if (!claudeKey) return [];
  try {
    const res = await requestUrl({
      url: "https://api.anthropic.com/v1/models",
      method: "GET",
      contentType: "application/json",
      headers: {
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
    });

    const responseJson = res.json as ClaudeModelListResponse | undefined;
    if (responseJson && Array.isArray(responseJson.data)) {
      return responseJson.data.map((m: ClaudeModel) => m.id).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error("Coffee Rewriter – Claude models error", err);
    return [];
  }
} 