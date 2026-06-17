## 🚀 Release 0.34.0

### ⚡ Performance & Stability Boosts
- Smarter File Watching: Completely overhauled the file system monitoring system. By replacing targeted polling with a modern, debounced directory-wide subscription, the app now handles massive file changes effortlessly. This dramatically reduces CPU overhead and eliminates redundant file tracking, giving you a much snappier UI.
- Streamlined Startup: Added automatic syncing for llms.json provider configurations on startup, ensuring your LLM settings are always up-to-date and ready to go the moment the app opens.

### 🔄 UX & Interface Improvements

- Manual Refresh for Diffs: Added manual refresh keys for code diff components, giving you direct control over when to reload and view file differences.
- Cleaner Model Selection: Rewrote the internal provider and model selection logic. While under the hood, this translates to a faster, more reliable, and conflict-free experience when switching between different AI models.

### 📚 Documentation & Ecosystem Updates

- Easier Downloads: Moved the Prebuilt Releases section to the top of the README so new users can find and download the app instantly.
- Discover Ecosystem Tools: Added a brand-new Ecosystem section showcasing featured tools, skills, and community MCP servers to help you get the most out of the platform.
- Weekly Market Spotlights: Introduced a weekly spotlight section in the documentation to highlight top-tier community extensions and marketplace contributions.
