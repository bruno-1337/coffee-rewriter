import { App, Modal, Setting, TextAreaComponent, MarkdownRenderer, Editor, Notice, Component, DropdownComponent } from "obsidian";
import CoffeeRewriter from "./main";
import { requestRewrite } from "./llm/index";
import { RewriteModal } from "./rewrite-modal";
import { PromptTemplate } from "./types/settings";
import { ChooseTextModal } from "./choose-text-modal";

export class TailoredPromptModal extends Modal {
  private selectedText: string;
  private plugin: CoffeeRewriter;
  private editor: Editor; 
  private promptTextArea!: TextAreaComponent;
  private promptSelect!: DropdownComponent;
  private customPromptContainer!: HTMLDivElement;
  private chosenPromptTemplate: PromptTemplate | null = null;
  private readonly CUSTOM_PROMPT_ID = "__custom__";
  private promptPreviewArea!: HTMLDivElement;
  private textToRewrite: string;

  constructor(app: App, selectedText: string, plugin: CoffeeRewriter, editor: Editor) {
    super(app);
    this.selectedText = selectedText;
    this.plugin = plugin;
    this.editor = editor;
    this.textToRewrite = selectedText;
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("coffee-tailored-prompt-modal");

    contentEl.createEl("h2", { text: "Tailored Rewrite" });

    // --- Display selected text --- Start
    const textPreviewContainer = contentEl.createDiv("text-container original-text-container text-to-rewrite-container");
    new Setting(textPreviewContainer)
      .setName('Text to Rewrite:')
      .setHeading()
      .settingEl.addClass('coffee-text-to-rewrite-label');

    const textPreviewContentDiv = textPreviewContainer.createDiv("modal-text-content");
    MarkdownRenderer.render(this.app, this.textToRewrite, textPreviewContentDiv, "", this as unknown as Component);
    // --- Display selected text --- End

    // 1. Create the Setting for the dropdown first
    const dropdownSetting = new Setting(contentEl)
      .setName("Prompt Template");
    // 2. Create the containers for preview and custom input next
    // These will be direct children of contentEl, appearing after dropdownSetting.settingEl
    this.promptPreviewArea = contentEl.createDiv();
    this.promptPreviewArea.addClass("coffee-tailored-prompt-preview");
    this.promptPreviewArea.style.display = "none"; 

    this.customPromptContainer = contentEl.createDiv("custom-prompt-container-div");
    this.customPromptContainer.addClass("coffee-tailored-custom-prompt-container");
    this.customPromptContainer.style.display = "none";

    // 3. Now add the dropdown to its Setting, and configure its behavior
    dropdownSetting.addDropdown(dd => {
        this.promptSelect = dd;
        // Add saved prompts
        this.plugin.cfg.promptTemplates.forEach(template => {
          dd.addOption(template.id, template.name);
        });
        // Add option for custom prompt
        dd.addOption(this.CUSTOM_PROMPT_ID, "-- Write a new custom prompt --");

        // Determine initial selection
        let initialSelectionIsCustom = true; // Assume custom if no templates
        if (this.plugin.cfg.promptTemplates.length > 0) {
          dd.setValue(this.plugin.cfg.promptTemplates[0].id);
          this.chosenPromptTemplate = this.plugin.cfg.promptTemplates[0];
          initialSelectionIsCustom = false;
        } else {
          dd.setValue(this.CUSTOM_PROMPT_ID);
          // this.chosenPromptTemplate remains null
        }

        // Set initial UI state based on the determined selection
        // this.promptPreviewArea and this.customPromptContainer are now defined
        this.toggleCustomPromptUI(initialSelectionIsCustom);
        this.updatePromptPreview(dd.getValue()); 

        // Handle changes to the dropdown
        dd.onChange(value => {
          const isCustom = value === this.CUSTOM_PROMPT_ID;
          if (isCustom) {
            this.chosenPromptTemplate = null;
          } else {
            this.chosenPromptTemplate = this.plugin.cfg.promptTemplates.find(t => t.id === value) || null;
          }
          this.toggleCustomPromptUI(isCustom);
          this.updatePromptPreview(value);
        });
      });
    
    // 4. Setup Custom Prompt Text Area (inside the customPromptContainer)
    // This setting is appended to this.customPromptContainer, not contentEl directly here.
    const customPromptSetting = new Setting(this.customPromptContainer)
      .setName("Custom Prompt")
      .setDesc("Enter your custom prompt. The selected text will be appended to this.");
    
    customPromptSetting.addTextArea(textArea => {
        this.promptTextArea = textArea;
        textArea.inputEl.rows = 5;
        textArea.inputEl.cols = 50;
        textArea.setPlaceholder("Example: Summarize this text for a 5-year-old.");
        textArea.inputEl.addClass("coffee-tailored-prompt-textarea");
      });

    // 5. Action Button (appended to contentEl, so appears last)
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText("Rewrite with this prompt")
        .setCta()
        .onClick(() => {
          let finalPromptText = "";
          if (this.chosenPromptTemplate) {
            finalPromptText = this.chosenPromptTemplate.prompt;
          } else if (this.promptTextArea.getValue().trim()) {
            finalPromptText = this.promptTextArea.getValue().trim();
          } else {
            new Notice("Please select a template or enter a custom prompt.");
            return;
          }
          this.close();
          this.handleRewrite(finalPromptText);
        })
      );
  }

  private toggleCustomPromptUI(showCustom: boolean) {
    // Ensure containers exist before trying to change their style
    if (this.customPromptContainer && this.promptPreviewArea) {
        if (showCustom) {
            this.customPromptContainer.style.display = "block";
            this.promptPreviewArea.style.display = "none"; 
        } else {
            this.customPromptContainer.style.display = "none";
            this.promptPreviewArea.style.display = "block"; 
        }
    }
  }

  private updatePromptPreview(selectedId: string | null) {
    if (!this.promptPreviewArea) return; // Guard against null element

    if (selectedId && selectedId !== this.CUSTOM_PROMPT_ID) {
      const template = this.plugin.cfg.promptTemplates.find(t => t.id === selectedId);
      if (template) {
        this.promptPreviewArea.textContent = template.prompt;
      } else {
        this.promptPreviewArea.textContent = "Prompt not found."; // Should not happen if IDs are consistent
      }
    } else {
      // Clear content when "custom prompt" is selected or no valid ID
      this.promptPreviewArea.textContent = ""; 
    }
  }

  private async handleRewrite(promptToUse: string) {
    new Notice("☕️ Calling LLM with tailored prompt...");

    const response = await requestRewrite(this.plugin.cfg, this.selectedText, promptToUse);

    if (!response) {
      new Notice("Coffee Rewriter: Tailored rewrite request failed or returned empty.");
      return;
    }

    const rewrittenText = response.rewrittenText;
    const rewriteNote = response.note;
    const trimmedRewrittenText = rewrittenText.trim();

    if (trimmedRewrittenText === this.selectedText.trim()) {
      new Notice("✅ Text looks good, tailored prompt resulted in no changes.");
      return;
    }
    
    const onAcceptAll = (acceptedText: string) => {
        // Check if there's a selection to replace
        const currentSelection = this.editor.getSelection();
        if (currentSelection && currentSelection === this.selectedText) { 
            // Direct selection replacement is reliable
            this.editor.replaceSelection(acceptedText);
        } else {
            // Search for the exact text in the document to replace it at its location
            const currentLine = this.editor.getCursor().line;
            const currentLineText = this.editor.getLine(currentLine);
            
            if (currentLineText === this.selectedText) {
                // Replace the entire line if it matches
                this.editor.replaceRange(acceptedText, 
                    { line: currentLine, ch: 0 }, 
                    { line: currentLine, ch: currentLineText.length });
            } else {
                // Try to find the text in the document
                const docText = this.editor.getValue();
                const startPos = docText.indexOf(this.selectedText);
                
                if (startPos >= 0) {
                    // Convert string position to editor position
                    const startCoords = this.editor.offsetToPos(startPos);
                    const endCoords = this.editor.offsetToPos(startPos + this.selectedText.length);
                    this.editor.replaceRange(acceptedText, startCoords, endCoords);
                } else {
                    // Fallback to using the selection object if available
                    const selObj = this.editor.listSelections()[0];
                    if (selObj) {
                        this.editor.replaceRange(acceptedText, selObj.anchor, selObj.head);
                    } else {
                        new Notice("Could not locate the original text to replace.");
                        return;
                    }
                }
            }
        }
        new Notice("☕️ Tailored rewrite accepted!");
    };

    new RewriteModal(
      this.app,
      this.selectedText,
      trimmedRewrittenText,
      onAcceptAll,
      false, // Don't show diff by default for tailored rewrites
      rewriteNote,
      () => {
        new ChooseTextModal(
          this.app,
          this.selectedText,
          trimmedRewrittenText,
          (selectedText: string) => {
            new TailoredPromptModal(this.app, selectedText, this.plugin, this.editor).open();
          }
        ).open();
      }
    ).open();
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 