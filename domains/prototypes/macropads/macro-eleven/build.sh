#!/bin/bash

# Build script for Macro Eleven firmware
# Compiles QMK firmware and copies .uf2 to project directory
# Optionally flashes to Pico automatically

set -e

KEYBOARD="handwired/macro_eleven"
KEYMAP="${1:-via}"  # Default to via keymap for VIA support
FLASH="${2:-}"      # Pass 'flash' as second argument to auto-flash
QMK_DIR="${QMK_DIR:-$HOME/qmk_firmware}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEYBOARD_DIR="$QMK_DIR/keyboards/handwired/macro_eleven"

# Use user's Python qmk installation
export PATH="$HOME/Library/Python/3.13/bin:$PATH"
export QMK_BIN="$HOME/Library/Python/3.13/bin/qmk"

echo "Building Macro Eleven firmware..."
echo "Keyboard: $KEYBOARD"
echo "Keymap: $KEYMAP"
echo ""

# Sync firmware from repo to QMK tree (repo is source of truth)
mkdir -p "$KEYBOARD_DIR"
cp -R "$PROJECT_DIR/firmware/"* "$KEYBOARD_DIR/"

cd "$QMK_DIR"
qmk compile -kb "$KEYBOARD" -km "$KEYMAP"

UF2_FILE="handwired_macro_eleven_${KEYMAP}.uf2"

if [ -f "$UF2_FILE" ]; then
    cp "$UF2_FILE" "$PROJECT_DIR/"
    echo ""
    echo "✓ Build successful!"
    echo "✓ Firmware copied to: $PROJECT_DIR/$UF2_FILE"
    echo ""

    if [ "$FLASH" = "flash" ]; then
        echo "Attempting to flash..."

        # Try to reboot into bootloader if device is connected (running firmware)
        if picotool info &>/dev/null; then
            echo "Detected Pico, rebooting to bootloader..."
            picotool reboot -f -u || true
            sleep 1
        fi

        # Flash the firmware (device must be in bootloader: hold top-left key 2s, or BOOTSEL when plugging in)
        if picotool load "$PROJECT_DIR/$UF2_FILE" -f; then
            echo "✓ Flashed successfully!"

            # Reboot to run the new firmware
            picotool reboot -f || true
        else
            echo "✗ Flash failed"
            echo "Put Pico in bootloader mode: hold top-left key for 2 seconds, or hold BOOTSEL when plugging in"
            exit 1
        fi
    else
        echo "To flash manually:"
        echo "1. Hold top-left key 2s (or BOOTSEL when plugging in) to enter bootloader"
        echo "2. Drag $UF2_FILE to RPI-RP2 drive"
        echo ""
        echo "To flash automatically:"
        echo "  ./build.sh $KEYMAP flash"
        echo ""
        echo "Or use the watch-and-flash script for an interactive menu:"
        echo "  ./watch-and-flash.sh"
    fi
else
    echo "✗ Build failed - .uf2 file not found"
    exit 1
fi
