# Remote control Web Server Guide

This guide covers local web-mode and packaging for Codexia web server without GUI.

## Run after installation

### Linux or Windows

```sh
codexia --web
```

### macOS

```sh
/Applications/codexia.app/Contents/MacOS/codexia --web
```

or download prebuilt linux headless web server then run

```sh
codexia --web
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
