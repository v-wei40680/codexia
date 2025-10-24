# Changelog

## [0.7.1] - 2025-10-23

### Features
- Add DeltaEventLog component and integrate delta event handling in ChatPanel and ChatCompose.
- Implement SourceControl component for Git status and file diff handling in the chat interface.
- Add AttachedFilesTab component to manage and display attached files in the chat interface.
- Add task page to use codex app-server.
- Add search functionality to ProjectsPage and update AppHeader link text.
- Add base_url to CodexConfig and session management for improved provider configuration logging.
- Remove close_session and get_running_sessions methods from commands and client; clean up session management.
- Remove SessionManager component and related session management methods from sessionManager service.
- Enhance useDeepLink hook to conditionally access deep-link plugin based on runtime environment.
- Implement AccentColorSelector component and refactor AppHeader to use it; remove unused explore, profile, and share pages.
- Remove LogoSettings component and update SettingsSidebar for remote access.
- Remove unused streaming styles from streaming.css.
- Migrate tauri-remote-ui from submodule to direct Git dependency in Cargo.toml.
- Update version to 0.7.0 and enhance documentation with new features and FAQs.
- Integrate deep linking and enhance OAuth login logging in AuthPage.
- Implement remote mode checks for various components and dialogs to restrict functionality.
- Add remote UI functionality with configuration and status management.
- Add BouncingDotsLoader component and integrate it into MessageList; create WelcomeSection for initial user experience.
- Update README and add config.toml for new model providers.
- Add token usage tracking and display in ChatInterface.
- Refactor event handling in useCodexEvents hook.
- Enhance session file parsing and metadata extraction.
- Enhance event handling and token usage tracking.
- Add vendor platform detection and binary discovery.
- Add functionality to create new windows in the Tauri application.
- Add model and provider.

### Fixes
- Update profile assignment logic in getNewConversationParams to handle OpenAI provider correctly.
- Adjust button class in ConversationList for better text truncation and layout.
- Update McpDialog to use openUrl from plugin-shell and improve error handling in ProjectsPage with toast notifications.
- Update feature request link and correct license badge color in README.
- Chat mode defaultApprovalPolicy to untrusted.
- Fix selector label fallback in Sandbox component.
- Improve current directory name retrieval in FileTreeHeader.

### Refactor
- Reorganize event components and enhance event handling in ChatPanel.
- Integrate Zustand persistence in useConversationStore for improved state management.
- Enhance ProviderModels component to fetch and manage Ollama models dynamically.
- Update event key generation in ChatPanel to include index for improved uniqueness.
- Remove old codex and chat files.
- Remove ChatCompose component and update ChatPanel and NewChatView to use Zustand for input state management.
- Integrate @radix-ui/react-toast for enhanced user notifications and update ChatPanel to utilize new event handling and state management features.
- Change model field in Profile struct to be optional for improved flexibility.
- Refactor src-tauri/src/config.rs to folder.
- Memoize NewChatView to optimize rendering performance and update ChatPage to use the memoized component.
- Replace ChatCompose with ChatInput in ChatPanel for enhanced input features and integrate Zustand for state management.
- Enhance NewChatView and ProviderModels components with improved state management and model removal functionality.
- Update ChatCompose, ChatPanel, and NewChatView to use Textarea for multi-line input; enhance event handling in useConversationStore.
- Remove TaskPage and streamline ChatView component with new NewChatView integration.
- Clean up AppHeader by removing unused logoSettings and simplifying logo rendering.
- Remove filetree watch.
- Remove image tab.
- Set updater false.
- Refactor: set env_key as option.
- Refactor CodexClient from proto to app-server and related modules for improved JSON-RPC handling.
- Redesign chat interface sandbox and approval controls.
- Simplify FileTreeItem component's chat input handling.

### Chore
- Bump version to 0.7.1 in package.json, Cargo.toml, and Cargo.lock.
- Update issue report template title and enhance CI workflows to use codex for TypeScript bindings generation.
- Update CI workflows to export TypeScript bindings before building Tauri app and improve documentation for generating TS bindings.
- Cargo check to cargo build.
- Bump version to 0.6.0 in package.json, Cargo.toml, and Cargo.lock.

### Documentation
- Add related projects section to README with links to Codexia, Codexsm, MCP Linker, and awesome-codex-cli.
- Add how to pass MacOS damaged warning.
- Update README and add config.toml for new model providers.
- Update CHANGELOG with new features and fixes.
- Update issue_report.md.
- Update README with new features and news.

## [0.6.0] - 2025-09-26

### Features
- Add token usage tracking and display in ChatInterface.
- Refactor event handling in useCodexEvents hook.
- Enhance session file parsing and metadata extraction.
- Enhance event handling and token usage tracking.
- Add vendor platform detection and binary discovery.
- Add functionality to create new windows in the Tauri application.
- Add model and provider.

### Fixes
- Update McpDialog to use openUrl from plugin-shell and improve error handling in ProjectsPage with toast notifications.
- Improve current directory name retrieval in FileTreeHeader.

### Refactor
- Simplify FileTreeItem component's chat input handling.

### Chore
- Bump version to 0.6.0 in package.json, Cargo.toml, and Cargo.lock.

### Documentation
- Update CHANGELOG with new features and fixes.
- Update issue_report.md.
- Update README with new features and news.

## 2025-09-24

### Feature
- a button to create new window and a tauri command

## [0.5.2] - 2025-09-24

### Feature
- optional login to share project

### Fix
- GitHub login issues on Linux and Windows

## [0.5.1] - 2025-09-24

Make Github login simple

## [0.5.0] - 2025-09-23

### Features
- Implement user profile, share project to community and find co-founder features.
- Enhance MCP management via updated `McpDialog`.
- Improve FileTreeHeader with better search input focus handling.
- Improve reasoning message handling in `useCodexEvents`.
- Add Prompt Optimizer settings and control components.
- Add `ConversationCategoryDialog` and `ResumeSessionsDialog` components.
- Enhance `ReasoningEffortSelector` with dynamic effort options.

### Fixes
- Fix navigation logic in `ExploreProjectsPage`.
- Improve layout overflow handling in `Layout` component.
- Handle Tauri errors on macOS to prevent unexpected application errors.
- Improve layout spacing in `AppHeader`.

### Refactor
- Streamline authentication logic and improve `AppHeader`.
- Remove `FileReferenceList` and simplify `ChatInput`.
- Simplify session file retrieval and rollout path search.

### Documentation
- Multiple README updates to improve clarity, feature descriptions, and community information.
- Add issue report template to improve bug reporting.

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
