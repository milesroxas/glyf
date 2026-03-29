#!/bin/bash

# Build script for glyf firmware (Pico SDK / TinyUSB).
# Produces build artifacts only; flashing is handled by explicit transport scripts.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIRMWARE_DIR="$PROJECT_DIR/firmware"
BUILD_DIR="$FIRMWARE_DIR/build"

# ── Pico SDK check ───────────────────────────────────────────────────────────
if [ -z "$PICO_SDK_PATH" ]; then
    # Try the repo-local sdks directory as a fallback
    FALLBACK="$(cd "$PROJECT_DIR/../../.." && pwd)/sdks/pico-sdk"
    if [ -d "$FALLBACK" ]; then
        export PICO_SDK_PATH="$FALLBACK"
    else
        echo "Error: PICO_SDK_PATH is not set."
        echo ""
        echo "Clone the Pico SDK and export the path:"
        echo "  git clone https://github.com/raspberrypi/pico-sdk ~/pico-sdk"
        echo "  cd ~/pico-sdk && git submodule update --init"
        echo "  export PICO_SDK_PATH=~/pico-sdk"
        exit 1
    fi
fi

echo "Building glyf firmware..."
echo "SDK: $PICO_SDK_PATH"
echo ""

# ── CMake configure + build ─────────────────────────────────────────────────
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

cmake .. \
    -DPICO_SDK_PATH="$PICO_SDK_PATH" \
    -DCMAKE_BUILD_TYPE=Release \
    -DPICO_BOARD=pico \
    --fresh \
    -Wno-dev 2>&1 | grep -v "^--"

# macOS has no nproc; Linux often does
JOBS="$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)"
make -j"$JOBS"

UF2="$BUILD_DIR/glyf.uf2"

if [ ! -f "$UF2" ]; then
    echo "Build failed — glyf.uf2 not found."
    exit 1
fi

cp "$UF2" "$PROJECT_DIR/"
echo ""
echo "Build successful!"
echo "Firmware: $PROJECT_DIR/glyf.uf2"
echo ""
echo "Next steps:"
echo "  Explicit UF2 path:      bash flash-uf2.sh"
echo "  Explicit picotool path: bash flash-picotool.sh"
