# Using Codexia

This guide covers installation, development, common workflows, and troubleshooting. See also: [Architecture](./ARCHITECTURE.md).

## Download from github release

[github release](https://github.com/milisp/codexia/releases) or [modern-github-release](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

## Build from source Prerequisites

- Tauri prerequisites: https://v2.tauri.app/start/prerequisites/

### Installation

Clone and install dependencies:
```bash
git clone https://github.com/milisp/codexia
cd codexia
bun install
```

Run development build:
```bash
bun tauri dev
```

Build for production:
```bash
bun tauri build
```

## App Usage

### Creating Sessions
- Click the Pencil button in the session sidebar to create a new chat session.
- Each session starts its own Codex process and maintains independent configuration and context.

### Managing Conversations
- Switch between sessions via the sidebar; inactive sessions continue running in the background.

### Configuration
- Use the Settings icon to open the configuration panel.
- Changes apply to the active session and persist automatically.

### Theme & Accent Selection
- Toggle light/dark with the sun/moon button in the header.
- Pick an accent color from the palette button next to the theme toggle.
- Defaults: dark mode with a pink accent. Choices persist via Zustand.

### Chat pane

- toggle brain icon

## Troubleshooting / FAQ

### 1) App fails to start after dependency changes
Fix: Reinstall dependencies.
```bash
rm -rf node_modules bun.lock
bun install
```

### 2) Can I use ChatGPT Plus/Pro instead of the API?
Yes. Login via Codex first, then select ChatGPT:
```bash
codex  # then choose ChatGPT
```

