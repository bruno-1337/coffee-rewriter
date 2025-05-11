import { diffWords } from "diff";
import type { DiffResult } from "./types/diff";

/**
 * Generates ==highlight== for additions. 
 * Removed parts are excluded from the output.
 * Unchanged parts are returned as plain text.
 */
export function annotateDiff(original: string, revised: string): DiffResult {
  let additions = 0;
  let removals = 0;

  const annotated = diffWords(original, revised)
    .map((part) => {
      if (part.added) {
        additions += 1;
        const value = part.value;
        const leadingWhitespaceMatch = value.match(/^(\\s*)/);
        const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
        
        const trailingWhitespaceMatch = value.match(/(\\s*)$/);
        const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
        
        let core = value;
        // Strip trailing whitespace from core
        if (trailingWhitespace.length > 0) {
            core = core.substring(0, core.length - trailingWhitespace.length);
        }
        // Strip leading whitespace from core
        if (leadingWhitespace.length > 0) {
            core = core.substring(leadingWhitespace.length);
        }

        if (core.length > 0) {
          return `${leadingWhitespace}==${core}==${trailingWhitespace}`;
        } else {
          // Value was purely whitespace, highlight all of it
          return `==${value}==`; 
        }
      }
      if (part.removed) {
        removals += 1;
        return ""; // Exclude removed parts
      }
      return part.value; // Return common (unchanged) parts as plain text
    })
    .join("");

  return { annotated, additions, removals };
} 