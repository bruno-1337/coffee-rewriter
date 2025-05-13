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

    // Modal header with instructions
    contentEl.createEl("h2", { text: "Choose Your Preferred Version" });
    
    // Instruction text
    const instructionDiv = contentEl.createDiv("choose-text-instructions");
    instructionDiv.setText("Click on a version to select it for further editing.");
    
    // Create vertical container for options
    const optionsContainer = contentEl.createDiv("choose-text-options-container");

    // Original Text Pane
    this.originalContainer = optionsContainer.createDiv("text-container original-text-container");
    const originalHeader = this.originalContainer.createEl("h4", { text: "Original Text" });
    
    const originalContentDiv = this.originalContainer.createDiv("modal-text-content");
    MarkdownRenderer.render(this.app, this.originalText, originalContentDiv, "", this as unknown as Component);
    this.originalContainer.onClickEvent(() => this.selectPane('original'));

    // Rewritten Text Pane
    this.rewrittenContainer = optionsContainer.createDiv("text-container rewritten-text-container");
    const rewrittenHeader = this.rewrittenContainer.createEl("h4", { text: "Rewritten Text" });
    
    const rewrittenContentDiv = this.rewrittenContainer.createDiv("modal-text-content");
    MarkdownRenderer.render(this.app, this.rewrittenText, rewrittenContentDiv, "", this as unknown as Component);
    this.rewrittenContainer.onClickEvent(() => this.selectPane('rewritten'));

    // Create our continue button with default CTA styling
    const continueButton = contentEl.createEl("button", {
      text: "Continue with selected text",
      cls: "mod-cta coffee-choose-text-continue-button"
    });
    continueButton.disabled = true;
    continueButton.addEventListener("click", () => {
      if (this.selectedPane) {
        const text = this.selectedPane === 'original' ? this.originalText : this.rewrittenText;
        this.onSelect(text);
        this.close();
      }
    });
    
    // Store reference to button for later use
    this.selectButton = {
      buttonEl: continueButton,
      setCta: () => { return this; },
      setButtonText: (text: string) => { continueButton.textContent = text; return this; },
      setDisabled: (disabled: boolean) => { continueButton.disabled = disabled; return this; },
      onClick: (callback: () => void) => { 
        continueButton.addEventListener("click", callback); 
        return this; 
      }
    } as unknown as ButtonComponent;
  }

  private selectPane(pane: 'original' | 'rewritten') {
    this.selectedPane = pane;
    
    // Reset both containers
    this.originalContainer.removeClass('selected');
    this.rewrittenContainer.removeClass('selected');
    
    // Add selected class to the chosen one
    if (pane === 'original') {
      this.originalContainer.addClass('selected');
    } else {
      this.rewrittenContainer.addClass('selected');
    }
    
    // Enable the button
    this.selectButton.setDisabled(false);
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 