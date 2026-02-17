#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if command -v jq >/dev/null 2>&1; then
  version="$(jq -r '.version' "${root_dir}/package.json")"
else
  version="$(node -e "console.log(require(process.argv[1]).version)" "${root_dir}/package.json")"
fi
os="${WEB_OS:-$(uname -s | tr '[:upper:]' '[:lower:]')}"
arch="${WEB_ARCH:-$(uname -m)}"
libc=""
target_triple="${WEB_TARGET_TRIPLE:-}"

bin_ext=""
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) bin_ext=".exe" ;;
esac

case "${arch}" in
  amd64|x86_64) arch="x86_64" ;;
  arm64|aarch64) arch="aarch64" ;;
esac

if [[ "${os}" == "linux" ]]; then
  if [[ -n "${WEB_LIBC:-}" ]]; then
    libc="${WEB_LIBC}"
  else
    libc="gnu"
    if command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
      libc="musl"
    fi
  fi
fi

VITE_WEB_PORT="${VITE_WEB_PORT:-7420}" bun run build
cargo_args=(
  build
  --release
  --manifest-path "${root_dir}/src-tauri/Cargo.toml"
  --no-default-features
  --features web
)
if [[ -n "${target_triple}" ]]; then
  cargo_args+=(--target "${target_triple}")
fi
cargo "${cargo_args[@]}"

stage_dir="/tmp/dist-web"
rm -rf "${stage_dir}"
mkdir -p "${stage_dir}"

cp -R "${root_dir}/dist" "${stage_dir}/dist"
bin_dir="${root_dir}/src-tauri/target/release"
if [[ -n "${target_triple}" ]]; then
  bin_dir="${root_dir}/src-tauri/target/${target_triple}/release"
fi
cp "${bin_dir}/codexia${bin_ext}" "${stage_dir}/codexia${bin_ext}"

tar_name="codexia-web-${version}-${os}-${arch}.tar.gz"
if [[ -n "${libc}" ]]; then
  tar_name="codexia-web-${version}-${os}-${arch}-${libc}.tar.gz"
fi
tar -C "${stage_dir}" -czf "/tmp/${tar_name}" .

echo "Wrote /tmp/${tar_name}"
