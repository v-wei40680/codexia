# AGENTS.md

## Project Info
- The GUI for `codex cli` - coding agent
- use app-server -  `codex app-server` connect Codexia

### Project tech
- Package manager: bun
- Framework: React + shadcn + tailwindcss + TypeScript + Tauri v2
- Don't use emit_all
- UI: shadcn UI components
- code comment language: English-only
- Zustand: for state management with persistence

## Common Commands
- `bun tauri dev` - read the backend output
- `bun run build` - test frontend
- `bunx --bun shadcn@latest add <dep>` - add shadcn dep
- only `cargo build` when I ask
- Don't run `cargo fmt`

## Project Structure
- `src/components/` - React components
- `src/pages/` - Page components
- `src/hooks/` - Custom hooks and stores
- use `@/hooks` `@/types` etc.

- use `import { invoke } from "@/lib/tauri-proxy"` instead `import { invoke } from "@tauri-apps/api/core"` because remote server