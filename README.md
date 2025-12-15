# Codexia

[![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/codexia?style=flat&logo=reddit&label=codexia)](https://www.reddit.com/r/codexia/)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/zAjtD4kf5K)
[![Follow lisp_mi on Twitter](https://img.shields.ioc/badge/𝕏-@lisp__mi-1c9bf0)](http://x.com/intent/follow?screen_name=lisp_mi)

A powerful GUI and Toolkit for Codex CLI + Claude code

one click @file from FileTree, prompt notepad, git worktree, diff view, build-in one click pdf csv/xlsx viewer, and more.

> [!TIP]
> ⭐ **Star this repo**, follow **[milisp](https://github.com/milisp)** on GitHub, and follow **[@lisp_mi](https://x.com/lisp_mi)** on Twitter for updates.

![Reasoning](public/codexia-reason.png)

▶️ [Automation demo on Twitter](https://x.com/lisp_mi/status/1966147638266589376)

## 📋 Table of Contents
- [✨ Features](#-features)
- [✨ Claude code features](#claude-code-features)
- [🚀 Installation](#-installation)
- [📖 Quick start](#-quick-start)

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

One Click pdf/xlsx/csv from filetree  to preview

- PDF text selection
- CSV/XLSX preview & selection

### Prompt notepad
- Notepad-chat integration

### 📊 **Usage Analytics Dashboard**
- **Cost Tracking**: Monitor your usage and costs in real-time
- **Token Analytics**: Detailed breakdown by model, project, and time period
- **Visual Charts**: Beautiful charts showing usage trends and patterns

### 🔌 **MCP Server Management**
- simple mcp management
- One click add from mcp marketplace or sync mcp server via [mcp-linker](https://mcp-linker.store)

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

## Claude code features
- see [opcode](//github.com/winfunc/opcode)

## 🚀 Installation

### Prerequisites
- **Codex CLI**: Install from [github Codex](https://github.com/openai/codex)
- **Claude Code CLI**: Install from [Claude's official site](https://claude.ai/code)
- **Git**: recommend option install

### Download

- [release](https://github.com/milisp/codexia/releases)
- [modern-github-release](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

### macOS homebrew

```sh
brew tap milisp/codexia
brew install --cask codexia
```

## 📖 Quick start

- Launch Codexia app
- UI show Project with codex projects and Claude code projects

### Codex
- Option step (config model, sandbox, approval)
- select a project then start task

### Claude code
- select a project to show history sessions
- click session to show history

#### new cc session (agent)
- click bot icon (#2) from left sidebar - You will see opcode app ui
- click bot icon at right top (opcode app ui) - show agents
- Create Agent -> fill the form - save agent - run agent
- other steps see [opcode](//github.com/winfunc/opcode)

### Remote control

```
Menu → Remote access -> start
```

### Others
- Google or ask AI

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
- Built with [Tauri](https://tauri.app/) - The secure framework for building desktop apps
- [Claude](https://claude.ai) by Anthropic
- [Codex](https://github.com/openai/codex) by OpenAI

## ❤️ Support & Participate

I'm working on Codexia Pro and need your input!

**Fill this 5-min survey & get:**
- 🎁 50% lifetime discount on Pro  
- 🚀 Early access to Pro features  
- 💬 Direct influence on roadmap  

[Take Survey](https://forms.gle/fchcQsE2HUiCcwfQ6) · [Join Discord](https://discord.gg/zAjtD4kf5K)

_First 100 respondents only!_

---

[Report Bug · Request Feature](https://github.com/milisp/codexia/issues)</a>