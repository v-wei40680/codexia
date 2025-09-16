# Changelog

## [0.4.0] - 2025-09-15

- add gpt-5-codex as default model
- move model select ui between mode and Reasoning Effort

### Change publish Strategy
- change `.github/workflows/release.yml` manual publish binary package

## [0.3.0] - 2025-09-11

### Featrues
- support codex built-in web search
- file and FileTree change detect and refresh
- enhance MessageList with feature cards for improved user onboarding
- add ChangesSummary component for improved file diff display

## [0.2.0] - 2025-09-11

### Features
- Enhance chat interface with diff viewer and inline reasoning.
- Improve plan update handling in chat components.
- Add ForkOriginBanner to display source conversation details.
- Enhance edit-and-resend flow in Chat and Message components.
- Add multi-select and session resume capabilities in ChatView.
- Add category management for conversations.

### Fixes
- Adjust message component styles; remove unused timeline line.
- CI: fix Linux artifact paths and signature file path.

### Documentation
- Add and refine docs for contributing, architecture, and usage.
- Update README with refined vision and links.

### CI/CD
- Add Tauri signing keys to workflows; enhance CI/CD configuration.
- Version chores and workflow improvements.

## [0.1.2] - 2025-09-06

### Features
- Implement in-app updater and expose in Settings.
- Add theme and accent color selection.
- Support forking chats from existing conversations.
- Improve message editing capabilities.
- Split window utilities for Manual view.
- Enhance ApprovalMessage and event summaries for clearer diffs.

### Fixes
- Correct chat forking logic.
- Show MessageFooter on hover only.

### Improvements
- Streamline message type detection and message handling across components.
- Replace NormalizedMessage with ChatMessage in message components.
- Improve conversation history formatting in ChatInterface.
- Simplify conversation creation and session management flows; remove legacy session features.
- Improve content extraction and semantics in command/approval messages.

### Documentation
- Update README with newly added features and enhancements.

## [0.1.1] - 2025-09-04

### Initial Release 🚀
- First public release of **Codexia** — a cross-platform GUI for the Codex CLI.
- Features multi-session chat, live streaming responses, file-tree integration, and notepad support.
- Supports multiple AI providers and sandboxed command execution.
- Clean, professional UI built with Tauri, React, and shadcn/ui.
- Persistent session storage and session-specific configuration.
- Ready for development and production builds.

> Codexia is an independent open-source project and not affiliated with OpenAI.
