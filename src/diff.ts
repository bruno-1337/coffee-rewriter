import { diffWords } from "diff";
import type { DiffResult } from "./types/diff";

/**
 * Generates <mark>highlight</mark> for additions. 
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
        
        // Split value into leading whitespace, core text, and trailing whitespace
        const leadingWhitespaceMatch = value.match(/^(\s*)/);
        const leadingWhitespace = leadingWhitespaceMatch ? leadingWhitespaceMatch[0] : "";
        
        const trailingWhitespaceMatch = value.match(/(\s*)$/);
        const trailingWhitespace = trailingWhitespaceMatch ? trailingWhitespaceMatch[0] : "";
        
        let core = value;
        if (trailingWhitespace.length > 0) {
            core = core.substring(0, core.length - trailingWhitespace.length);
        }
        if (leadingWhitespace.length > 0) {
            core = core.substring(leadingWhitespace.length);
        }

        // Only wrap non-empty core text with <mark>. Whitespace remains outside.
        if (core.length > 0) {
          return `${leadingWhitespace}<mark>${core}</mark>${trailingWhitespace}`;
        } else {
          // If the part was purely whitespace and added, highlight it all.
          // This helps visualize added newlines or multiple spaces.
          return `<mark>${value}</mark>`; 
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