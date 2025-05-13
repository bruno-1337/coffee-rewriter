import { Notice } from "obsidian";

/**
 * Checks if an error is related to context window limitations
 * @param error The error object or message
 * @returns True if the error appears to be context window related
 */
export function isContextWindowError(error: any): boolean {
  const errorStr = error?.toString?.() || String(error);
  const message = error?.message || errorStr;
  
  // Common error patterns for context window limits across different providers
  const contextWindowPatterns = [
    /context.*?window/i,
    /context.*?length/i,
    /token.*?limit/i,
    /prediction.*?error/i,
    /Error 400/i,
    /content too long/i,
    /too many tokens/i,
    /exceeds.*?context/i,
    /exceeds.*?maximum/i
  ];
  
  return contextWindowPatterns.some(pattern => pattern.test(message));
}

/**
 * Displays a user-friendly notice for context window errors
 * @param provider The name of the LLM provider (OpenAI, LM Studio, etc.)
 */
export function showContextWindowError(provider: string): void {
  new Notice(
    `Coffee Rewriter: ${provider} context window limit exceeded. Try:\n` +
    `• Using a smaller text selection\n` +
    `• Increasing context length in ${provider} settings\n` +
    `• Using a model with larger context window`,
    10000 // Show for 10 seconds so user can read it
  );
} 