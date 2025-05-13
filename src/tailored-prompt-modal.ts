import { App, Modal, Setting, TextAreaComponent, MarkdownRenderer, Editor, Notice, Component, DropdownComponent } from "obsidian";
import CoffeeRewriter from "./main";
import { requestRewrite } from "./llm/index";
import { RewriteModal } from "./rewrite-modal";
import { PromptTemplate } from "./types/settings";
import { ChooseTextModal } from "./choose-text-modal";
import { getPrecedingParagraphs, getPrecedingLines } from "./utils/editor-utils";

type ContextScope = "none" | "full" | "paragraphs" | "lines";

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
  private contextEnabled: boolean = false;
  private contextScope: ContextScope = "none";
  private contextOptionsSetting: Setting | null = null;
  private contextLinesCount: number = 3;
  private contextLinesSetting: Setting | null = null;

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

    // Add a proper header
    contentEl.createEl("h2", { text: "Tailor Your Rewrite" });

    // Create main sections container
    const mainSectionsContainer = contentEl.createDiv("tailored-prompt-sections");

    // --- Text Preview Section ---
    const textPreviewSection = mainSectionsContainer.createDiv("tailored-prompt-section text-preview-section");
    
    // Section header with icon
    const textSectionHeader = textPreviewSection.createDiv("section-header");
    textSectionHeader.createEl("h3", { text: "Text to Rewrite" });
    
    // Text preview with scrollable container and border
    const textPreviewContainer = textPreviewSection.createDiv("text-container text-to-rewrite-container");
    const textPreviewContentDiv = textPreviewContainer.createDiv("modal-text-content");
    MarkdownRenderer.render(this.app, this.textToRewrite, textPreviewContentDiv, "", this as unknown as Component);

    // --- Prompt Configuration Section ---
    const promptConfigSection = mainSectionsContainer.createDiv("tailored-prompt-section prompt-config-section");
    
    // Section header with icon
    const promptSectionHeader = promptConfigSection.createDiv("section-header");
    promptSectionHeader.createEl("h3", { text: "Customize Prompt" });
    
    // 1. Template selector dropdown with visual enhancement
    const promptSelector = new Setting(promptConfigSection)
      .setName("Choose a template")
      .setDesc("Select from saved templates or write your own prompt");
    
    promptSelector.settingEl.addClass("prompt-selector-setting");
    
    promptSelector.addDropdown(dd => {
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

      // Set initial UI state
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

    // Template preview area for selected template
    this.promptPreviewArea = promptConfigSection.createDiv("prompt-preview-container");
    this.promptPreviewArea.addClass("coffee-tailored-prompt-preview");
    this.promptPreviewArea.addClass("coffee-hidden");

    // Custom prompt input area
    this.customPromptContainer = promptConfigSection.createDiv("custom-prompt-container-div");
    this.customPromptContainer.addClass("coffee-tailored-custom-prompt-container");
    this.customPromptContainer.addClass("coffee-hidden");
    
    const customPromptSetting = new Setting(this.customPromptContainer)
      .setName("Your custom prompt")
      .setDesc("Enter instructions for how the text should be rewritten");
    
    customPromptSetting.addTextArea(textArea => {
      this.promptTextArea = textArea;
      textArea.inputEl.rows = 5;
      textArea.setPlaceholder("Example: Summarize this text for a 5-year-old.");
      textArea.inputEl.addClass("coffee-tailored-prompt-textarea");
    });

    // --- Context Options Section ---
    const contextOptionsContainer = mainSectionsContainer.createDiv("tailored-prompt-section context-options-section");
    
    // Section header with icon
    const contextSectionHeader = contextOptionsContainer.createDiv("section-header");
    contextSectionHeader.createEl("h3", { text: "Context Options" });
    
    new Setting(contextOptionsContainer)
      .setName("Include Context")
      .setDesc("Provide surrounding text to the LLM for better understanding. (increases cost on non-free models)")
      .addToggle(toggle => toggle
        .setValue(this.contextEnabled)
        .onChange(value => {
          this.contextEnabled = value;
          this.contextScope = this.contextEnabled ? "paragraphs" : "none";
          this.toggleContextOptionsUI();
          // Update the scope dropdown if it exists
          if (this.contextOptionsSetting?.controlEl.querySelector('select')) {
              (this.contextOptionsSetting.controlEl.querySelector('select') as HTMLSelectElement).value = this.contextScope;
          }
        }));
    
    const ctxOptionsContainer = contextOptionsContainer.createDiv("context-options-container");
    this.contextOptionsSetting = new Setting(ctxOptionsContainer)
      .setName("Context Scope")
      .addDropdown(dd => {
        dd.addOption("paragraphs", "Previous 3 Paragraphs");
        dd.addOption("lines", "Previous N Lines");
        dd.addOption("full", "Full Document");
        dd.setValue(this.contextScope)
          .onChange(value => {
            this.contextScope = value as ContextScope;
            this.toggleContextOptionsUI();
          });
      });
    this.toggleContextOptionsUI();

    // Lines count setting (hidden by default, only for 'lines' scope)
    this.contextLinesSetting = new Setting(ctxOptionsContainer)
      .setName("Number of lines before selection")
      .setDesc("How many lines before the selection to include as context")
      .addText(text => {
        const maxLines = this.editor.getCursor("from").line;
        this.contextLinesSetting?.setDesc(`How many lines before the selection to include as context (1-${maxLines || 1})`);

        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = String(maxLines || 1);
        text.setValue(String(this.contextLinesCount));
        text.onChange(val => {
          const currentMax = parseInt(text.inputEl.max, 10) || 1;
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0 && num <= currentMax) {
            this.contextLinesCount = num;
          } else if (!isNaN(num) && num > currentMax) {
            this.contextLinesCount = currentMax;
            text.setValue(String(currentMax));
          } else if (!isNaN(num) && num <= 0) {
            this.contextLinesCount = 1;
            text.setValue("1");
          }
        });
      });

    // --- Action Buttons ---
    const actionButtonContainer = contentEl.createDiv("tailored-prompt-actions");
    
    new Setting(actionButtonContainer)
      .addButton(button => button
        .setButtonText("Rewrite")
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
          this.handleRewrite(finalPromptText, this.contextScope);
        }))
      .addButton(button => button
        .setButtonText("Cancel")
        .onClick(() => {
          this.close();
        }));
  }

  private toggleCustomPromptUI(showCustom: boolean) {
    // Ensure containers exist before trying to change their style
    if (this.customPromptContainer && this.promptPreviewArea) {
        if (showCustom) {
            this.customPromptContainer.classList.remove('coffee-hidden');
            this.promptPreviewArea.classList.add('coffee-hidden'); 
        } else {
            this.customPromptContainer.classList.add('coffee-hidden');
            this.promptPreviewArea.classList.remove('coffee-hidden'); 
        }
    }
  }

  private toggleContextOptionsUI() {
      if (this.contextOptionsSetting?.settingEl) {
          if (this.contextEnabled) {
              this.contextOptionsSetting.settingEl.classList.remove('coffee-hidden');
              if (this.contextScope === 'none') this.contextScope = 'paragraphs';
          } else {
              this.contextOptionsSetting.settingEl.classList.add('coffee-hidden');
              this.contextScope = 'none';
          }
      }
      if (this.contextLinesSetting?.settingEl) {
          if (this.contextEnabled && this.contextScope === 'lines') {
              this.contextLinesSetting.settingEl.classList.remove('coffee-hidden');
          } else {
              this.contextLinesSetting.settingEl.classList.add('coffee-hidden');
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

  private async handleRewrite(promptToUse: string, contextScope: ContextScope) {
    new Notice("☕️ Calling LLM with tailored prompt...");

    let textToSend = this.selectedText;
    let contextPrefix = ""; // Initialize context prefix

    // --- Context Retrieval Logic ---
    if (contextScope === "full") {
      const fullDocText = this.editor.getValue();
      // Avoid including the selected text itself in the context if it's the whole doc
      // This simple check might not be robust for complex selections
      if (fullDocText !== this.selectedText) { 
        contextPrefix = `Context from the document:\n\`\`\`\n${fullDocText}\n\`\`\`\n\n---\n\n`;
      }
    } else if (contextScope === "paragraphs") {
      const precedingParagraphs = getPrecedingParagraphs(this.editor, 3);
      if (precedingParagraphs) {
          contextPrefix = `Context from preceding paragraphs:\n\`\`\`\n${precedingParagraphs}\n\`\`\`\n\n---\n\n`;
      }
    } else if (contextScope === "lines") {
      const precedingLines = getPrecedingLines(this.editor, this.contextLinesCount);
      if (precedingLines) {
        contextPrefix = `Context from preceding lines:\n\`\`\`\n${precedingLines}\n\`\`\`\n\n---\n\n`;
      }
    }
    // --- End Context Retrieval ---

    // Prepend context to the text if context was retrieved
    if (contextPrefix) {
      textToSend = `${contextPrefix}Based on the context above, rewrite the following text:\n\`\`\`\n${this.selectedText}\n\`\`\``;
      // Also, add context indication to the prompt instruction itself
      promptToUse = `${promptToUse}. Use the provided context for accuracy and relevance.`;
    } else {
      // If no context, use the original structure
      textToSend = this.selectedText; 
    }

    // Pass the potentially context-enhanced text to the LLM
    const response = await requestRewrite(this.plugin.cfg, textToSend, promptToUse);

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
    
    // Capture the text that was actually the input for *this* rewrite cycle
    const textActuallyRewritten = this.selectedText;
    
    const onAcceptAll = (acceptedText: string) => {
        // Check if there's a selection to replace
        const currentSelection = this.editor.getSelection();
        // Compare against the text that was actually rewritten in this cycle
        if (currentSelection && currentSelection === textActuallyRewritten) { 
            // Direct selection replacement is reliable
            this.editor.replaceSelection(acceptedText);
        } else {
            // Search for the exact text in the document to replace it at its location
            const currentLine = this.editor.getCursor().line;
            const currentLineText = this.editor.getLine(currentLine);
            
            // Compare against the text that was actually rewritten in this cycle
            if (currentLineText === textActuallyRewritten) {
                // Replace the entire line if it matches
                this.editor.replaceRange(acceptedText, 
                    { line: currentLine, ch: 0 }, 
                    { line: currentLine, ch: currentLineText.length });
            } else {
                // Try to find the text in the document
                const docText = this.editor.getValue();
                // Search for the text that was actually rewritten in this cycle
                const startPos = docText.indexOf(textActuallyRewritten);
                
                if (startPos >= 0) {
                    // Convert string position to editor position
                    const startCoords = this.editor.offsetToPos(startPos);
                    // Use the length of the text that was actually rewritten
                    const endCoords = this.editor.offsetToPos(startPos + textActuallyRewritten.length);
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
      textActuallyRewritten, // Pass the correct original text for comparison in the modal
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