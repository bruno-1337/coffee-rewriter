import { Plugin, Editor, Menu, MenuItem, Notice } from "obsidian";
import { DEFAULT_SETTINGS, CoffeeRewriterSettingTab } from "./settings";
import type { CoffeeRewriterSettings } from "./types/settings";
import { rewriteScope } from "./rewriter/scope";
import { TailoredPromptModal } from "./tailored-prompt-modal";


export default class CoffeeRewriter extends Plugin {
	private settings: CoffeeRewriterSettings = DEFAULT_SETTINGS;

	override async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new CoffeeRewriterSettingTab(this.app, this));

		/* --- COMMANDS ------------------------------------------------------- */
		this.addCommand({
			id: "coffee-quick-rewrite",
			name: "Quick Rewrite (Paragraph / Selection)",
			editorCallback: (editor) => rewriteScope(this, editor),
			icon: "bot",
		});

		this.addCommand({
			id: "coffee-tailored-rewrite",
			name: "Tailored rewrite",
			editorCallback: (editor) => {
				const selection = editor.getSelection() || editor.getLine(editor.getCursor().line);
				if (!selection.trim()) {
					new Notice("Nothing selected to rewrite.");
					return;
				}
				new TailoredPromptModal(this.app, selection, this, editor).open();
			},
			icon: "edit",
		});

		/* --- CONTEXT MENU --------------------------------------------------- */
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
				menu.addItem((item: MenuItem) => {
					item.setTitle("Quick Rewrite (Paragraph / Selection)").setIcon("bot").onClick(() => rewriteScope(this, editor));
				});

				menu.addItem((item: MenuItem) => {
					item.setTitle("Tailored rewrite").setIcon("bot").onClick(() => {
						const selection = editor.getSelection() || editor.getLine(editor.getCursor().line);
						if (!selection.trim()) {
							new Notice("Nothing selected to rewrite.");
							return;
						}
						new TailoredPromptModal(this.app, selection, this, editor).open();
					});
				});
			})
		);

		console.info("Coffee Rewriter loaded ☕️");
	}

	override onunload(): void {
		console.info("Coffee Rewriter unloaded ☕️");
	}

	/* ------------------------------ SETTINGS ----------------------------- */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	get cfg(): CoffeeRewriterSettings {
		return this.settings;
	}
}
