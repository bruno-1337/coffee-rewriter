# ☕ COFFEE REWRITER

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Obsidian Version](https://img.shields.io/badge/Obsidian-v1.5.8%2B-purple.svg)](https://obsidian.md)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/bruno-1337/coffee-rewriter?style=flat&color=green)
![Built with TypeScript](https://img.shields.io/badge/Built_with-TypeScript-007ACC.svg)

<div align="center">
  <h3>Unleash AI-Powered Writing Enhancement for Your Obsidian Notes</h3>
</div>

## 🚀 Write Like Never Before

**Coffee Rewriter** transforms your Obsidian writing experience by embedding cutting-edge AI directly into your workflow. Connect to **OpenAI, Claude, Gemini, or run local models** to refine, enhance, and perfect your text without ever leaving your vault.

## ⚡ Core Features

| Feature | Description |
|---------|-------------|
| **Quick Rewrite** | Select text → right-click → transform instantly |
| **Tailored Prompts** | Custom instructions ("make academic," "simplify," "fix grammar") |
| **Multi-Provider** | Use any LLM: OpenAI, Claude, Gemini, LM Studio, Ollama |
| **Context-aware** | Rewrites respect and preserve your quoted text |

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
      <td align="center">More coming soon...</td>
    </tr>
  </table>
</div>

## 🔧 Installation & Setup

1. **Install**:
   - Community plugins browser in Obsidian
   - OR manually place in `.obsidian/plugins/`

2. **Configure**:
   ```
   Settings → Coffee Rewriter → Select provider → Enter API key
   ```

3. **Use**:
   - Select text (or place cursor on paragraph)
   - Right-click → "Quick Rewrite" (or Command Palette)
   - OR use "Tailored rewrite" for custom instructions
   - Review changes → Accept or Cancel

## 🛠️ Developer Quick Start

```bash
# Clone repo
git clone https://github.com/bruno-1337/coffee-rewriter.git

# Install dependencies with Bun
cd coffee-rewriter
bun install

# Build
bun run build
```

## 🤝 Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Create feature branch: `git checkout -b amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin amazing-feature`
5. Open a Pull Request

## 📜 License

Licensed under MIT. See [LICENSE](LICENSE) for details.
