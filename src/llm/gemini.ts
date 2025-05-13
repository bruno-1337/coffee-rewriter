import { requestUrl, Notice } from "obsidian";
import { CoffeeRewriterSettings } from "../types/settings";
import { GeminiModel, GeminiModelListResponse } from "../types/llm-api";
import { isContextWindowError, showContextWindowError } from "../utils/error-utils";

export async function callGemini(
  settings: CoffeeRewriterSettings, 
  text: string, 
  promptToUse: string
): Promise<string | undefined> {
  const { geminiKey, geminiModel } = settings;

  if (!geminiKey) {
    new Notice("Coffee Rewriter: Gemini API key missing.");
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
    const res = await requestUrl({
      url,
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${promptToUse}\n\n${text}` }] }],
      }),
    });

    return res.json?.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (err) {
    console.error("Coffee Rewriter – Gemini error", err);
    
    // Check if this is a context window error
    if (isContextWindowError(err)) {
      showContextWindowError("Gemini");
    } else {
      new Notice("Coffee Rewriter: Gemini request failed (see console).");
    }
    
    return;
  }
}

export async function listGeminiModels(settings: CoffeeRewriterSettings): Promise<string[]> {
  const { geminiKey } = settings;
  if (!geminiKey) return [];
  try {
    const res = await requestUrl({
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
      method: "GET",
    });

    const responseJson = res.json as GeminiModelListResponse | undefined;
    if (responseJson && Array.isArray(responseJson.models)) {
      return responseJson.models.map((m: GeminiModel) => m.name).filter(Boolean);
    }
    return [];
  } catch (err) {
    console.error("Coffee Rewriter – Gemini models error", err);
    return [];
  }
} 