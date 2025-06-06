import { App, MarkdownRenderer, Modal, Setting, Component, ToggleComponent } from "obsidian";
import { annotateDiff } from "./diff"; // Import annotateDiff
import { DiffResult } from "./types/diff"; // Import DiffResult type

export class RewriteModal extends Modal {
  private originalText: string;
  private rewrittenText: string; // This will be the clean rewritten text for accepting
  private rewriteNote: string | undefined; // Optional note about the rewrite
  private onAcceptAll: (rewrittenText: string) => void;
  private showDiff: boolean;
  private onRetry: (() => void) | undefined;
  private rewrittenContentDiv!: HTMLDivElement;

  constructor(
    app: App, 
    originalText: string, 
    rewrittenText: string, 
    onAcceptAll: (rewrittenText: string) => void, 
    showDiff: boolean = false, // Default to no diff (consistent with tailored rewrite)
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

    // Modal header
    contentEl.createEl("h2", { text: "Review Your Rewrite" });

    // --- Note about the rewrite (if available) ---
    if (this.rewriteNote) {
      const noteContainer = contentEl.createDiv("note-container");
      new Setting(noteContainer)
        .setName("Note from the AI")
        .setHeading();
      const noteContent = noteContainer.createDiv("note-content");
      noteContent.setText(this.rewriteNote);
    }

    // --- Diff Toggle Control ---
    const toggleSetting = new Setting(contentEl)
      .setName("Show changes highlighted")
      .setDesc("Toggle to highlight the differences between original and rewritten text")
      .addToggle(toggle => {
        toggle.setValue(this.showDiff);
        toggle.onChange(value => {
          this.showDiff = value;
          this.updateRewrittenText();
        });
      });
    toggleSetting.settingEl.addClass("diff-toggle");

    // Vertical layout container
    const textComparisonContainer = contentEl.createDiv("text-comparison-container");
    textComparisonContainer.addClass("two-column-grid");
    // --- Original Text Pane ---
    const originalContainer = textComparisonContainer.createDiv("text-container original-text-container");
    new Setting(originalContainer)
      .setName("Original")
      .setHeading();
    const originalContentDiv = originalContainer.createDiv("modal-text-content");
    // Render original text, including any Markdown it might contain
    MarkdownRenderer.render(this.app, this.originalText, originalContentDiv, "", this as unknown as Component);

    // --- Rewritten Text Pane ---
    const rewrittenContainer = textComparisonContainer.createDiv("text-container rewritten-text-container");
    new Setting(rewrittenContainer)
      .setName("Rewritten text")
      .setHeading();
    this.rewrittenContentDiv = rewrittenContainer.createDiv("modal-text-content");
    
    // Initial render of rewritten text
    this.updateRewrittenText();

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
          .setButtonText("Try with new prompt")
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
  }

  private updateRewrittenText() {
    if (!this.rewrittenContentDiv) return;
    
    // Clear the content div
    this.rewrittenContentDiv.empty();
    
    if (this.showDiff) {
      const diffResult: DiffResult = annotateDiff(this.originalText, this.rewrittenText);
      const annotatedRewrittenText = diffResult.annotated;
      MarkdownRenderer.render(this.app, annotatedRewrittenText, this.rewrittenContentDiv, "", this as unknown as Component);
    } else {
      // Just show the plain rewritten text, but still render its Markdown
      MarkdownRenderer.render(this.app, this.rewrittenText, this.rewrittenContentDiv, "", this as unknown as Component);
    }
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 