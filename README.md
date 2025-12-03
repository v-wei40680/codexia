# Codexia

A missing GUI and Toolkit for Codex CLI

file-tree integration, prompt notepad, git worktree, diff view, build-in pdf csv/xlsx viewer, and more.

[![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/codexia?style=flat&logo=reddit&label=codexia)](https://www.reddit.com/r/codexia/)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/zAjtD4kf5K)

> [!TIP]
> ⭐ **Star this repo**, follow **[milisp](https://github.com/milisp)** on GitHub, and follow **[@lisp_mi](https://x.com/lisp_mi)** on X for updates.

![Reasoning](public/codexia-reason.png)

▶️ [Automation demo on Twitter](https://x.com/lisp_mi/status/1966147638266589376)

## ✨ Features

### 🗂️ **Project & Session Management**
- **Visual Project Browser**: Navigate through all your Codex CLI projects in `~/.codex/config.toml` and any `~/.codex/sessions/**/*.jsonl` first line has cwd
- **Session History**: View and resume past coding session with full context, Rename chat title, manage `~/.codex/sessions`
- filter conversation messages
- **Multiple windows**: open multiple projects at the same time
- **Category & Favorites** conversation system

### git worktree and sync file changes
- worktree + sync to prevent accident delete all the changes. undo function.

### remote control
- remote control from browser via any device

### Built-in multi file viewer format support

- PDF text selection
- CSV/XLSX preview & selection

### Prompt notepad
- Notepad-chat integration

### 📊 **Usage Analytics Dashboard**
- **Cost Tracking**: Monitor your usage and costs in real-time
- **Token Analytics**: Detailed breakdown by model, project, and time period
- **Visual Charts**: Beautiful charts showing usage trends and patterns

### 🔌 **MCP Server Management**

### 📝 **AGENTS.md**
- **Built-in Editor**: Edit AGENTS.md file directly within the app
- **Live Preview**: See your markdown rendered in real-time
- **Syntax Highlighting**: Full markdown support with syntax highlighting

### 🎯 **Professional UX**
- Syntax-highlighted markdown
- Todo plan display
- ~~Fork chat~~
- Persistent UI state
- WebPreview (e.g., Next.js http://localhost:3000)
- Theme & Accent selection

### 📋 Codex CLI features
- Sandbox execution modes for safe code running
- Approval workflows for sensitive operations
- Configurable command execution policies
- Isolated processes per session for security
- image input - Screenshot or image file
- toggle codex built-in gpt-5 web search
- Project-aware assistance
- Multiple AI providers (OpenAI, Ollama, Anthropic, Gemini, openrouter, xAI, Custom)

### sqlite in `~/.codexia/cache.db`
- note
- sesssion list - scan new session to store in sqlite
- token usage

## 🚀 Installation

### Prerequisites
- **Codex CLI**: Install from [github Codex](https://github.com/openai/codex)
- **Git**: recommend option install

### Download

- [modern-github-release](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

> [!Note]
> Paid users can access new features more than a week before free users

#### Pricing for MacOS Signed dmg or you can build from source code for free
- Linux local use will always free
- [Codexia Annual — $199/year](https://buy.polar.sh/polar_cl_fk3dVs5fzRFlMWaC8TiAC5NcgzkDeAlWraXj94f9RBB)
- [Codexia Monthly — $20/month](https://buy.polar.sh/polar_cl_NbEutU2hPXC3qnBLVs81cDyYsLQupsVwOW9Ff2o8SoU)
- Want discount? - Join our discord, once more than 100 users, I will send discount code.

### macOS homebrew

```sh
brew tap milisp/codexia
brew install --cask codexia
```

## 📖 Usage

### Remote control

```
Menu → Remote access -> start
```

### Others
- Google or ask AI

## FAQ

- MacOS damaged warning
[🎥Youtube](https://www.youtube.com/watch?v=MEHFd0PCQh4)
The app not signed (before codexia v0.15.0), You can open it by running the terminal command:

```sh
xattr -cr /Applications/codexia.app
open -a /Applications/codexia.app  # or click the Codexia app
```

## 💬 Discussions

Join the [Discussions](https://github.com/milisp/codexia/discussions)

## Community forks

- [jeremiahodom/codex-ui](https://github.com/jeremiahodom/codex-ui) - Node.js backend with API/SSE communication
- [Itexoft/codexia](https://github.com/Itexoft/codexia) - SSH integration
- [nuno5645/codexia](https://github.com/nuno5645/codexia) - add support for new reasoning and token count events

## Related project
- [awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) - A curated list of awesome resources, tools for OpenAI Codex CLI

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🌐 Internationalization

## 🙏 Acknowledgments

- [Plux](https://github.com/milisp/plux) one click @files from FileTree & notepad

---

[Report Bug · Request Feature](https://github.com/milisp/codexia/issues)</a>