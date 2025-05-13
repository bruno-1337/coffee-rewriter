import { App, PluginSettingTab, Setting, DropdownComponent, TextComponent, TextAreaComponent, Notice, ButtonComponent } from "obsidian";
import CoffeeRewriter from "./main";
import { CoffeeRewriterSettings, LlmProvider, PromptTemplate } from "./types/settings";
import { listOpenAiModels } from "./llm/openai";
import { listGeminiModels } from "./llm/gemini";
import { listLmStudioModels } from "./llm/lmstudio";
import { listClaudeModels } from "./llm/claude";
import { listOllamaModels } from "./llm/ollama";
import { PromptEditModal, PromptSaveAction } from "./PromptEditModal";

export const DEFAULT_SETTINGS: CoffeeRewriterSettings = {
  provider: "openai",
  openAiKey: "",
  openAiModel: "gpt-3.5-turbo",
  geminiKey: "",
  geminiModel: "gemini-pro",
  lmstudioEndpoint: "http://localhost:1234",
  lmStudioModel: "",
  promptTemplates: [
    {
      id: "default-quick-rewrite",
      name: "Quick rewrite",
      prompt: "Improve clarity, grammar, and conciseness of the following text."
    },
    {
      id: "pirate-speak",
      name: "Pirate speak",
      prompt: "Rewrite the following text as if you were a swashbuckling pirate, arrr! Keep the core meaning but infuse it with pirate slang and bravado."
    },
    {
      id: "professional-tone",
      name: "Professional tone",
      prompt: "Please rewrite the following text in a more professional and formal tone. Ensure clarity, conciseness, and appropriate business language. Avoid jargon where possible, or explain it if necessary."
    },
    {
      id: "academic-phd-style",
      name: "Academic (PhD style)",
      prompt: "Please revise the following text to reflect the style, depth, and rigor of a PhD-level academic paper. Focus on sophisticated vocabulary, nuanced argumentation, formal scholarly tone, and logical precision."
    }
  ],
  preserveQuotes: false,
  stripReasoning: false,
  claudeKey: "",
  claudeModel: "claude-3-haiku-20240307",
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "",
};

export class CoffeeRewriterSettingTab extends PluginSettingTab {
  private plugin: CoffeeRewriter;
  private selectedTemplateIdForEditing: string | null = null;
  private promptTemplateSettingsContainer!: HTMLDivElement;

  constructor(app: App, plugin: CoffeeRewriter) {
    super(app, plugin);
    this.plugin = plugin;
    if (this.plugin.cfg.promptTemplates && this.plugin.cfg.promptTemplates.length > 0) {
      this.selectedTemplateIdForEditing = this.plugin.cfg.promptTemplates[0].id;
    }
  }

  private addTextSetting(
    parent: HTMLElement,
    name: string,
    description: string,
    get: () => string,
    set: (v: string) => void,
    password = false,
  ): void {
    new Setting(parent)
      .setName(name)
      .setDesc(description)
      .addText((input: TextComponent) => {
        if (password) input.inputEl.type = "password";
        input
          .setValue(get())
          .onChange(async (val) => {
            set(val.trim());
            await this.plugin.saveSettings();
          });
      });
  }

  private async addModelDropdownSetting(
    parent: HTMLElement,
    name: string,
    description: string,
    provider: LlmProvider,
    get: () => string,
    set: (v: string) => void,
  ): Promise<void> {
    const settingControl = new Setting(parent).setName(name).setDesc(description);
    
    let currentDropdownComponent: DropdownComponent | null = null;
    let currentRefreshButtonComponent: ButtonComponent | null = null;

    const performModelLoadAndUpdateUI = async (isRefresh: boolean) => {
      if (!currentDropdownComponent) return;

      let prerequisitePresent = false;
      let prerequisiteName = "API Key";
      let prerequisiteSettingField = "";
      
      switch (provider) {
        case "openai":
          prerequisitePresent = !!this.plugin.cfg.openAiKey;
          prerequisiteName = "API Key";
          prerequisiteSettingField = "OpenAI API Key";
          break;
        case "gemini":
          prerequisitePresent = !!this.plugin.cfg.geminiKey;
          prerequisiteName = "API Key";
          prerequisiteSettingField = "Gemini API Key";
          break;
        case "claude":
          prerequisitePresent = !!this.plugin.cfg.claudeKey;
          prerequisiteName = "API Key";
          prerequisiteSettingField = "Claude API Key";
          break;
        case "lmstudio":
          prerequisitePresent = !!this.plugin.cfg.lmstudioEndpoint;
          prerequisiteName = "Server URL";
          prerequisiteSettingField = "LM Studio Server URL";
          break;
        case "ollama":
          prerequisitePresent = !!this.plugin.cfg.ollamaEndpoint;
          prerequisiteName = "Server URL";
          prerequisiteSettingField = "Ollama Server URL";
          break;
        default:
          currentDropdownComponent.selectEl.options.length = 0;
          currentDropdownComponent.addOption("", "--Provider error--");
          currentDropdownComponent.setValue("");
          currentDropdownComponent.selectEl.disabled = true;
          if (currentRefreshButtonComponent) currentRefreshButtonComponent.setDisabled(true);
          settingControl.setDesc(description + " (Unknown provider configuration)");
          return;
      }

      const prerequisitePlaceholder = `-- Set ${prerequisiteName} first --`;
      const fullPrerequisiteMessage = `Set ${prerequisiteSettingField} to load models`;

      if (!prerequisitePresent) {
        currentDropdownComponent.selectEl.options.length = 0;
        currentDropdownComponent.addOption("", prerequisitePlaceholder);
        currentDropdownComponent.setValue("");
        currentDropdownComponent.selectEl.disabled = true;
        if (currentRefreshButtonComponent) currentRefreshButtonComponent.setDisabled(true);
        settingControl.setDesc(description + ` (${fullPrerequisiteMessage})`);
        return;
      }

      currentDropdownComponent.selectEl.disabled = true;
      if (currentRefreshButtonComponent) currentRefreshButtonComponent.setDisabled(true);
      settingControl.setDesc(description + (isRefresh ? " (Refreshing models...)" : " (Loading models...)"));

      let models: string[] = [];
      try {
        switch (provider) {
          case "openai": models = await listOpenAiModels(this.plugin.cfg); break;
          case "gemini":
            models = await listGeminiModels(this.plugin.cfg);
            models = models.map(m => m.startsWith("models/") ? m.split("/")[1] : m);
            break;
          case "claude": models = await listClaudeModels(this.plugin.cfg); break;
          case "lmstudio": models = await listLmStudioModels(this.plugin.cfg); break;
          case "ollama": models = await listOllamaModels(this.plugin.cfg); break;
        }
      } catch (error) {
        new Notice(`Failed to load models for ${provider}. Check console.`);
        console.error(`Coffee Rewriter - Error loading models for ${provider}:`, error);
      }

      settingControl.setDesc(description);
      currentDropdownComponent.selectEl.disabled = false;
      if (currentRefreshButtonComponent) currentRefreshButtonComponent.setDisabled(false);

      currentDropdownComponent.selectEl.options.length = 0;
      if (models.length === 0) {
        currentDropdownComponent.addOption("", "-- No models found or loaded --");
      } else {
        currentDropdownComponent.addOption("", "-- Select model --");
        models.forEach(modelName => {
          if (currentDropdownComponent) currentDropdownComponent.addOption(modelName, modelName);
        });
      }
      currentDropdownComponent.setValue(get());
    };

    settingControl.addDropdown(async (dd: DropdownComponent) => {
      currentDropdownComponent = dd;
      dd.selectEl.options.length = 0;
      dd.addOption("", "-- Select model --");
      dd.setValue(get()); 

      dd.onChange(async (val) => {
        set(val);
        await this.plugin.saveSettings();
      });

      await performModelLoadAndUpdateUI(false); 
    });

    settingControl.addButton(button => {
      currentRefreshButtonComponent = button;
      button
        .setIcon("refresh-cw")
        .setTooltip("Refresh model list")
        .onClick(async () => {
          await performModelLoadAndUpdateUI(true);
        });
    });
  }

  private renderPromptTemplateEditor() {
    this.promptTemplateSettingsContainer.empty();

    if (!this.plugin.cfg.promptTemplates || this.plugin.cfg.promptTemplates.length === 0) {
      this.plugin.cfg.promptTemplates = DEFAULT_SETTINGS.promptTemplates.map(pt => ({...pt})); 
      this.plugin.saveSettings(); 
      this.selectedTemplateIdForEditing = this.plugin.cfg.promptTemplates.length > 0 ? this.plugin.cfg.promptTemplates[0].id : null;
    }
    if (!this.selectedTemplateIdForEditing && this.plugin.cfg.promptTemplates.length > 0) {
        this.selectedTemplateIdForEditing = this.plugin.cfg.promptTemplates[0].id;
    } else if (this.plugin.cfg.promptTemplates.length === 0) {
        this.selectedTemplateIdForEditing = null;
    }

    const templateManagementSetting = new Setting(this.promptTemplateSettingsContainer)
      .setName("Manage templates"); 

    templateManagementSetting.addButton(button => button
      .setIcon("plus")
      .setTooltip("Add new prompt template")
      .setCta()
      .onClick(() => {
        new PromptEditModal(this.app, this.plugin, null, this.handlePromptSaveAction.bind(this)).open();
      }));

    templateManagementSetting.addDropdown(dropdown => {
      if (this.plugin.cfg.promptTemplates.length === 0) {
        dropdown.addOption("__none__", "-- No templates defined --");
        dropdown.setDisabled(true);
      } else {
        this.plugin.cfg.promptTemplates.forEach(template => {
          dropdown.addOption(template.id, template.name);
        });
      }
      if (this.selectedTemplateIdForEditing) {
        dropdown.setValue(this.selectedTemplateIdForEditing);
      } else if (this.plugin.cfg.promptTemplates.length > 0) {
        dropdown.setValue(this.plugin.cfg.promptTemplates[0].id);
        this.selectedTemplateIdForEditing = this.plugin.cfg.promptTemplates[0].id;
      }
      dropdown.onChange(async (value) => {
        this.selectedTemplateIdForEditing = value;
        this.renderPromptTemplateEditor(); 
      });
    });

    templateManagementSetting.addButton(button => button
      .setIcon("pencil")
      .setTooltip("Edit selected prompt template")
      .onClick(() => {
        const templateToEdit = this.plugin.cfg.promptTemplates.find(t => t.id === this.selectedTemplateIdForEditing);
        if (templateToEdit) {
          new PromptEditModal(this.app, this.plugin, templateToEdit, this.handlePromptSaveAction.bind(this)).open();
        } else {
          new Notice("No template selected to edit. Please add one first if the list is empty.");
        }
      }));

    const selectedTemplateObject = this.plugin.cfg.promptTemplates.find(t => t.id === this.selectedTemplateIdForEditing);
    const isQuickRewriteSelected = selectedTemplateObject ? this.plugin.cfg.promptTemplates.indexOf(selectedTemplateObject) === 0 : false;

    if (selectedTemplateObject && !isQuickRewriteSelected) {
      templateManagementSetting.addButton(button => button
        .setIcon("trash")
        .setTooltip("Delete selected prompt template")
        .setWarning()
        .onClick(async () => {
          const indexToRemove = this.plugin.cfg.promptTemplates.findIndex(t => t.id === this.selectedTemplateIdForEditing);
          if (indexToRemove > 0) { 
            this.plugin.cfg.promptTemplates.splice(indexToRemove, 1);
            this.selectedTemplateIdForEditing = this.plugin.cfg.promptTemplates[0].id;
            await this.plugin.saveSettings();
            this.renderPromptTemplateEditor(); 
          } else {
            new Notice("Cannot delete this template."); 
          }
        }));
    }

    if (selectedTemplateObject) {
      new Setting(this.promptTemplateSettingsContainer)
        .setName("Selected prompt content")
        .setDesc("Content of the template selected above. Click the pencil icon to edit.");

      const contentDisplayBox = this.promptTemplateSettingsContainer.createDiv({
        cls: "coffee-prompt-display-box",
      });
      contentDisplayBox.setText(selectedTemplateObject.prompt);
      
      contentDisplayBox.style.width = "100%";
      contentDisplayBox.style.padding = "var(--size-2-3)";
      contentDisplayBox.style.border = "1px solid var(--background-modifier-border)";
      contentDisplayBox.style.borderRadius = "var(--radius-m)";
      contentDisplayBox.style.backgroundColor = "var(--background-secondary)";
      contentDisplayBox.style.whiteSpace = "pre-wrap";
      contentDisplayBox.style.wordBreak = "break-word";
      contentDisplayBox.style.maxHeight = "150px";
      contentDisplayBox.style.overflowY = "auto";
      contentDisplayBox.style.marginTop = "var(--size-2-2)";
      contentDisplayBox.style.marginBottom = "var(--size-4-4)";

    } else if (this.plugin.cfg.promptTemplates.length > 0 && this.selectedTemplateIdForEditing) {
      new Setting(this.promptTemplateSettingsContainer)
          .setName("Error")
          .setDesc("Could not display selected prompt. Please try selecting again.");
    }
  }

  private async handlePromptSaveAction(result: PromptSaveAction) {
    let refreshNeeded = false;
    let newSelectedId = this.selectedTemplateIdForEditing;

    if (result.action === 'save') {
      const { template: savedTemplate } = result;
      const existingIndex = this.plugin.cfg.promptTemplates.findIndex(t => t.id === savedTemplate.id);

      if (existingIndex > -1) { 
        this.plugin.cfg.promptTemplates[existingIndex] = savedTemplate;
      } else { 
        this.plugin.cfg.promptTemplates.push(savedTemplate);
        newSelectedId = savedTemplate.id; 
      }
      refreshNeeded = true;
    }

    if (refreshNeeded) {
      this.selectedTemplateIdForEditing = newSelectedId;
      await this.plugin.saveSettings();
      this.renderPromptTemplateEditor(); 
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("LLM provider settings").setHeading();
    new Setting(containerEl)
      .setName("LLM provider")
      .setDesc("Choose which backend to use for rewriting.")
      .addDropdown((dd: DropdownComponent) => {
        dd.addOption("openai", "OpenAI");
        dd.addOption("gemini", "Gemini");
        dd.addOption("lmstudio", "LM Studio");
        dd.addOption("claude", "Claude (Anthropic)");
        dd.addOption("ollama", "Ollama");
        dd.setValue(this.plugin.cfg.provider)
          .onChange(async (val: string) => {
            this.plugin.cfg.provider = val as LlmProvider;
            await this.plugin.saveSettings();
            this.display(); 
          });
      });

    const p = this.plugin.cfg.provider;
    if (p === "openai") {
      this.addTextSetting(containerEl, "API key", "Your OpenAI secret key.", () => this.plugin.cfg.openAiKey, (v) => (this.plugin.cfg.openAiKey = v), true);
      this.addModelDropdownSetting(containerEl, "Model", "OpenAI model.", "openai", () => this.plugin.cfg.openAiModel, (v) => (this.plugin.cfg.openAiModel = v));
    } else if (p === "gemini") {
      this.addTextSetting(containerEl, "API key", "Google AI API key.", () => this.plugin.cfg.geminiKey, (v) => (this.plugin.cfg.geminiKey = v), true);
      this.addModelDropdownSetting(containerEl, "Model", "Gemini model.", "gemini", () => this.plugin.cfg.geminiModel, (v) => (this.plugin.cfg.geminiModel = v));
    } else if (p === "lmstudio") {
      this.addTextSetting(containerEl, "Server URL", "LM Studio endpoint (http://host:port)", () => this.plugin.cfg.lmstudioEndpoint, (v) => (this.plugin.cfg.lmstudioEndpoint = v));
      this.addModelDropdownSetting(containerEl, "Model", "LM Studio model (requires server to be running).", "lmstudio", () => this.plugin.cfg.lmStudioModel, (v) => (this.plugin.cfg.lmStudioModel = v));
    } else if (p === "claude") {
      this.addTextSetting(containerEl, "API key", "Your Anthropic Claude API key.", () => this.plugin.cfg.claudeKey, (v) => (this.plugin.cfg.claudeKey = v), true);
      this.addModelDropdownSetting(containerEl, "Model", "Claude model.", "claude", () => this.plugin.cfg.claudeModel, (v) => (this.plugin.cfg.claudeModel = v));
    } else if (p === "ollama") {
      this.addTextSetting(containerEl, "Server URL", "Ollama endpoint (http://host:port)", () => this.plugin.cfg.ollamaEndpoint, (v) => (this.plugin.cfg.ollamaEndpoint = v));
      this.addModelDropdownSetting(containerEl, "Model", "Ollama model (requires server to be running).", "ollama", () => this.plugin.cfg.ollamaModel, (v) => (this.plugin.cfg.ollamaModel = v));
    }

    new Setting(containerEl).setName("Prompts").setHeading();
    this.promptTemplateSettingsContainer = containerEl.createDiv("prompt-templates-settings-area");
    this.renderPromptTemplateEditor(); 

    new Setting(containerEl).setName("Other settings").setHeading();
    new Setting(containerEl)
      .setName("Preserve text inside quotes")
      .setDesc("Do not rewrite text that is wrapped in \"double quotes\".")
      .addToggle((t) => t.setValue(this.plugin.cfg.preserveQuotes).onChange(async (v) => { this.plugin.cfg.preserveQuotes = v; await this.plugin.saveSettings(); }));

    const showStrip = p === "lmstudio" || p === "ollama";
    if (showStrip) {
      new Setting(containerEl)
        .setName("Strip <think> reasoning (local models)")
        .setDesc("If your local model emits <think>...</think> blocks, strip them from the final output.")
        .addToggle((t) => t.setValue(this.plugin.cfg.stripReasoning).onChange(async (v) => { this.plugin.cfg.stripReasoning = v; await this.plugin.saveSettings(); }));
    }
  }
} 