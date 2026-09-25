#!/bin/bash

# Build the apps firmware and bundle it into the companion app
# (apps/macro-eleven/src-tauri/firmware). The app offers this image as an
# update to any device that reports an older version (firmware/version.h).
# Bump the version in firmware/version.h before bundling a release.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$PROJECT_DIR/../../../.." && pwd)"
BUNDLE_DIR="$REPO_DIR/apps/macro-eleven/src-tauri/firmware"
KEYMAP="apps" # The companion app depends on this keymap's Raw HID handler

version_part() {
    sed -n "s/^#define MACRO_ELEVEN_FW_VERSION_$1 \([0-9][0-9]*\)$/\1/p" "$PROJECT_DIR/firmware/version.h"
}
MAJOR="$(version_part MAJOR)"
MINOR="$(version_part MINOR)"
PATCH="$(version_part PATCH)"
if [ -z "$MAJOR" ] || [ -z "$MINOR" ] || [ -z "$PATCH" ]; then
    echo "✗ Could not read the version from firmware/version.h"
    exit 1
fi
VERSION="$MAJOR.$MINOR.$PATCH"

"$PROJECT_DIR/build.sh" "$KEYMAP"

mkdir -p "$BUNDLE_DIR"
cp "$PROJECT_DIR/handwired_macro_eleven_${KEYMAP}.uf2" "$BUNDLE_DIR/macro_eleven.uf2"
SHA256="$(shasum -a 256 "$BUNDLE_DIR/macro_eleven.uf2" | cut -d' ' -f1)"

cat > "$BUNDLE_DIR/manifest.json" <<EOF
{
  "version": "$VERSION",
  "keymap": "$KEYMAP",
  "file": "macro_eleven.uf2",
  "sha256": "$SHA256"
}
EOF

echo "✓ Bundled firmware $VERSION into $BUNDLE_DIR"
