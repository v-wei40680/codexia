# Codexia Architecture

This document provides a high-level overview of Codexia’s architecture, including the frontend, backend, and how sessions are managed. For app usage, see [USAGE](./USAGE.md).

## Overview

Codexia is a cross‑platform desktop app built with Tauri v2 (Rust backend) and React + TypeScript (frontend). It provides a GUI around the Codex CLI with multi-session handling, streaming responses, and project‑aware workflows.

## Frontend (React + TypeScript)

- Zustand for state management with persistence
- shadcn/ui for UI components (Radix + Tailwind CSS)
- Real-time event handling for streaming responses
- Theme and accent selection persisted via Zustand

## Backend (Rust + Tauri)

- Multi-process management for concurrent Codex sessions
- JSON-RPC protocol over stdin/stdout to communicate with the Codex CLI
- Async event streaming from backend to frontend
- Resource cleanup and process lifecycle management per session

## Session Management

- Independent processes per chat session
- Configurable startup parameters (model, sandboxing, approval policy, working directory)
- Event isolation between sessions for security and clarity

important files connect Codexia and Codex CLI
 
```
useCodexEvents.rs
codex_client.rs
```

## Project Structure

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
└── package.json            # Node.js dependencies
```

## Key Technologies

- Frontend: React 19, TypeScript, Zustand, shadcn/ui, Vite
- Backend: Rust, Tauri v2, Tokio async runtime
- Process Communication: JSON-RPC over stdin/stdout
- State Management: Zustand with persistence middleware
- UI Framework: shadcn/ui built on Radix UI and Tailwind CSS

