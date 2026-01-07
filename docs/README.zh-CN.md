# Codexia

[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white)](https://discord.gg/zAjtD4kf5K)
[![Follow on 𝕏](https://img.shields.io/badge/𝕏-@lisp__mi-1c9bf0)](http://x.com/intent/follow?screen_name=lisp_mi)

Codexia 是一个强大的跨平台 AI 桌面应用，专为 OpenAI Codex CLI 打造，提供基于 Tauri 的图形界面与工具集，以显著增强开发体验，并已支持 Claude Code。

支持一键将文件路径添加到对话中，提供 Prompt 笔记本、Git Worktree、Diff Viewer，
并内置多种文件格式（如 PDF、CSV、XLSX）的预览与选择功能。

![Home](../public/codexia-home.png)
![Reasoning](../public/codexia-reason.png)

## 📋 目录
- [✨ 特点](#-特点)
- [🚀 安装](#-安装)
- [📖 快速入门](#-快速入门)
- [🤝 贡献](#-贡献)
- [许可协议](#许可协议)

## ✨ 特点

- 项目级别会话管理
- 平行会话
- 多窗口
- 远程控制
- Token 使用统计与分析
- Prompt 笔记等管理分类
- 内置智慧格言（用于启动页/空闲状态展示）
- 内置 MCP 商店与管理
- 内置 claude skills 商店与管理
- 支持 Web 预览方便 vibe coding
- git worktree 防止其它 agent 误删
- 一键优化 prompt
- 内置学习资源分类商店

### codex 特点
- 沙箱
- 一键控制 gpt 系列模型网络搜索
- 图片与一键截图输入

### Claude code 特点
- 读取并展示 `~/.claude.json` 中的项目
- 会话历史管理与恢复
- 通过图形界面继续或新建 Claude Code 会话

## 🚀 安装

### 先决条件
- **Codex CLI**: [github Codex](https://github.com/openai/codex)
- **Claude Code CLI**: [Claude's official site](https://claude.ai/code)
- **Git**: 建议安装

### 下载

- [release](https://github.com/milisp/codexia/releases)
- [modern-github-release](https://milisp.github.io/modern-github-release/#/repo/milisp/codexia)

### macOS homebrew

```sh
brew tap milisp/codexia
brew install --cask codexia
```

## 📖 快速入门

1. 打开 Codexia
2. 选择 Agent（默认 Codex，可切换 Claude Code）
3. 选择或加载项目
4. 输入 Prompt，开始任务

## AI 网站报道
- [ai-bot](https://ai-bot.cn/codexia/)
- [xmsumi](https://www.xmsumi.com/detail/1614)
- [aipuzi](https://www.aipuzi.cn/ai-news/codexia.html)

> ⭐ 如果你觉得 Codexia 对你有帮助，欢迎 Star 本项目并关注作者。

## 🤝 贡献

我们欢迎您的贡献！详情请参阅我们的[贡献指南](../CONTRIBUTING.md)。

参与本项目贡献即表示您同意您的贡献将同时受 AGPL-3.0 许可证和 Codexia 商业许可证的约束。

### 贡献领域

- 🐛 错误修复和改进
- ✨ 新功能和增强功能
- 📚 文档改进
- 🎨 用户界面/用户体验增强
- 🧪 测试覆盖率
- 🌐 国际化

[报告错误 · 提交功能请求](https://github.com/milisp/codexia/issues)

## 许可协议

Codexia 采用双重许可，包括 **AGPL-3.0** 和 **商业许可**。

- **AGPL-3.0** — 适用于开源用途。
- **商业许可** — 适用于闭源、专有、托管或 SaaS 用途。

有关完整条款和商业咨询，请参阅 [COMMERCIAL.md](../COMMERCIAL.md)。
