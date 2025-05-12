import { Editor } from "obsidian";
import CoffeeRewriter from "../main";
import { requestRewrite } from "../llm/index";
import { showNotice } from "../utils/notice";
import { RewriteModal } from "../rewrite-modal";
import { TailoredPromptModal } from "../tailored-prompt-modal";
import { ChooseTextModal } from "../choose-text-modal";

export async function rewriteScope(plugin: CoffeeRewriter, editor: Editor): Promise<void> {
  const sel = editor.getSelection();
  const isSel = !!sel;
  const originalText = sel || editor.getLine(editor.getCursor().line);
  // Store the original range if not a selection, for precise replacement
  const originalLine = editor.getCursor().line;
  const originalLineText = isSel ? null : editor.getLine(originalLine);

  if (!originalText.trim()) {
    showNotice("Coffee Rewriter: Nothing to rewrite.");
    return;
  }

  showNotice("☕️ Calling LLM to rewrite text...");

  const response = await requestRewrite(plugin.cfg, originalText);
  if (!response) {
    showNotice("Coffee Rewriter: Rewrite request failed or returned empty.");
    return;
  }

  // Extract the rewritten text from the response
  const llmRewrittenText = response.rewrittenText.trim();
  const rewriteNote = response.note;

  // Compare trimmed versions to see if there are actual changes
  if (llmRewrittenText === originalText.trim()) { // Also trim originalText for a fair comparison if it might have whitespace
    showNotice("✅ Text looks good, nothing to change.");
    return;
  }

  let textForModalAndAcceptance = llmRewrittenText;
  if (plugin.cfg.preserveQuotes) {
    const originalQuotes = originalText.match(/"([^"]+)"/g) || [];
    const currentRewrittenQuotes = textForModalAndAcceptance.match(/"([^"]+)"/g) || [];

    if (originalQuotes.length === currentRewrittenQuotes.length) {
      let tempRewritten = textForModalAndAcceptance;
      for (let i = 0; i < originalQuotes.length; i++) {
        // Be careful with replace, only replace one instance at a time if quotes are identical
        tempRewritten = tempRewritten.replace(currentRewrittenQuotes[i], originalQuotes[i]);
      }
      textForModalAndAcceptance = tempRewritten;
    }
  }

  const onAcceptAll = (acceptedText: string) => {
    // Case 1: There was a selection - directly replace it
    if (isSel && editor.getSelection() === originalText) {
      editor.replaceSelection(acceptedText);
    } 
    // Case 2: The original text is exactly one line
    else if (originalLineText !== null && originalLineText === originalText) {
      // Replace the entire line content
      editor.replaceRange(acceptedText, 
        { line: originalLine, ch: 0 }, 
        { line: originalLine, ch: originalLineText.length });
    }
    // Case 3: Find the exact text in the document
    else {
      // Try to find the text in the document
      const docText = editor.getValue();
      const startPos = docText.indexOf(originalText);
      
      if (startPos >= 0) {
        // Convert string position to editor position
        const startCoords = editor.offsetToPos(startPos);
        const endCoords = editor.offsetToPos(startPos + originalText.length);
        editor.replaceRange(acceptedText, startCoords, endCoords);
      } 
      // Case 4: Fallback - use cursor position and line replacement
      else if (originalLineText !== null) {
        // Replace the entire line as fallback
        editor.replaceRange(acceptedText, 
          { line: originalLine, ch: 0 }, 
          { line: originalLine, ch: originalLineText.length });
      }
    }
    showNotice("☕️ Rewrite accepted!");
  };

  // The modal will internally use originalText and textForModalAndAcceptance to create the diff view
  // For Quick Rewrite, we want to show the diff by default but let users toggle it if desired
  new RewriteModal(
    plugin.app, 
    originalText, 
    textForModalAndAcceptance, 
    onAcceptAll, 
    true, // Show diff by default
    rewriteNote, // Pass the note from the LLM
    () => {
      new ChooseTextModal(
        plugin.app,
        originalText,
        textForModalAndAcceptance,
        (selectedText: string) => {
          new TailoredPromptModal(plugin.app, selectedText, plugin, editor).open();
        }
      ).open();
    }
  ).open();
}