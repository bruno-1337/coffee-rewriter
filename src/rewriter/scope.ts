import { Editor } from "obsidian";
import CoffeeRewriter from "../main";
import { requestRewrite } from "../llm/index";
import { showNotice } from "../utils/notice";
import { RewriteModal } from "../rewrite-modal";

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
    if (isSel) {
      editor.replaceSelection(acceptedText);
    } else if (originalLineText !== null) {
      // Replace the original line content precisely
      editor.replaceRange(acceptedText, { line: originalLine, ch: 0 }, { line: originalLine, ch: originalLineText.length });
    }
    showNotice("☕️ Rewrite accepted!");
  };

  // The modal will internally use originalText and textForModalAndAcceptance to create the diff view
  // For Quick Rewrite, we want to show the diff and include the note from the LLM
  new RewriteModal(
    plugin.app, 
    originalText, 
    textForModalAndAcceptance, 
    onAcceptAll, 
    true, // Show diff
    rewriteNote // Pass the note from the LLM
  ).open();
}