# Remote control Web Server Guide

This guide covers local web-mode and packaging for Codexia web server without GUI.

## Run after installation

### Headless binary (Linux / Windows / macOS)

The prebuilt headless binary is compiled without GUI (no Tauri). Just run it directly:

```sh
./codexia-web
```

Optional flags:

```sh
./codexia-web --port 7420
```

## Develop frontend and Rust backend together

Run:

```sh
just dev-web
```

## Build headless web package without GUI from source

Linux/macOS:

```sh
bash scripts/package-web.sh
```

Windows:

```bat
scripts/package-web.bat
```
