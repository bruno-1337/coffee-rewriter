import { requestUrl, Notice } from "obsidian";
import { CoffeeRewriterSettings } from "../types/settings";
import { OpenAICompatibleModel, OpenAICompatibleModelListResponse } from "../types/llm-api";
import { stripReasoningTags } from "../utils/string-utils";

export async function callLmStudio(
  settings: CoffeeRewriterSettings, 
  text: string, 
  promptToUse: string
): Promise<string | undefined> {
  const { lmstudioEndpoint, lmStudioModel, stripReasoning: stripReasoningSetting } = settings;

  try {
    const res = await requestUrl({
      url: `${lmstudioEndpoint}/v1/chat/completions`,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        model: lmStudioModel,
        messages: [
          { role: "system", content: promptToUse },
          { role: "user", content: text },
        ],
      }),
    });

    const content: string | undefined = res.json?.choices?.[0]?.message?.content;
    if (!content) return content;
    return stripReasoningSetting ? stripReasoningTags(content) : content;
  } catch (err) {
    console.error("Coffee Rewriter – LM Studio error", err);
    new Notice("Coffee Rewriter: Could not reach LM Studio server.");
    return;
  }
}

export async function listLmStudioModels(settings: CoffeeRewriterSettings): Promise<string[]> {
  const { lmstudioEndpoint } = settings;
  try {
    const res = await requestUrl({
      url: `${lmstudioEndpoint}/v1/models`,
      method: "GET",
      contentType: "application/json",
    });

    const responseJson = res.json as OpenAICompatibleModelListResponse | undefined;
    if (responseJson && Array.isArray(responseJson.data)) {
      return responseJson.data.map((m: OpenAICompatibleModel) => m.id).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error("Coffee Rewriter – LM Studio models", err);
    return [];
  }
}