#!/bin/bash

# Build script for glyf firmware (Pico SDK / TinyUSB)
# Requires PICO_SDK_PATH to be set or passed as an environment variable.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FIRMWARE_DIR="$PROJECT_DIR/firmware"
BUILD_DIR="$FIRMWARE_DIR/build"
FLASH="${1:-}"

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

make -j"$(nproc)"

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

# ── Optional auto-flash ──────────────────────────────────────────────────────
if [ "$FLASH" = "flash" ]; then
    echo "Flashing..."

    # Reboot into bootloader if device is already running firmware
    if picotool info &>/dev/null 2>&1; then
        echo "Device detected — rebooting to bootloader..."
        picotool reboot -f -u || true
        sleep 1
    fi

    if picotool load "$PROJECT_DIR/glyf.uf2" -f; then
        echo "Flashed successfully!"
        picotool reboot -f || true
    else
        echo "Flash failed."
        echo "Hold BOOTSEL while plugging in USB, then retry: ./build.sh flash"
        exit 1
    fi
else
    echo "To flash:"
    echo "  Drag glyf.uf2 to the RPI-RP2 drive"
    echo "  — or —"
    echo "  ./build.sh flash"
fi
