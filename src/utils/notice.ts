import { Notice } from "obsidian";

let activeNotice: Notice | undefined;

export function showNotice(message: string, duration = 4000): void {
  activeNotice?.hide();
  activeNotice = new Notice(message, duration);
}
