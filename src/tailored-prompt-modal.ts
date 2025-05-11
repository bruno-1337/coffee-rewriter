import { App, Modal, Setting, TextAreaComponent, MarkdownRenderer, Editor, Notice, Component } from "obsidian";
import CoffeeRewriter from "./main"; // Assuming main.ts exports CoffeeRewriter plugin class
import { requestRewrite } from "./llm/index";
import { RewriteModal } from "./rewrite-modal";

export class TailoredPromptModal extends Modal {
  private selectedText: string;
  private plugin: CoffeeRewriter;
  private editor: Editor; // Keep editor reference if needed for future complex replacements
  private promptTextArea!: TextAreaComponent;

  constructor(app: App, selectedText: string, plugin: CoffeeRewriter, editor: Editor) {
    super(app);
    this.selectedText = selectedText;
    this.plugin = plugin;
    this.editor = editor;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("coffee-tailored-prompt-modal");

    contentEl.createEl("h2", { text: "Tailor Rewrite Prompt" });

    // Display selected text (read-only)
    contentEl.createEl("h4", { text: "Text to Rewrite:" });
    const selectedTextContainer = contentEl.createDiv("modal-selected-text-display");
    MarkdownRenderer.render(this.app, this.selectedText, selectedTextContainer, "", this as unknown as Component);
    
    // --- Prompt Input Area ---
    // Label for the prompt textarea
    const promptLabelSetting = new Setting(contentEl)
      .setName("Prompt:")
      .setDesc("Enter the specific instructions for rewriting the text above. Example: Make this more formal.");

    // Create a dedicated container for the TextAreaComponent
    const promptInputDiv = contentEl.createDiv();
    promptInputDiv.addClass("coffee-tailored-prompt-input-container"); 
    promptInputDiv.style.width = "100%"; // Ensure the container div takes full width

    this.promptTextArea = new TextAreaComponent(promptInputDiv) // Add textarea to this new div
      .setValue("Rewrite this text ")
      .setPlaceholder("e.g., Make this more concise, or Explain this like I'm five...");
    
    const taEl = this.promptTextArea.inputEl;
    taEl.rows = 6; 
    taEl.style.width = "100%"; // Ensure the textarea element itself takes full width

    // Action Buttons
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText("Rewrite")
          .setCta()
          .onClick(async () => {
            const customPrompt = this.promptTextArea.getValue();
            if (!customPrompt.trim()) {
              new Notice("Please enter a prompt.");
              return;
            }
            this.close(); // Close this modal first
            await this.handleRewrite(customPrompt);
          }))
      .addButton((btn) =>
        btn.setButtonText("Cancel").onClick(() => {
          this.close();
        }));
  }

  private async handleRewrite(customPrompt: string) {
    new Notice("☕️ Calling LLM with tailored prompt...");

    const response = await requestRewrite(this.plugin.cfg, this.selectedText, customPrompt);

    if (!response) {
      new Notice("Coffee Rewriter: Tailored rewrite request failed or returned empty.");
      return;
    }

    // Extract the text and note from the response
    const rewrittenText = response.rewrittenText;
    const rewriteNote = response.note;

    // Trim the result from LLM before comparison or display
    const trimmedRewrittenText = rewrittenText.trim();

    if (trimmedRewrittenText === this.selectedText.trim()) {
      new Notice("✅ Text looks good, tailored prompt resulted in no changes.");
      return;
    }
    
    const onAcceptAll = (acceptedText: string) => {
        const currentSelection = this.editor.getSelection();
        if (currentSelection === this.selectedText) { // Double check if selection is still the same
            this.editor.replaceSelection(acceptedText);
        } else {
            const selObj = this.editor.listSelections()[0]; // Attempt to get current selection loc
            if (selObj) {
                 this.editor.replaceRange(acceptedText, selObj.anchor, selObj.head);
            } else {
                new Notice("Could not apply rewrite: editor selection changed.");
                return;
            }
        }
        new Notice("☕️ Tailored rewrite accepted!");
    };

    // Open the standard review modal, telling it not to show a diff, but include the note
    new RewriteModal(
      this.app, 
      this.selectedText, 
      trimmedRewrittenText, 
      onAcceptAll, 
      false, // Don't show diff for tailored rewrites
      rewriteNote // Include the note from the LLM
    ).open();
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 