#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

version="$(jq -r '.version' "${root_dir}/package.json")"
os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

bin_ext=""
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) bin_ext=".exe" ;;
esac

VITE_WEB_PORT="${VITE_WEB_PORT:-7420}" bun run build
cargo build --release --manifest-path "${root_dir}/src-tauri/Cargo.toml"

stage_dir="/tmp/dist-web"
rm -rf "${stage_dir}"
mkdir -p "${stage_dir}"

cp -R "${root_dir}/dist" "${stage_dir}/dist"
cp "${root_dir}/src-tauri/target/release/codexia${bin_ext}" "${stage_dir}/codexia${bin_ext}"

tar_name="codexia-web-${version}-${os}-${arch}.tar.gz"
tar -C "${stage_dir}" -czf "/tmp/${tar_name}" .

echo "Wrote /tmp/${tar_name}"
