export function stripReasoningTags(text: string): string {
  // First, remove the tags, then trim any whitespace that might have been
  // surrounding the tags or left by the replacement.
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
} 