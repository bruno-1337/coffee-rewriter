import { App, Modal, Setting, TextAreaComponent, MarkdownRenderer, Editor, Notice, Component, DropdownComponent } from "obsidian";
import CoffeeRewriter from "./main";
import { requestRewrite } from "./llm/index";
import { RewriteModal } from "./rewrite-modal";
import { PromptTemplate } from "./types/settings";

export class TailoredPromptModal extends Modal {
  private selectedText: string;
  private plugin: CoffeeRewriter;
  private editor: Editor; 
  private promptTextArea!: TextAreaComponent;
  private promptSelect!: DropdownComponent;
  private customPromptContainer!: HTMLDivElement;
  private chosenPromptTemplate: PromptTemplate | null = null;
  private readonly CUSTOM_PROMPT_ID = "__custom__";

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

    contentEl.createEl("h2", { text: "Tailored Rewrite" });

    contentEl.createEl("p", { text: "Select a prompt template or write your own:" });

    new Setting(contentEl)
      .setName("Prompt Template")
      .addDropdown(dd => {
        this.promptSelect = dd;
        // Add saved prompts
        this.plugin.cfg.promptTemplates.forEach(template => {
          dd.addOption(template.id, template.name);
        });
        // Add option for custom prompt
        dd.addOption(this.CUSTOM_PROMPT_ID, "-- Write a new custom prompt --");

        // Set initial value (e.g., first template or custom if no templates)
        if (this.plugin.cfg.promptTemplates.length > 0) {
          dd.setValue(this.plugin.cfg.promptTemplates[0].id);
          this.chosenPromptTemplate = this.plugin.cfg.promptTemplates[0];
          this.toggleCustomPromptUI(false); // Initially hide custom UI if a template is selected
        } else {
          dd.setValue(this.CUSTOM_PROMPT_ID);
          this.toggleCustomPromptUI(true); // Show custom UI if no templates
        }

        dd.onChange(value => {
          if (value === this.CUSTOM_PROMPT_ID) {
            this.chosenPromptTemplate = null;
            this.toggleCustomPromptUI(true);
          } else {
            this.chosenPromptTemplate = this.plugin.cfg.promptTemplates.find(t => t.id === value) || null;
            this.toggleCustomPromptUI(false);
          }
        });
      });
    
    // Container for custom prompt - initially hidden if a template is selected
    this.customPromptContainer = contentEl.createDiv("custom-prompt-container-div");
    this.customPromptContainer.addClass("coffee-tailored-custom-prompt-container");

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

    // Initially hide or show custom prompt UI based on dropdown
    this.toggleCustomPromptUI(this.promptSelect.getValue() === this.CUSTOM_PROMPT_ID);

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

  private toggleCustomPromptUI(show: boolean) {
    if (this.customPromptContainer) { // Check if the element exists
        if (show) {
            this.customPromptContainer.style.display = "block";
        } else {
            this.customPromptContainer.style.display = "none";
        }
    }
  }

  private async handleRewrite(promptToUse: string) {
    new Notice("☕️ Calling LLM with tailored prompt...");

    const response = await requestRewrite(this.plugin.cfg, this.selectedText, promptToUse);

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