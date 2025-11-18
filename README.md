<div align="center">
  <img src="src-tauri/icons/128x128@2x.png" alt="Codexia Logo" width="120" height="120" />

  # Codexia

  A powerful GUI and Toolkit for Codex CLI

Create custom agents, manage interactive Codex CLI sessions, run secure background agents, ~~fork chat~~, file-tree integration, prompt notepad, git diff, build-in pdf csv/xlsx viewer, and more.

  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Features-✨-blue?style=for-the-badge" alt="Features"></a>
    <a href="#installation"><img src="https://img.shields.io/badge/Install-🚀-green?style=for-the-badge" alt="Installation"></a>
    <a href="#usage"><img src="https://img.shields.io/badge/Usage-📖-purple?style=for-the-badge" alt="Usage"></a>
    <a href="#development"><img src="https://img.shields.io/badge/Develop-🛠️-orange?style=for-the-badge" alt="Development"></a>
    <a href="https://discord.gg/zAjtD4kf5K"><img src="https://img.shields.io/badge/Discord-Join-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
  </p>
</div>

> [!TIP]
> **⭐ Star the repo and follow [@lisp_mi](https://x.com/lisp_mi) on X for more**.

## 🌟 Overview

**codexia** is a powerful desktop application that transforms how you interact with Codex CLI. Built with Tauri 2, it provides a beautiful GUI for managing your Codex CLI sessions, creating custom agents, tracking usage, and much more.

Think of codexia as your command center for Codex CLI - bridging the gap between the command-line tool and a visual experience that makes AI-assisted development more intuitive and productive.

![Reasoning](public/codexia-reason.png)

▶️ [Watch the automation video on Twitter](https://x.com/lisp_mi/status/1966147638266589376)

## ✨ Features

### 🗂️ **Project & Session Management**
- **Visual Project Browser**: Navigate through all your Codex CLI projects in `~/.codex/config.toml`
- **Session History**: View and resume past coding sessions with full context, Rename chat title, manage `~/.codex/sessions`
- **multiple windows**: open multiple projects at the same time
- **Category and fav** conversatins

### git worktree and sync file changes
- worktree + sync to prevent accident delete all the changes. undo function.

### remote control
- remote control from browser via any device

### Build-in Mutil file viewer format support

- PDF text selection
- CSV/XLSX preview & selection

### Prompt notepad
- Notepad-chat integration

### ⚙️ **Flexible Configuration**
- Multiple AI providers (OpenAI, Ollama, Gemini, openrouter, xAI, Custom) - see [config.toml](docs/config.toml)
- Per-session model configs
- Adjustable sandbox policies
- Custom approval workflows

### 📊 **Usage Analytics Dashboard**
- **Cost Tracking**: Monitor your usage and costs in real-time
- **Token Analytics**: Detailed breakdown by model, project, and time period
- **Visual Charts**: Beautiful charts showing usage trends and patterns

### 🔌 **MCP Server Management**
- **Server Registry**: Manage Model Context Protocol servers from a central UI
- **Easy Configuration**: Add servers via UI or import from existing configs
- **Want more?**: use [mcp-linker](https://github.com/milisp/mcp-linker) to manage mutil clients include Codex CLI with marketplace.

### Codex CLI features
- Sandbox execution modes for safe code running
- Approval workflows for sensitive operations
- Configurable command execution policies
- Isolated processes per session for security
- image input
- Screenshot as image input
- toggle codex built-in gpt-5 web search

### 📝 **AGENTS.md**
- **Built-in Editor**: Edit AGENTS.md file directly within the app
- **Live Preview**: See your markdown rendered in real-time
- **Syntax Highlighting**: Full markdown support with syntax highlighting

### 🎯 **Professional UX**
- Responsive UI with shadcn/ui
- Config panel
- Syntax-highlighted markdown
- Todo plan display
- ~~Fork chat~~
- Persistent UI state
- Auto WebPreview (e.g., Next.js http://localhost:3000)
- Theme & Accent selection

## 📖 Usage

### Getting Started

1. **Launch codexia**: Open the application after installation
2. **Welcome Screen**: Choose a project or open a project
3. **First Time Setup**: codexia will automatically detect your `~/.codex` directory

### Managing Projects

```
Projects → Select/Open Project → View Sessions → Resume or Start New
```

- Click on any project to view its sessions
- Each session shows the first message and timestamp
- Resume sessions directly or start new ones

### Creating Agents

```
Configure → Input your prompt → Agent start → Execute
```

1. **Design Your Agent**: Input your prompt
2. **Set Permissions**: chat and plan, Agent, Agent(full), Configure file read/write and network access
3. **Configure Model**: Choose between available Codex models
4. **Set Reasoning Effort**: Configure reasoning models, choose between available Reasoning Effort levels
5. **Execute Tasks**: Run your agent on selected project by sending prompt.

### Manage Sessions

```
Select/Open Project -> Manage Sessions
```

1. **Select/Open Project**
2. **Manage Sessions**: Rename/batch Delete/Delete/Fav/Category

### Tracking Usage

```
Menu → Usage Dashboard → View Analytics
```

- Monitor costs by model, project, and date

### Working with MCP Servers

```
Menu → MCP Manager → Add Server → Configure
```

- Quick Add Servers - desktop-commander and deepwiki
- Manage MPC Servers - Add, Edit, delete, enable/disable
- If you want more features for MCP Servers, get [mcp-linker](https://github.com/milisp/mcp-linker) - mcp marketplace, add and sync mcp servers for multi clients

## 📋 Supported Codex Features

- ✅ Interactive chat
- ✅ Code generation/editing
- ✅ File operations with sandbox
- ✅ Command execution with approval
- ✅ Multiple AI providers
- ✅ Project-aware assistance
- ✅ Streaming responses
- ✅ Built-in Web Search

## 🚀 Installation

### Prerequisites
- **Codex CLI**: Install from [github Codex](https://github.com/openai/codex)
- **Git**: recommend option install [git](https://git-scm.com)

### Download

- [release](https://github.com/codexia-team/codexia/releases)
- [modern-github-release](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

### macOS homebrew

```sh
brew tap milisp/codexia
brew install --cask codexia
```

## 🔨 Build from Source

### Prerequisites

Before building codexia from source, ensure you have the following installed:

#### System Requirements

- **Operating System**: Windows 10/11, macOS 11+, or Linux (Ubuntu 20.04+)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 1GB free space

#### Required Tools

1. **Rust** (1.70.0 or later)
   ```bash
   # Install via rustup
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Bun** (latest version)
   ```bash
   # Install bun
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Git**
   ```bash
   # Usually pre-installed, but if not:
   # Ubuntu/Debian: sudo apt install git
   # macOS: brew install git
   # Windows: Download from https://git-scm.com
   ```

#### Platform-Specific Dependencies

**Linux (Ubuntu/Debian)**
```bash
# Install system dependencies
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libxdo-dev \
  libsoup-3.0-dev \
  libjavascriptcoregtk-4.1-dev
```

**macOS**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install additional dependencies via Homebrew (optional)
brew install pkg-config
```

**Windows**
- Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Install [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (usually pre-installed on Windows 11)

### Build Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/milisp/codexia.git
   cd codexia
   ```

2. **Install Frontend Dependencies**
   ```bash
   bun install
   ```

3. **Build the Application**
   
   **For Development (with hot reload)**
   ```bash
   bun tauri dev
   ```
   
   **For Production Build**
   ```bash
   # Build the application
   bun tauri build
   
   # The built executable will be in:
   # src-tauri/target/release/
   ```

4. **Platform-Specific Build Options**
   
   **Debug Build (faster compilation, larger binary)**
   ```bash
   bun tauri build --debug
   ```
   
   **Universal Binary for macOS (Intel + Apple Silicon)**
   ```bash
   bun tauri build --target universal-apple-darwin
   ```

### Troubleshooting

#### Common Issues

1. **"cargo not found" error**
   - Ensure Rust is installed and `~/.cargo/bin` is in your PATH
   - Run `source ~/.cargo/env` or restart your terminal

2. **Linux: "webkit2gtk not found" error**
   - Install the webkit2gtk development packages listed above
   - On newer Ubuntu versions, you might need `libwebkit2gtk-4.0-dev`

3. **Windows: "MSVC not found" error**
   - Install Visual Studio Build Tools with C++ support
   - Restart your terminal after installation

4. **"codex command not found" error**
   - Ensure Codex CLI is installed and in your PATH
   - Run `type codex` to show codex path
   - Test with `codex --version`

5. **Build fails with "out of memory"**
   - Try building with fewer parallel jobs: `cargo build -j 2`
   - Close other applications to free up RAM

#### Verify Your Build

After building, you can verify the application works:
```bash
# Run the built executable directly
# Linux/macOS
./src-tauri/target/release/codexia

# Windows
./src-tauri/target/release/codexia.exe
```

### Build Artifacts

The build process creates several artifacts:

- **Executable**: The main codexia application
- **Installers** (when using `tauri build`):
  - `.deb` package (Linux)
  - `.AppImage` (Linux)
  - `.dmg` installer (macOS)
  - `.msi` installer (Windows)
  - `.exe` installer (Windows)

All artifacts are located in `src-tauri/target/release/`.

## 🛠️ Development

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Backend**: Rust with Tauri 2
- **UI Framework**: Tailwind CSS v4 + shadcn/ui
- **Package Manager**: Bun

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
│   │   └── codex           # Codex process management
├── public/                 # Public assets
```

### Development Commands

```bash
# Start development server
bun tauri dev

# Run frontend only
bun run dev

# Type checking
bunx tsc --noEmit

# Run Rust tests
cd src-tauri && cargo test

# Format code
cd src-tauri && cargo fmt
```

## 🛡️ **Security & Control**

Codexia prioritizes your privacy and security:

#### Privacy
- **Local Storage**: All data stays on your machine
- **No Telemetry**: No data collection or tracking
- **Open Source**: Full transparency through open source code

## FAQ

- MacOS damaged warning
[🎥Youtube](https://www.youtube.com/watch?v=MEHFd0PCQh4)
The app not sign yet, You can open it by running the terminal command:

```sh
xattr -cr /Applications/codexia.app
open -a /Applications/codexia.app  # or click the Codexia app
```

## 🛣️ Roadmap

- [x] MCP tool call
- More file format support
- Better UI customization
- Plugin system
- Advanced debugging tools
- Real-time collaboration
- Performance optimizations
- [x] token count

🚀 **Call to Action**

If you’re a developer, designer, or AI tinkerer — Join us on this exciting journey to redefine the developer experience with AI. Contribute to the project, share your feedback, and help build the future of intelligent coding environments. Together, we can make Codexia the go-to platform for developers worldwide!

## 💬 Discussions

Join the [Discussions](https://github.com/milisp/codexia/discussions)

## Community forks

- [jeremiahodom/codex-ui](https://github.com/jeremiahodom/codex-ui) - Node.js backend with API/SSE communication
- [Itexoft/codexia](https://github.com/Itexoft/codexia) - SSH integration
- [nuno5645/codexia](https://github.com/nuno5645/codexia) - add support for new reasoning and token count events

## Related project
- [awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) - A curated list of awesome resources, tools for OpenAI Codex CLI

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🌐 Internationalization

## 💖 Contributors

Thanks to all our wonderful contributors!

<a href="https://github.com/milisp/codexia/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=milisp/codexia" />
</a>

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

Codexia is an independent open-source project and is not built by OpenAI or any company.

## 🙏 Acknowledgments

- [Plux](https://github.com/milisp/plux) one click @files from FileTree & notepad
- [Claude code](https://www.anthropic.com/claude-code) Co-Authored-By Claude code
- [codex](https://chatgpt.com/codex) for the Codex CLI
- [Tauri](https://tauri.app/) for the excellent desktop app framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [ChatGPT](https://chatgpt.com) Some code suggest by ChatGPT
- The open source community for the amazing tools and libraries

---

<div align="center">
  <p>
    <strong>Made with ❤️ by <a href="https://github.com/milisp">milisp</a></strong>
  </p>
  <p>
    <a href="https://github.com/milisp/codexia/issues">Report Bug · Request Feature</a>
  </p>
</div>

## 📈 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=milisp/codexia&type=Date)](https://star-history.com/#milisp/codexia)
