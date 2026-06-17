# Codexia

[![Downloads](https://img.shields.io/github/downloads/milisp/codexia/total.svg)](https://github.com/milisp/codexia/releases)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/zAjtD4kf5K)
[![Follow on 𝕏](https://img.shields.io/badge/𝕏-@lisp__mi-1c9bf0)](http://x.com/intent/follow?screen_name=lisp_mi)

Codexia is a **Tauri v2 app** for Codex CLI + Claude Code — combining agent workflows, an IDE-like editor, a headless web server, and a prompt notepad in one workspace.

![Codexia Home](docs/images/codexia-agent-command-center.png)

## Features

- **Agent workflows**: Task Scheduler for recurring jobs, remote control via headless web server
- **Workspace**: Git worktree management, project file tree, IDE-like editor, prompt notepad, local web preview
- **Data tools**: One-click PDF / XLSX / CSV preview
- **Ecosystem**: MCP server marketplace, agent skills marketplace
- **Personalization**: Theme and accent customization, usage analytics dashboard

## Requirements

- [Codex CLI](https://github.com/openai/codex)
- [Claude Code CLI](https://claude.ai/code)

## Installation

### Homebrew (macOS)
```sh
brew tap milisp/codexia
brew install --cask codexia
```

### Prebuilt releases (macOS / Linux / Windows)
- [GitHub Releases](https://github.com/milisp/codexia/releases)
- [Modern GitHub Release Mirror](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

## Ecosystem

- **Agent Tools**: Tools for Codex or Claude code
- **Agent Skills Marketplace**: Prompt workflows and task automations.
- **MCP Server Marketplace**: Extend agent capabilities with local or remote MCP tools.

### Weekly Marketplace Spotlights
👉 **Have a great Server or Skill?** We feature outstanding community submissions in our [Weekly Spotlights](https://github.com/milisp/awesome-codex-cli) and sync them into the built-in App Marketplace. See [CONTRIBUTING.md](CONTRIBUTING.md) to submit yours!

### Featured Agent Tools
- [Relay Baton](https://github.com/guorunjie/codex-relay-baton-guardian) - Local Codex Desktop/CLI recovery monitor for long-running tasks. Detects compact failures and context-window overflow, then queues audited handoff bundles.
- **[Agentbox](https://github.com/madarco/agentbox)** - AgentBox runs multiple Codex (and Claude Code / OpenCode) sessions in parallel
* *Your Tool Here? [Submit an Issue/PR](https://github.com/milisp/codexia/issues)*

### Featured Agent Skills
- **[trace-to-skill](https://github.com/grnbtqdbyx-create/trace-to-skill)** - CLI for turning failed Codex, Claude Code, Cursor, and MCP-enabled agent runs into reusable AGENTS.md rules, SKILL.md files, eval evidence, PR comments, and SARIF code-scanning reports.
- **[Codex Small Business Skills](https://github.com/simongonzalezdc/codex-small-business-skills)** by [Simon Gonzalez De Cruz](https://github.com/simongonzalezdc) - Apache-2.0 Codex port of Anthropic's Small Business skills, with 31 workflows for cash flow, invoices, CRM, support, marketing, hiring, and weekly business rhythm.
* *Your Skill Here? [Submit an Issue/PR](https://github.com/milisp/codexia/issues)*

### 🛠️ Featured MCP Servers
- [VideoOverlayKit](https://github.com/alichherawalla/video-overlay-kit) - MCP server that renders 4-6s animated b-roll overlay videos (mp4) for short-form social (LinkedIn, IG Reels, YouTube Shorts, TikTok). Paste your script into Codex CLI / Claude Code / Cursor, the model writes the scene spec and renders the mp4. Built on Remotion + Tabler + Lottie. Free, MIT, local.
- [**claude-codex-bridge**](https://github.com/jackcongmac/claude-codex-bridge) - Bidirectional MCP bridge for Codex CLI and Claude Code collaboration, with persistent Claude sessions and shared collaboration files.
* *Your Server Here? [Submit an Issue/PR](https://github.com/milisp/codexia/issues)*

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
- Headless backend: Axum web server for remote control in `src-tauri/src/web/`
- Agent runtime: Codex `app-server` JSON-RPC integration for session/turn lifecycle
- Real-time updates: WebSocket broadcast stream at `/ws` for browser clients

Core entry points:
- `src-tauri/src/lib.rs` (desktop commands and state)
- `src-tauri/src/web/server.rs` (headless server startup)
- `src-tauri/src/web/router.rs` (HTTP API route surface)
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
- Add new API handlers under `src-tauri/src/web/handlers/`
- Register routes in `src-tauri/src/web/router.rs`
- Add corresponding frontend client calls in `src/services/tauri/`

## Documentation

- [Usage](docs/USAGE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Web Server](docs/WEB_SERVER.md)

## 🔒 Security

- **Process isolation**: Agents run in separate processes
- **Permission control**: Configure file and network access per agent
- **Local storage**: All data stays on your machine
- **Open source**: Full transparency through open source code
- **Telemetry**: Opt-in only, off by default

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow.

Community forks:
- [jeremiahodom/codex-ui](https://github.com/jeremiahodom/codex-ui) — Node.js backend with API/SSE
- [Itexoft/codexia](https://github.com/Itexoft/codexia) — SSH integration
- [nuno5645/codexia](https://github.com/nuno5645/codexia) — Reasoning and token count events

Related:
- [awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) — curated list of Codex CLI resources
- [claw-army/claude-node](https://github.com/claw-army/claude-node) — Python subprocess bridge for Claude Code CLI

## Community

- [GitHub Discussions](https://github.com/milisp/codexia/discussions)
- [Report Bug / Request Feature](https://github.com/milisp/codexia/issues)

## License

Dual-licensed under **AGPL-3.0** (open source) and a **Commercial License** (closed-source / SaaS use).
See [COMMERCIAL.md](COMMERCIAL.md) for details.
