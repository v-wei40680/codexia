# Claude Development Notes on macOS

must be english in file

## Project Info
- The GUI for `codex cli` - coding agent
- use proto -  `codex proto --oss -m {model}` enter non-interactive model use mistral
- source code at folder `<codex-source-code-home>`
- message sessions at `~/.codex/sessions/{year}/{month}/{date}/rollout-{datetime}-{session_id}.jsonl` use jsonl
- `~/.codex/history.jsonl` - user conversation first text
  - format `{"session_id": uuid,"ts":1755040085,"text":prompt}`

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
- `cargo build` - only `cargo build at <root>/src-tauri` when rust code change
- `codex -h` - Codex CLI for help

## Project Structure
- `src/components/` - React components
- `src/pages/` - Page components
- `src/hooks/` - Custom hooks and stores
- `src/components/common/RouteTracker.tsx` - App routing configuration
- use `@/hooks` `@/types` etc.

## codex cli source code

- `codex-rs` - rust code

## ignore error

model_reasoning_summary: auto medium low - this is codex bug
