import { App, Modal, Setting, TextAreaComponent, MarkdownRenderer, Editor, Notice, Component, DropdownComponent } from "obsidian";
import CoffeeRewriter from "./main";
import { requestRewrite } from "./llm/index";
import { RewriteModal } from "./rewrite-modal";
import { PromptTemplate } from "./types/settings";
import { ChooseTextModal } from "./choose-text-modal";
import { getPrecedingParagraphs } from "./utils/editor-utils";

type ContextScope = "none" | "full" | "paragraphs";

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

    contentEl.createEl("h2", { text: "Tailored rewrite" });

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
      .setName("Prompt template");
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
    
    // --- Context Settings --- Start
    new Setting(contentEl)
      .setName("Include Context")
      .setDesc("Provide surrounding text to the LLM for better understanding. (increases cost on non-free models)")
      .addToggle(toggle => toggle
        .setValue(this.contextEnabled)
        .onChange(value => {
          this.contextEnabled = value;
          this.contextScope = this.contextEnabled ? "paragraphs" : "none"; // Default to paragraphs when enabled
          this.toggleContextOptionsUI();
          // Update the scope dropdown if it exists
          if (this.contextOptionsSetting?.controlEl.querySelector('select')) {
              (this.contextOptionsSetting.controlEl.querySelector('select') as HTMLSelectElement).value = this.contextScope;
          }
        }));
    
    // Container for context scope options (initially hidden)
    const contextOptionsContainer = contentEl.createDiv("context-options-container");
    this.contextOptionsSetting = new Setting(contextOptionsContainer)
      .setName("Context Scope")
      .addDropdown(dd => {
        dd.addOption("paragraphs", "Previous 3 Paragraphs");
        dd.addOption("full", "Full Document");
        dd.setValue(this.contextScope) // Initial value (likely 'none' or 'paragraphs')
          .onChange(value => {
            this.contextScope = value as ContextScope;
          });
      });
    this.toggleContextOptionsUI(); // Set initial visibility based on contextEnabled
    // --- Context Settings --- End

    // 4. Setup Custom Prompt Text Area (inside the customPromptContainer)
    // This setting is appended to this.customPromptContainer, not contentEl directly here.
    const customPromptSetting = new Setting(this.customPromptContainer)
      .setName("Custom prompt")
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
          this.handleRewrite(finalPromptText, this.contextScope);
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

  private toggleContextOptionsUI() {
      if (this.contextOptionsSetting) {
          if (this.contextEnabled) {
              this.contextOptionsSetting.settingEl.style.display = ''; // Show
              // Ensure the dropdown reflects the current scope if just enabled
              if (this.contextScope === 'none') this.contextScope = 'paragraphs'; // Default
              if (this.contextOptionsSetting?.controlEl.querySelector('select')) {
                   (this.contextOptionsSetting.controlEl.querySelector('select') as HTMLSelectElement).value = this.contextScope;
              }
          } else {
              this.contextOptionsSetting.settingEl.style.display = 'none'; // Hide
              this.contextScope = 'none'; // Reset scope when context is disabled
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