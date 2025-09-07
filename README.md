<div align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Codexia Logo" width="120" height="120" />

  # [Codexia](https://github.com/milisp/codexia)
</div>

[![Downloads](https://img.shields.io/github/downloads/milisp/codexia/total.svg)](https://github.com/milisp/codexia/releases)
[![Stars](https://img.shields.io/github/stars/milisp/codexia?style=social)](https://github.com/milisp/codexia/stargazers)
[![Forks](https://img.shields.io/github/forks/milisp/codexia?style=social)](https://github.com/milisp/codexia/network/members)
[![Issues](https://img.shields.io/github/issues/milisp/codexia)](https://github.com/milisp/codexia/issues)
[![Feature Requests](https://img.shields.io/github/issues/milisp/codexia/feature-request?label=feature%20requests)](https://github.com/milisp/codexia/labels/feature-request)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/milisp/codexia/actions/workflows/ci.yml/badge.svg)](https://github.com/milisp/codexia/actions/workflows/ci.yml)

🚀 The missing GUI/IDE for the [Codex CLI](https://github.com/openai/codex) — fork chat, live streaming responses, file-tree integration, notepad, and git diff support
Cross-platform desktop app built with Tauri v2 + React + TypeScript.

> [!TIP]
> **⭐ Star the repo and follow [milisp](https://x.com/lisp_mi) on X and [github](https://github.com/milisp) for more**.

![demo](public/codexia.png)

▶️ [Watch the automation video on Twitter](https://x.com/lisp_mi/status/1963633403368280221)

## Disclaimer

Codexia is an independent open-source project and is not built by OpenAI or any company.

## News

- [2025-09-05] fork chat + edit chat + theme select + category conversatin
- [2025-09-03] show the plan message
- [2025-08-29] support image input, codexia can read image now

## ✨ Features

### 🔄 **Multi-Session Support**
- Run multiple independent chat sessions simultaneously
- Each session maintains its own configuration and context
- Switch between sessions without interrupting ongoing conversations
- Persistent session storage with automatic restoration on app restart

### 💬 **Real-Time Streaming**
- Live streaming responses for immediate feedback
- Character-by-character message updates as AI generates responses
- No more waiting for complete responses - see results as they appear
- Visual indicators for active generation and thinking states

### Build-in Mutil file format support

- pdf - select text from pdf
- csv, xlsx - preview and select text

### ⚙️ **Flexible Configuration**
- Support for multiple AI providers (OpenAI, OSS via Ollama, Custom)
- Configurable models per session (GPT, Llama, etc.)
- Adjustable sandbox policies (read-only, workspace-write, full-access)
- Customizable approval policies for command execution
- Working directory selection for each session

### 🎯 **Professional UX**
- Clean, responsive interface built with shadcn/ui components
- Configuration panel
- **Notepad-chat integration** for seamless note-taking and send back during conversations
- **Enhanced markdown rendering** with syntax highlighting for code blocks
- **Todo list** Plan Display
- Screenshot as image input
- fork chat
- Persistent UI state and preferences
- **WebPreview** Click WebPreview icon Auto detect web port to show WebPreview, eg. Next.js project will show WebPreview `http://localhost:3000`
- Theme & Accent Selection

### 🛡️ **Security & Control**
- Sandbox execution modes for safe code running
- Approval workflows for sensitive operations
- Configurable command execution policies
- Isolated processes per session for security

## Documentation

- Usage and setup: [USAGE](docs/USAGE.md)
- Architecture overview: [ARCHITECTURE](docs/ARCHITECTURE.md)
- Development and contributing: [CONTRIBUTING](CONTRIBUTING.md)

## 📋 Supported Codex Features

- ✅ **Interactive chat** with AI assistants
- ✅ **Code generation and editing** in various languages
- ✅ **File operations** with sandbox controls
- ✅ **Command execution** with approval workflows
- ✅ **Multiple AI providers** (OpenAI, OSS models via Ollama)
- ✅ **Working directory context** for project-aware assistance
- ✅ **Streaming responses** for real-time interaction - by config show_raw_agent_reasoning=true

## Development & Support Docs

For development commands, troubleshooting/FAQ, and contribution guidance, see [CONTRIBUTING](CONTRIBUTING.md) and [USAGE](docs/USAGE.md).

## 💖 Contributors

Thanks to all our wonderful contributors!

<a href="https://github.com/milisp/codexia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=milisp/codexia" />
</a>

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Plux](https://github.com/milisp/plux) one click @files from FileTree & notepad
- [Claude code](https://www.anthropic.com/claude-code) Co-Authored-By Claude code
- [codex](https://chatgpt.com/codex) for the Codex CLI
- [Tauri](https://tauri.app/) for the excellent desktop app framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [ChatGPT](https://chatgpt.com) Some code suggest by ChatGPT
- The open source community for the amazing tools and libraries

---

**Built with ❤️ using Tauri, React, and Rust**
