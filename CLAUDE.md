# CLAUDE.md

## Project Info
- The GUI for `codex cli` - coding agent
- use `codex app-server`

### Project tech
- Package manager: bun
- Framework: React + shadcn + tailwindcss + TypeScript + Tauri v2
- UI: shadcn UI components
- code comment language: English-only
- Zustand: for state management with persistence

## Common Commands
- `bun tauri dev` - read the backend output
- `bun run build` - test frontend
- `bunx --bun shadcn@latest add <dep>` - add shadcn dep
- only `cargo build ` when I ask, don't run `cargo check`
- don't use `open url`

## Project Structure
- `src/components/` - React components
- `src/views/` - View components
- `src/hooks/` - Custom hooks and stores
- use `@/hooks` `@/types` etc.