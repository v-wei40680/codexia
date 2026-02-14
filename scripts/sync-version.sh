#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGE_JSON="$ROOT_DIR/package.json"
CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"
INFO_PLIST="$ROOT_DIR/src-tauri/Info.plist"

usage() {
  echo "Usage: $0 <version>"
  echo "Example: $0 0.24.0"
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

NEW_VERSION="$1"

# Basic version format check: 1.2.3 or 1.2.3-beta.1
if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Error: invalid version format: $NEW_VERSION"
  echo "Expected format like: 1.2.3 or 1.2.3-beta.1"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required but not installed."
  exit 1
fi

if [[ ! -f "$PACKAGE_JSON" || ! -f "$CARGO_TOML" || ! -f "$INFO_PLIST" ]]; then
  echo "Error: one or more target files were not found."
  exit 1
fi

# Update package.json
TMP_PACKAGE_JSON="$(mktemp)"
jq --arg version "$NEW_VERSION" '.version = $version' "$PACKAGE_JSON" > "$TMP_PACKAGE_JSON"
mv "$TMP_PACKAGE_JSON" "$PACKAGE_JSON"

# Update version in [package] section of Cargo.toml only
TMP_CARGO_TOML="$(mktemp)"
awk -v version="$NEW_VERSION" '
BEGIN {
  in_package = 0
  updated = 0
}
/^\[package\]/ {
  in_package = 1
  print
  next
}
/^\[/ {
  in_package = 0
  print
  next
}
{
  if (in_package && $0 ~ /^version[[:space:]]*=/ && updated == 0) {
    print "version = \"" version "\""
    updated = 1
    next
  }
  print
}
END {
  if (updated == 0) {
    exit 1
  }
}
' "$CARGO_TOML" > "$TMP_CARGO_TOML"
mv "$TMP_CARGO_TOML" "$CARGO_TOML"

# Update CFBundleShortVersionString value in Info.plist
TMP_INFO_PLIST="$(mktemp)"
awk -v version="$NEW_VERSION" '
BEGIN {
  saw_key = 0
  updated = 0
}
{
  if ($0 ~ /<key>CFBundleShortVersionString<\/key>/) {
    saw_key = 1
    print
    next
  }

  if (saw_key == 1 && $0 ~ /<string>.*<\/string>/ && updated == 0) {
    print "  <string>" version "</string>"
    saw_key = 0
    updated = 1
    next
  }

  print
}
END {
  if (updated == 0) {
    exit 1
  }
}
' "$INFO_PLIST" > "$TMP_INFO_PLIST"
mv "$TMP_INFO_PLIST" "$INFO_PLIST"

echo "Version updated to $NEW_VERSION in:"
echo "- package.json"
echo "- src-tauri/Cargo.toml"
echo "- src-tauri/Info.plist"
