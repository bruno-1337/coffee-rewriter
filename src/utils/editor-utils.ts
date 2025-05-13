import { Editor } from "obsidian";

/**
 * Retrieves a specified number of paragraphs preceding the current cursor position or selection.
 * Paragraphs are assumed to be separated by double newlines.
 * 
 * @param editor The Obsidian editor instance.
 * @param numParagraphs The maximum number of preceding paragraphs to retrieve.
 * @returns A string containing the preceding paragraphs, or an empty string if none are found or an error occurs.
 */
export function getPrecedingParagraphs(editor: Editor, numParagraphs: number): string {
  try {
    const cursor = editor.getCursor("from"); // Get the start of the selection or cursor position
    const doc = editor.getValue();
    const upToCursor = doc.substring(0, editor.posToOffset(cursor));

    if (!upToCursor.trim()) {
      return ""; // No text before cursor
    }

    // Split by double newlines (common paragraph separator)
    // Then filter out any empty strings that might result from multiple blank lines
    const paragraphs = upToCursor.split(/\n\s*\n/).filter(p => p.trim() !== "");

    if (paragraphs.length === 0) {
      return "";
    }

    // Get the last N paragraphs
    const relevantParagraphs = paragraphs.slice(-numParagraphs);
    
    return relevantParagraphs.join("\n\n"); // Re-join with double newlines

  } catch (error) {
    console.error("Error getting preceding paragraphs:", error);
    return ""; // Return empty string on error
  }
} 