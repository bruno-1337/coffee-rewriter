import { App, Modal, MarkdownRenderer, Component, Setting, ButtonComponent } from "obsidian";

/**
 * Modal to let user choose between original and rewritten text.
 */
export class ChooseTextModal extends Modal {
  private originalText: string;
  private rewrittenText: string;
  private onSelect: (selectedText: string) => void;
  private selectedPane: 'original' | 'rewritten' | null = null;
  private originalContainer!: HTMLDivElement;
  private rewrittenContainer!: HTMLDivElement;
  private selectButton!: ButtonComponent;

  constructor(
    app: App,
    originalText: string,
    rewrittenText: string,
    onSelect: (selectedText: string) => void
  ) {
    super(app);
    this.originalText = originalText;
    this.rewrittenText = rewrittenText;
    this.onSelect = onSelect;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("coffee-choose-text-modal");

    contentEl.createEl("h2", { text: "Use Original or Rewritten Text?" });

    // Original Text Pane
    this.originalContainer = contentEl.createDiv("text-container original-text-container");
    this.originalContainer.createEl("h4", { text: "Original Text" });
    const originalContentDiv = this.originalContainer.createDiv("modal-text-content");
    MarkdownRenderer.render(this.app, this.originalText, originalContentDiv, "", this as unknown as Component);
    this.originalContainer.onClickEvent(() => this.selectPane('original'));

    // Rewritten Text Pane
    this.rewrittenContainer = contentEl.createDiv("text-container rewritten-text-container");
    this.rewrittenContainer.createEl("h4", { text: "Rewritten Text" });
    const rewrittenContentDiv = this.rewrittenContainer.createDiv("modal-text-content");
    MarkdownRenderer.render(this.app, this.rewrittenText, rewrittenContentDiv, "", this as unknown as Component);
    this.rewrittenContainer.onClickEvent(() => this.selectPane('rewritten'));

    // Select Button
    new Setting(contentEl)
      .addButton(btn => this.selectButton = btn
        .setButtonText("Select this text")
        .setCta()
        .setDisabled(true)
        .onClick(() => {
          if (this.selectedPane) {
            const text = this.selectedPane === 'original' ? this.originalText : this.rewrittenText;
            this.onSelect(text);
            this.close();
          }
        }));
  }

  private selectPane(pane: 'original' | 'rewritten') {
    this.selectedPane = pane;
    this.originalContainer.removeClass('selected');
    this.rewrittenContainer.removeClass('selected');
    if (pane === 'original') {
      this.originalContainer.addClass('selected');
    } else {
      this.rewrittenContainer.addClass('selected');
    }
    this.selectButton.setDisabled(false);
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 