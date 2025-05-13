import { App, Modal, Setting, TextAreaComponent, TextComponent, Notice } from 'obsidian';
import CoffeeRewriter from './main';
import { PromptTemplate } from './types/settings';

// Simplified: only save action, delete is handled in settings UI
export type PromptSaveAction = { action: 'save'; template: PromptTemplate };

export class PromptEditModal extends Modal {
  private plugin: CoffeeRewriter;
  private template: PromptTemplate; // The template being edited or a new one to be populated
  private isNew: boolean;
  // Updated onSave to reflect simplified PromptSaveAction
  private onSave: (result: PromptSaveAction) => void;

  private nameInput?: TextComponent; // Optional: only initialized if not Quick Rewrite
  private promptInput!: TextAreaComponent;

  constructor(
    app: App, 
    plugin: CoffeeRewriter, 
    templateToEdit: PromptTemplate | null, 
    onSave: (result: PromptSaveAction) => void // Updated type
  ) {
    super(app);
    this.plugin = plugin;
    this.onSave = onSave;

    if (templateToEdit) {
      this.isNew = false;
      // Clone the template to avoid modifying the original object directly until save
      this.template = { ...templateToEdit }; 
    } else {
      this.isNew = true;
      this.template = {
        id: `custom-${new Date().getTime()}`, // Provisional ID, might be confirmed or changed by caller
        name: '',
        prompt: '',
      };
    }
  }

  override onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('coffee-prompt-edit-modal');

    contentEl.createEl('h2', { text: this.isNew ? 'Add New Prompt Template' : 'Edit Prompt Template' });

    // Determine if it's the Quick Rewrite template (only applicable if editing an existing one)
    const isQuickRewrite = !this.isNew && 
                           this.plugin.cfg.promptTemplates.length > 0 && 
                           this.plugin.cfg.promptTemplates[0].id === this.template.id;

    // Template Name (only show if not Quick Rewrite)
    if (!isQuickRewrite) {
      new Setting(contentEl)
        .setName('Template Name')
        .addText(text => {
          this.nameInput = text; // Initialize here
          text
            .setValue(this.template.name)
            .setPlaceholder('Enter template name (e.g., Summarize for Twitter)');
        });
    } // If it is Quick Rewrite, this.nameInput remains undefined.

    // Prompt Content Label (Setting without a control on the right)
    new Setting(contentEl)
      .setName('Prompt Content');
      // No .setDesc here, or it will appear to the right. Description is part of placeholder.

    // Prompt Content TextArea (created separately and appended)
    this.promptInput = new TextAreaComponent(contentEl)
      .setValue(this.template.prompt)
      .setPlaceholder('Enter the full prompt here. The selected text will be appended when used.');
    
    this.promptInput.inputEl.rows = 8;
    this.promptInput.inputEl.addClass('coffee-settings-prompt-textarea'); 

    // Buttons: Save and Cancel. Delete button removed from modal.
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Save')
        .setCta()
        .onClick(() => {
          // Only update name from input if the input was shown (i.e., not Quick Rewrite)
          if (this.nameInput) {
            this.template.name = this.nameInput.getValue().trim();
          } // Otherwise, this.template.name for Quick Rewrite is already set and correct.
          
          this.template.prompt = this.promptInput.getValue().trim();

          if (!this.template.name && !isQuickRewrite) { // Name required unless it's Quick Rewrite
            new Notice('Template name cannot be empty.');
            return;
          } else if (isQuickRewrite) {
            this.template.name = this.plugin.cfg.promptTemplates[0].name; // Ensure Quick Rewrite name is correct
          }

          if (!this.template.prompt) {
            new Notice('Prompt content cannot be empty.');
            return;
          }
          this.onSave({ action: 'save', template: this.template });
          this.close();
        }))
      .addButton(button => button
        .setButtonText('Cancel')
        .onClick(() => {
          this.close();
        }));
  }

  override onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 