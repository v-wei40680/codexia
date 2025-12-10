#!/bin/bash
set -euo pipefail

VERSION=$(grep -A 1 '\[workspace.package\]' Cargo.toml | grep version | sed 's/.*"\([^"]*\)".*/\1/')
cargo build -p cc@$VERSION --bin codexia-web --release