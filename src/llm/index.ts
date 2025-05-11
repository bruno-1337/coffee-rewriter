import { CoffeeRewriterSettings } from "../types/settings";
import { callOpenAI } from "./openai";
import { callGemini } from "./gemini";
import { callLmStudio } from "./lmstudio";
import { callClaude } from "./claude";
import { callOllama } from "./ollama";
import { RewriteResponse } from "../types/llm-api";

// Append JSON instruction to any prompt
function appendJsonInstruction(prompt: string): string {
  return `${prompt.trim()} Reply with a JSON object that contains two fields: "rewrittenText" with the improved version, and "note" with a brief note about what was changed. Always return valid JSON.`;
}

// Parse LLM response as JSON or construct a fallback object
function parseResponse(rawResponse: string | undefined): RewriteResponse | undefined {
  if (!rawResponse) return undefined;
  
  try {
    // Try to parse as JSON
    // First attempt to find JSON in a larger response (some LLMs might add extra text)
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // Validate the parsed object has the expected structure
      if (typeof parsed.rewrittenText === 'string' && typeof parsed.note === 'string') {
        return parsed as RewriteResponse;
      }
    }
    
    // If we can't parse as JSON or it doesn't have the right structure,
    // fall back to using the raw response as the rewritten text
    return {
      rewrittenText: rawResponse.trim(),
      note: "The AI didn't provide structured feedback for this rewrite."
    };
  } catch (e) {
    console.warn("Coffee Rewriter - Failed to parse LLM response as JSON:", e);
    // Fallback to using the raw response
    return {
      rewrittenText: rawResponse.trim(),
      note: "The AI didn't provide structured feedback for this rewrite."
    };
  }
}

export async function requestRewrite(
  settings: CoffeeRewriterSettings, 
  text: string, 
  customPrompt?: string // Optional custom prompt
): Promise<RewriteResponse | undefined> {
  // Determine which prompt to use
  const basePrompt = customPrompt !== undefined ? customPrompt : settings.prompt;
  // Append JSON instruction to the prompt
  const activePrompt = appendJsonInstruction(basePrompt);

  let rawResponse: string | undefined;
  
  switch (settings.provider) {
    case "openai":
      rawResponse = await callOpenAI(settings, text, activePrompt);
      break;
    case "gemini":
      rawResponse = await callGemini(settings, text, activePrompt);
      break;
    case "lmstudio":
      rawResponse = await callLmStudio(settings, text, activePrompt);
      break;
    case "claude":
      rawResponse = await callClaude(settings, text, activePrompt);
      break;
    case "ollama":
      rawResponse = await callOllama(settings, text, activePrompt);
      break;
    default:
      console.warn(`Coffee Rewriter: Unknown provider: ${settings.provider}`);
      return undefined;
  }
  
  return parseResponse(rawResponse);
} 