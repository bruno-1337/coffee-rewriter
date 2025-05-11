import { App, PluginSettingTab, Setting, DropdownComponent, TextComponent, TextAreaComponent, Notice, ButtonComponent } from "obsidian";
import CoffeeRewriter from "./main";
import { CoffeeRewriterSettings, LlmProvider } from "./types/settings";
import { listOpenAiModels } from "./llm/openai";
import { listGeminiModels } from "./llm/gemini";
import { listLmStudioModels } from "./llm/lmstudio";
import { listClaudeModels } from "./llm/claude";
import { listOllamaModels } from "./llm/ollama";

export const DEFAULT_SETTINGS: CoffeeRewriterSettings = {
  provider: "openai",
  openAiKey: "",
  openAiModel: "gpt-3.5-turbo",
  geminiKey: "",
  geminiModel: "gemini-pro",
  lmstudioEndpoint: "http://localhost:1234",
  lmStudioModel: "",
  prompt: "Improve clarity, grammar, and conciseness of the following text. Return only the improved version.",
  preserveQuotes: false,
  stripReasoning: false,
  claudeKey: "",
  claudeModel: "claude-3-haiku-20240307",
  ollamaEndpoint: "http://localhost:11434",
  ollamaModel: "",
};

export class CoffeeRewriterSettingTab extends PluginSettingTab {
  private plugin: CoffeeRewriter;

  constructor(app: App, plugin: CoffeeRewriter) {
    super(app, plugin);
    this.plugin = plugin;
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
      if (!currentDropdownComponent) return; // Dropdown must exist

      // Prerequisite check
      let prerequisitePresent = false;
      let prerequisiteName = "API Key"; // Default
      let prerequisiteSettingField = ""; // For the message, e.g., "OpenAI API Key"
      
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

      const prerequisitePlaceholder = `--Set ${prerequisiteName} First--`;
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

      // Prerequisites are met, proceed to load
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

      settingControl.setDesc(description); // Restore original description
      currentDropdownComponent.selectEl.disabled = false;
      if (currentRefreshButtonComponent) currentRefreshButtonComponent.setDisabled(false);

      currentDropdownComponent.selectEl.options.length = 0; // Clear before populating
      if (models.length === 0) {
        currentDropdownComponent.addOption("", "--No models found or loaded--");
      } else {
        currentDropdownComponent.addOption("", "--Select Model--");
        models.forEach(modelName => {
          if (currentDropdownComponent) currentDropdownComponent.addOption(modelName, modelName);
        });
      }
      currentDropdownComponent.setValue(get()); // Re-set current value
    };

    settingControl.addDropdown(async (dd: DropdownComponent) => {
      currentDropdownComponent = dd;
      // Initial placeholder, will be overwritten by performModelLoadAndUpdateUI
      dd.selectEl.options.length = 0;
      dd.addOption("", "--Select Model--");
      dd.setValue(get()); 

      dd.onChange(async (val) => {
        set(val);
        await this.plugin.saveSettings();
        // If provider or API key changes, display() is called, which re-creates this setting.
        // If only model selection changes, no reload of the list itself is needed here.
      });

      // Defer initial load slightly to ensure refresh button can be captured if performModelLoadAndUpdateUI needs it.
      // Or ensure that currentRefreshButtonComponent can be null initially.
      // The current logic inside performModelLoadAndUpdateUI handles if currentRefreshButtonComponent is null.
      await performModelLoadAndUpdateUI(false); 
    });

    settingControl.addButton(button => {
      currentRefreshButtonComponent = button;
      button
        .setIcon("refresh-cw") // Obsidian icon for refresh
        .setTooltip("Refresh model list")
        .onClick(async () => {
          await performModelLoadAndUpdateUI(true); // Pass true for isRefresh
        });
      // Initial state of the button (enabled/disabled) will be set by the first call 
      // to performModelLoadAndUpdateUI, which is called after dropdown setup.
    });
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    /* Provider dropdown */
    new Setting(containerEl)
      .setName("LLM Provider")
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

    /* Provider-specific settings */
    const p = this.plugin.cfg.provider;
    if (p === "openai") {
      this.addTextSetting(containerEl, "API Key", "Your OpenAI secret key.", () => this.plugin.cfg.openAiKey, (v) => (this.plugin.cfg.openAiKey = v), true);
      this.addModelDropdownSetting(containerEl, "Model", "OpenAI model.", "openai", () => this.plugin.cfg.openAiModel, (v) => (this.plugin.cfg.openAiModel = v));
    } else if (p === "gemini") {
      this.addTextSetting(containerEl, "API Key", "Google AI API key.", () => this.plugin.cfg.geminiKey, (v) => (this.plugin.cfg.geminiKey = v), true);
      this.addModelDropdownSetting(containerEl, "Model", "Gemini model.", "gemini", () => this.plugin.cfg.geminiModel, (v) => (this.plugin.cfg.geminiModel = v));
    } else if (p === "lmstudio") {
      this.addTextSetting(containerEl, "Server URL", "LM Studio endpoint (http://host:port)", () => this.plugin.cfg.lmstudioEndpoint, (v) => (this.plugin.cfg.lmstudioEndpoint = v));
      this.addModelDropdownSetting(containerEl, "Model", "LM Studio model (requires server to be running).", "lmstudio", () => this.plugin.cfg.lmStudioModel, (v) => (this.plugin.cfg.lmStudioModel = v));
    } else if (p === "claude") {
      this.addTextSetting(containerEl, "API Key", "Your Anthropic Claude API key.", () => this.plugin.cfg.claudeKey, (v) => (this.plugin.cfg.claudeKey = v), true);
      this.addModelDropdownSetting(containerEl, "Model", "Claude model.", "claude", () => this.plugin.cfg.claudeModel, (v) => (this.plugin.cfg.claudeModel = v));
    } else if (p === "ollama") {
      this.addTextSetting(containerEl, "Server URL", "Ollama endpoint (http://host:port)", () => this.plugin.cfg.ollamaEndpoint, (v) => (this.plugin.cfg.ollamaEndpoint = v));
      this.addModelDropdownSetting(containerEl, "Model", "Ollama model (requires server to be running).", "ollama", () => this.plugin.cfg.ollamaModel, (v) => (this.plugin.cfg.ollamaModel = v));
    }

    /* Prompt - Label and Description */
    new Setting(containerEl)
      .setName("Quick Rewrite Prompt")
      .setDesc("System instruction that precedes the user text. This will be sent to the LLM before your selected text.");

    /* Prompt - TextArea */
    // Create a container for the textarea to allow full width and custom styling
    const promptTextAreaContainer = containerEl.createDiv("prompt-textarea-container coffee-settings-prompt-container");
    const promptTextArea = new TextAreaComponent(promptTextAreaContainer)
      .setValue(this.plugin.cfg.prompt)
      .onChange(async (val) => {
        this.plugin.cfg.prompt = val;
        await this.plugin.saveSettings();
      });

    // Apply styles for a larger, full-width textarea
    promptTextArea.inputEl.rows = 10; // Increased rows
    promptTextArea.inputEl.addClass("coffee-settings-prompt-textarea");

    /* Toggles */
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