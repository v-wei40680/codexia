#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_TOKEN is not set"
  exit 1
fi
curl -f -L \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/milisp/codexia/releases/latest" > release.json
RELEASE_JSON="release.json"

if [ ! -f "$RELEASE_JSON" ]; then
  echo "Error: $RELEASE_JSON not found. Please ensure it exists."
  exit 1
fi

VERSION=$(jq -r '.tag_name' "$RELEASE_JSON")

git clone https://x-access-token:${GITHUB_TOKEN}@github.com/milisp/homebrew-codexia.git
cd homebrew-codexia

# Extract SHAs from release.json
# content is like "sha256:..." so we cut the prefix
ARM_SHA=$(jq -r '.assets[] | select(.name | contains("aarch64")) | .digest' "$RELEASE_JSON" | cut -d: -f2)
INTEL_SHA=$(jq -r '.assets[] | select(.name | contains("x64")) | .digest' "$RELEASE_JSON" | cut -d: -f2)

if [ -z "$ARM_SHA" ] || [ -z "$INTEL_SHA" ]; then
  echo "Error: Could not extract SHAs from $RELEASE_JSON"
  exit 1
fi

echo "Updating to version $VERSION"
echo "Intel SHA: $INTEL_SHA"
echo "ARM SHA: $ARM_SHA"

# Determine the file to update. Prefer Casks/codexia.rb, fallback to scripts/codexia.rb if user hinted at that structure
TARGET_FILE="Casks/codexia.rb"

sed -i '' "s/version \".*\"/version \"${VERSION}\"/" "$TARGET_FILE"
sed -i '' "/on_intel do/,/end/ s/sha256 \".*\"/sha256 \"${INTEL_SHA}\"/" "$TARGET_FILE"
sed -i '' "/on_arm do/,/end/ s/sha256 \".*\"/sha256 \"${ARM_SHA}\"/" "$TARGET_FILE"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add "$TARGET_FILE"
git commit -m "chore(cask): bump homebrew tap codexia to v${VERSION}"
git push
