# Codexia

A modern, multi-session GUI application for the [Codex CLI](https://github.com/openai/codex) built with Tauri v2, React, and TypeScript.

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

### ⚙️ **Flexible Configuration**
- Support for multiple AI providers (OpenAI, OSS via Ollama, Custom)
- Configurable models per session (GPT, Claude, Llama, etc.)
- Adjustable sandbox policies (read-only, workspace-write, full-access)
- Customizable approval policies for command execution
- Working directory selection for each session

### 🎯 **Professional UX**
- Clean, responsive interface built with shadcn/ui components
- Session management sidebar with visual status indicators
- Configuration panel with live preview
- Debug panel for monitoring session states
- Persistent UI state and preferences

### 🛡️ **Security & Control**
- Sandbox execution modes for safe code running
- Approval workflows for sensitive operations
- Configurable command execution policies
- Isolated processes per session for security

## 🚀 Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (recommended) or npm/yarn
- [Codex CLI](https://github.com/anthropics/codex) installed and configured

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd codexia
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run the development server:**
   ```bash
   bun tauri dev
   ```

### Building for Production

```bash
bun run build
bun tauri build
```

## 🎮 Usage

### Creating Sessions
- Click the **"+"** button in the session sidebar to create a new chat session
- Each session starts with an independent Codex process
- Configure working directory, model, and policies per session

### Managing Conversations
- Switch between sessions by clicking on them in the sidebar
- Sessions continue running in the background when not active
- Close sessions using the **"×"** button (this terminates the Codex process)

### Configuration
- Click the **Settings** icon to open the configuration dialog
- Changes apply to the currently active session
- Configurations are automatically saved and restored

### Monitoring
- Use the **Debug** panel (bottom-right) to monitor running sessions
- View backend process status and frontend session states
- Sync session states between frontend and backend

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Zustand** for state management with persistence
- **shadcn/ui** for UI components
- **Tauri** for native desktop integration
- **Real-time event handling** for streaming responses

### Backend (Rust + Tauri)
- **Multi-process management** for concurrent Codex sessions
- **JSON-RPC protocol** communication with Codex CLI
- **Async event streaming** to frontend
- **Resource cleanup** and process lifecycle management

### Session Management
- **Independent processes** per chat session
- **Configurable startup parameters** per session
- **Event isolation** between sessions
- **Graceful cleanup** on session termination

## 📋 Supported Codex Features

- ✅ **Interactive chat** with AI assistants
- ✅ **Code generation and editing** in various languages
- ✅ **File operations** with sandbox controls
- ✅ **Command execution** with approval workflows
- ✅ **Multiple AI providers** (OpenAI, OSS models via Ollama)
- ✅ **Working directory context** for project-aware assistance
- ✅ **Streaming responses** for real-time interaction

## 🛠️ Development

### Project Structure
```
codexia/
├── src/                    # React frontend source
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand state management
│   ├── services/           # Business logic services
│   └── types/              # TypeScript type definitions
├── src-tauri/              # Rust backend source
│   ├── src/
│   │   ├── lib.rs          # Main Tauri application
│   │   └── codex_client.rs # Codex process management
│   └── Cargo.toml          # Rust dependencies
├── public/                 # Static assets
└── package.json           # Node.js dependencies
```

### Key Technologies
- **Frontend**: React 19, TypeScript, Zustand, shadcn/ui, Vite
- **Backend**: Rust, Tauri v2, Tokio async runtime
- **Process Communication**: JSON-RPC, stdin/stdout streams
- **State Management**: Zustand with persistence middleware
- **UI Framework**: shadcn/ui built on Radix UI and Tailwind CSS

### Development Commands
```bash
# Start development server
bun tauri dev

# Build frontend only
bun run build

# Check Rust code
cargo check --manifest-path src-tauri/Cargo.toml

# Format code
cargo fmt --manifest-path src-tauri/Cargo.toml
bun run format
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for the Codex CLI
- [Tauri](https://tauri.app/) for the excellent desktop app framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- The open source community for the amazing tools and libraries

---

**Built with ❤️ using Tauri, React, and Rust**