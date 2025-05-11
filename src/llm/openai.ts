import { requestUrl, Notice } from "obsidian";
import { CoffeeRewriterSettings } from "../types/settings";
import { OpenAICompatibleModel, OpenAICompatibleModelListResponse } from "../types/llm-api";

export async function callOpenAI(
  settings: CoffeeRewriterSettings, 
  text: string, 
  promptToUse: string
): Promise<string | undefined> {
  const { openAiKey, openAiModel } = settings;

  if (!openAiKey) {
    new Notice("Coffee Rewriter: OpenAI key missing. Add it in the settings.");
    return;
  }

  try {
    const res = await requestUrl({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: openAiModel,
        messages: [
          { role: "system", content: promptToUse },
          { role: "user", content: text },
        ],
      }),
    });

    return res.json?.choices?.[0]?.message?.content;
  } catch (err) {
    console.error("Coffee Rewriter – OpenAI error", err);
    new Notice("Coffee Rewriter: OpenAI request failed (see console).");
    return;
  }
}

export async function listOpenAiModels(settings: CoffeeRewriterSettings): Promise<string[]> {
  const { openAiKey } = settings;
  if (!openAiKey) return [];
  try {
    const res = await requestUrl({
      url: "https://api.openai.com/v1/models",
      method: "GET",
      headers: { Authorization: `Bearer ${openAiKey}` },
    });

    const responseJson = res.json as OpenAICompatibleModelListResponse | undefined;
    if (responseJson && Array.isArray(responseJson.data)) {
      return responseJson.data.map((m: OpenAICompatibleModel) => m.id).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error("Coffee Rewriter – OpenAI models error", err);
    return [];
  }
} 