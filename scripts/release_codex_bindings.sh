#!/bin/bash
set -euo pipefail

VERSION=$(grep -A 1 '\[workspace.package\]' Cargo.toml | grep version | sed 's/.*"\([^"]*\)".*/\1/')
cargo build -p codex-bindings --bin codex_export_bindings --release

BINARY_PATH="target/release/codex_export_bindings"
CARGO_BIN_DIR="${CARGO_HOME:-$HOME/.cargo}/bin"

if [ -f "$BINARY_PATH" ]; then
    mkdir -p "$CARGO_BIN_DIR"
    cp "$BINARY_PATH" "$CARGO_BIN_DIR/"
    chmod +x "$CARGO_BIN_DIR/codex_export_bindings"
    echo "Released codex_export_bindings v$VERSION to $CARGO_BIN_DIR"
else
    echo "Error: Binary not found at $BINARY_PATH"
    exit 1
fi
