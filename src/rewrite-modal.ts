import { App, MarkdownRenderer, Modal, Setting, Component } from "obsidian";
import { annotateDiff } from "./diff"; // Import annotateDiff
import { DiffResult } from "./types/diff"; // Import DiffResult type

export class RewriteModal extends Modal {
  private originalText: string;
  private rewrittenText: string; // This will be the clean rewritten text for accepting
  private rewriteNote: string | undefined; // Optional note about the rewrite
  private onAcceptAll: (rewrittenText: string) => void;
  private showDiff: boolean;
  private onRetry: (() => void) | undefined;

  constructor(
    app: App, 
    originalText: string, 
    rewrittenText: string, 
    onAcceptAll: (rewrittenText: string) => void, 
    showDiff: boolean = true, // Default to true for existing Quick Rewrite
    rewriteNote?: string, // Optional note about the rewrite
    onRetry?: () => void
  ) {
    super(app);
    this.originalText = originalText;
    this.rewrittenText = rewrittenText; // Store the clean version
    this.rewriteNote = rewriteNote;
    this.onAcceptAll = onAcceptAll;
    this.showDiff = showDiff;
    this.onRetry = onRetry;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("coffee-rewrite-modal");

    contentEl.createEl("h2", { text: "Review Rewrite" });

    // --- Note about the rewrite (if available) ---
    if (this.rewriteNote) {
      const noteContainer = contentEl.createDiv("note-container");
      noteContainer.createEl("h4", { text: "Note from the AI" });
      const noteContent = noteContainer.createDiv("note-content");
      noteContent.setText(this.rewriteNote);
    }

    // --- Original Text Pane ---
    const originalContainer = contentEl.createDiv("text-container original-text-container");
    originalContainer.createEl("h4", { text: "Original" });
    const originalContentDiv = originalContainer.createDiv("modal-text-content");
    // Render original text, including any Markdown it might contain
    MarkdownRenderer.render(this.app, this.originalText, originalContentDiv, "", this as unknown as Component);

    // --- Rewritten Text Pane ---
    const rewrittenContainer = contentEl.createDiv("text-container rewritten-text-container");
    const rewrittenTitle = this.showDiff ? "Rewritten (changes highlighted)" : "Rewritten Text";
    rewrittenContainer.createEl("h4", { text: rewrittenTitle });
    const rewrittenContentDiv = rewrittenContainer.createDiv("modal-text-content");
    
    if (this.showDiff) {
      const diffResult: DiffResult = annotateDiff(this.originalText, this.rewrittenText);
      const annotatedRewrittenText = diffResult.annotated;
      MarkdownRenderer.render(this.app, annotatedRewrittenText, rewrittenContentDiv, "", this as unknown as Component);
    } else {
      // Just show the plain rewritten text, but still render its Markdown
      MarkdownRenderer.render(this.app, this.rewrittenText, rewrittenContentDiv, "", this as unknown as Component);
    }

    // --- Action Buttons ---
    const actionSetting = new Setting(contentEl)
      .addButton(btn =>
        btn
          .setButtonText("Accept")
          .setCta()
          .onClick(() => {
            this.onAcceptAll(this.rewrittenText);
            this.close();
          }));
    if (this.onRetry) {
      actionSetting.addButton(btn =>
        btn
          .setButtonText("Try again with a different prompt")
          .onClick(() => {
            this.close();
            this.onRetry!();
          }));
    }
    actionSetting.addButton(btn =>
      btn
        .setButtonText("Cancel")
        .onClick(() => {
          this.close();
        }));
    
    // Inline styles removed, will be handled by styles.css
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 