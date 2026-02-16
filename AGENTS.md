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
- `bun run build` - test frontend if frontend change
- `bunx --bun shadcn@latest add <dep>` - add shadcn dep
- `cargo check` at src-tauri if rust code change
- only `cargo build` when I ask
- Don't run `cargo fmt`

## Project Structure
- `src/components/` - React components
- `src/views/` - View components
- `src/hooks/` - Custom hooks and stores
- use `@/hooks` `@/types` etc.

## web server

- new tauri command add a api to `src-tauri/src/web_server/handlers.rs` 
- invoke add to `src/services/tauri/`

## cwd
cwd mean current working dir
