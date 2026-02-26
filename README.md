# Codexia

[![Chinese README](https://img.shields.io/badge/README-中文-brightgreen)](docs/README.zh-CN.md)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/zAjtD4kf5K)
[![Follow on 𝕏](https://img.shields.io/badge/𝕏-@lisp__mi-1c9bf0)](http://x.com/intent/follow?screen_name=lisp_mi)

Codexia is a **Tauri v2 desktop app and toolkit** for Codex CLI + Claude Code.
It combines OpenAI Codex app + Claude Cowork workflows, a headless web server, an IDE-like editor with file tree, and a prompt notepad in one workspace.

![Codexia Home](docs/images/codexia-home.png)

## Why Codexia
- Native desktop experience powered by **Tauri v2 + Rust**
- Schedule and automate recurring agent tasks across projects
- Unified workspace across Codex app-like workflows, Claude Cowork-style collaboration, and remote web access
- Access sessions from desktop UI or remotely via headless web server
- Navigate project files and edit code in an IDE-like workflow
- Built-in Git worktree support powered by Rust `gix`
- MCP server and agent skill marketplace/management out of the box

## Features
- Automation: Agent Task Scheduler, Remote control
- Workspace: Git worktree management, Project file tree, IDE-like code file editing, Prompt notepad, Web preview for local apps (for example `http://localhost:3000`)
- Data tools: One-click PDF/XLSX/CSV preview and selection
- Usage analytics dashboard
- Ecosystem: MCP server marketplace and management, Agent skills marketplace and management
- Personalization: Theme and accent customization, Custom UI support

## Requirements
- [Codex CLI](https://github.com/openai/codex)
- [Claude Code CLI](https://claude.ai/code)

## Installation

### Option 1: Homebrew (macOS)
```sh
brew tap milisp/codexia
brew install --cask codexia
```

### Option 2: Prebuilt releases (macOS/Linux/Windows)
- [GitHub Releases](https://github.com/milisp/codexia/releases)
- [Modern GitHub Release Mirror](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

## Quick Start
1. Launch Codexia.
2. Add your project directory.
3. Enter a prompt and start your agent session.
4. Create an Agent Task Scheduler job for recurring workflows.

## Architecture at a Glance
- Codex app-server integration
- Claude agent rust sdk integration
- Frontend: React + TypeScript + Zustand + shadcn/ui in `src/`
- Desktop backend: Tauri v2 + Rust in `src-tauri/src/`
- Headless backend: Axum web server for remote control in `src-tauri/src/web_server/`
- Agent runtime: Codex `app-server` JSON-RPC integration for session/turn lifecycle
- Real-time updates: WebSocket broadcast stream at `/ws` for browser clients

Core entry points:
- `src-tauri/src/lib.rs` (desktop commands and state)
- `src-tauri/src/web_server/server.rs` (headless server startup)
- `src-tauri/src/web_server/router.rs` (HTTP API route surface)
- `src/services/tauri/` (frontend invoke layer)

## API Surface
Codexia exposes a browser-accessible API when running in web/headless mode:

- Health and stream: `GET /health`, `GET /ws`
- Codex lifecycle: `/api/codex/thread/*`, `/api/codex/turn/*`, `/api/codex/model/*`, `/api/codex/approval/*`
- Automation scheduler: `/api/automation/*` (create/update/list/run/pause/delete)
- Files, git, and terminal: `/api/filesystem/*`, `/api/git/*`, `/api/terminal/*`
- Claude integration: `/api/cc/*`
- Notes and productivity: `/api/notes/*`, `/api/codex/usage/token`

Contributor note:
- Add new API handlers under `src-tauri/src/web_server/handlers/`
- Register routes in `src-tauri/src/web_server/router.rs`
- Add corresponding frontend client calls in `src/services/tauri/`

## Documentation
- [Docs Index](docs/README.md)
- [Usage](docs/USAGE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Web Server Design](docs/WEB_SERVER_DESIGN.md)
- [Remote control Web Server](docs/WEB_SERVER.md)

## Community
- [GitHub Discussions](https://github.com/milisp/codexia/discussions)
- [Report Bug / Request Feature](https://github.com/milisp/codexia/issues)

Community forks:
- [jeremiahodom/codex-ui](https://github.com/jeremiahodom/codex-ui) - Node.js backend with API/SSE communication
- [Itexoft/codexia](https://github.com/Itexoft/codexia) - SSH integration
- [nuno5645/codexia](https://github.com/nuno5645/codexia) - Support for new reasoning and token count events

Related project:
- [awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) - Curated resources and tools for Codex CLI

## Contributing
Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, workflow, and quality checks.

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🌐 Internationalization

By contributing to this project, you agree that contributions may be licensed under both AGPL-3.0 and the Codexia commercial license.

## License
Codexia is dual-licensed under:
- **AGPL-3.0** for open-source use
- **Commercial License** for closed-source, proprietary, hosted, or SaaS use

See [COMMERCIAL.md](COMMERCIAL.md) for full terms and commercial inquiries.
