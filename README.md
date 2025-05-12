# ☕ COFFEE REWRITER

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Obsidian Version](https://img.shields.io/badge/Obsidian-v1.5.8%2B-purple.svg)](https://obsidian.md)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/bruno-1337/coffee-rewriter?style=flat&color=green)
![Built with TypeScript](https://img.shields.io/badge/Built_with-TypeScript-007ACC.svg)

<div align="center">
  <h3>Unleash AI-Powered Writing Enhancement for Your Obsidian Notes</h3>
</div>

**Coffee Rewriter** transforms your Obsidian writing experience by embedding cutting-edge AI directly into your workflow. Connect to **OpenAI, Claude, Gemini, or run local models via LM Studio or Ollama** to refine, enhance, and perfect your text without ever leaving your vault.

## ✨ Core Features

| Feature                    | Description                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Versatile LLM Support**  | Connect to OpenAI, Gemini, Claude, or self-hosted models via LM Studio & Ollama.                             |
| **Quick Rewrite**          | Instantly improve selected text or the current paragraph using your default "Quick Rewrite" prompt.        |
| **Tailored Rewrite**       | Apply specific instructions by choosing from saved prompt templates or writing a custom prompt on the fly. |
| **Prompt Management**      | Create, edit, and manage a library of your favorite prompt templates in the plugin settings.               |
| **Interactive Review**     | Review AI suggestions with highlighted changes (diff view) before accepting.                               |
| **AI-Generated Notes**     | Get brief notes from the AI explaining what changes were made during the rewrite.                          |

Right click a paragraph or selection and choose your flavour (Quick rewrite or Tailored rewrite)

![image](https://github.com/user-attachments/assets/d99445bf-2cde-49eb-a3a3-2ff87a12bf9b)


If you choose quick rewrite, it will use the prompt found in the plugin settings. For tailored rewrite, select the style of rewrite you want (or select custom prompt)

![image](https://github.com/user-attachments/assets/05fa6287-20b2-439a-a015-63495579b796)


Approve your rewrite

![image](https://github.com/user-attachments/assets/18dca2f4-1a4a-4897-a525-1b65e938aec8)



## 🔌 Supported LLM Providers

<div align="center">
  <table>
    <tr>
      <td align="center"><img src="https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg" width="60" alt="OpenAI Logo"/><br>OpenAI</td>
      <td align="center"><img src="https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude.svg" width="60" alt="Claude AI Logo"/><br>Claude</td>
      <td align="center"><img src="https://unpkg.com/@lobehub/icons-static-svg@latest/icons/gemini.svg" width="60" alt="Google Gemini Logo"/><br>Gemini</td>
    </tr>
    <tr>
      <td align="center"><img src="https://unpkg.com/@lobehub/icons-static-svg@latest/icons/lmstudio.svg" width="60" alt="LM Studio Logo"/><br>LM Studio</td>
      <td align="center"><img src="https://unpkg.com/@lobehub/icons-static-svg@latest/icons/ollama.svg" width="60" alt="Ollama Logo"/><br>Ollama</td>
      <td align="center"><em>(More providers soon)</em></td>
    </tr>
  </table>
</div>

## 🚀 Getting Started

### Installation

1.  **Obsidian Community Plugins**:
    *   Go to `Settings` → `Community plugins` → `Browse`.
    *   Search for "Coffee Rewriter" and click `Install`, then `Enable`.
2.  **Manual Installation**:
    *   Download the latest release from the [GitHub Releases page](https://github.com/bruno-1337/coffee-rewriter/releases).
    *   Extract the downloaded archive.
    *   Copy the `coffee-rewriter` folder into your Obsidian vault's `.obsidian/plugins/` directory.
    *   Reload Obsidian (or disable and re-enable the plugin if it was already present).
    *   Enable the plugin in `Settings` → `Community plugins`.

### Configuration

1.  **Open Plugin Settings**:
    *   Navigate to `Settings` → `Community Plugins` → `Coffee Rewriter` (click the gear icon).

2.  **LLM Provider Settings**:
    *   **Choose your LLM Provider**: Select from OpenAI, Gemini, Claude, LM Studio, or Ollama.
    *   **API Key/Server URL**:
        *   For cloud services (OpenAI, Gemini, Claude), enter your API key.
        *   For local services (LM Studio, Ollama), enter the server URL (e.g., `http://localhost:1234`).
    *   **Model Selection**: Choose your preferred model from the dropdown. You can refresh the model list using the refresh button. (Ensure your API key/URL is set before loading models).

3.  **Prompts**:
    *   This section allows you to manage your prompt templates.
    *   The **"Quick Rewrite"** template (the first in the list) is used by the "Quick Rewrite" command and context menu action.
    *   **Manage Templates**:
        *   Use the `+` button to add a new prompt template.
        *   Select a template from the dropdown to view its content.
        *   Use the pencil icon (Edit) to modify the selected template's name and prompt in a modal.
        *   Use the trash icon (Delete) to remove custom templates (the "Quick Rewrite" template cannot be deleted).

4.  **Other Settings**:
    *   **Preserve text inside quotes**: Toggle whether to protect text within "double quotes" from being rewritten.
    *   **Strip <think> reasoning (local models)**: Useful for self-hosted models that might output reasoning or thought processes within `<think>...</think>` tags.

## 💡 How to Use

Coffee Rewriter currently offers two main ways to enhance your text:

1.  **Quick Rewrite**:
    *   **Action**: Select text in your editor, or simply place your cursor on a paragraph you want to rewrite.
    *   **Trigger**:
        *   Right-click on the selection/paragraph and choose "Quick Rewrite".
        *   Or, open the Command Palette (Ctrl/Cmd+P) and search for "Coffee Rewriter: Quick Rewrite (Paragraph / Selection)".
    *   **Process**: The plugin will use your "Quick Rewrite" prompt template to improve the text.
    *   **Review**: A modal will appear showing the original text and the rewritten text with changes highlighted. You'll also see any "Note from the AI" explaining the changes. Click "Accept" to apply or "Cancel".

2.  **Tailored Rewrite**:
    *   **Action**: Select the text you want to rewrite.
    *   **Trigger**:
        *   Right-click on the selection and choose "Tailored rewrite".
        *   Or, open the Command Palette (Ctrl/Cmd+P) and search for "Coffee Rewriter: Tailored rewrite".
    *   **Process**: A modal will appear allowing you to:
        *   Choose from your list of saved prompt templates. The content of the selected template will be previewed.
        *   Or, select "-- Write a new custom prompt --" to enter your own instructions directly in a text area.
    *   **Review**: After submitting, the standard "Review Rewrite" modal will appear with the AI's suggestions and notes.

<!-- 
## 📸 Screenshots (Coming Soon)

*   Placeholder for Settings Panel Screenshot
*   Placeholder for Tailored Rewrite Modal Screenshot
*   Placeholder for Review Rewrite Modal Screenshot 
-->

## 🛠️ Developer Quick Start

```bash
# Clone the repository
git clone https://github.com/bruno-1337/coffee-rewriter.git
cd coffee-rewriter

# Install dependencies (requires Bun)
bun install

# Build the plugin
bun run build
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please feel free to:
1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

Please check the existing issues before creating a new one.

## 📜 License

Licensed under MIT. See [LICENSE](LICENSE) for details.
