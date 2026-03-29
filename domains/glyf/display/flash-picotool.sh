#!/bin/bash

# Flash an existing glyf.uf2 via picotool only.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
UF2="$PROJECT_DIR/glyf.uf2"

if [ ! -f "$UF2" ]; then
    echo "Missing firmware artifact: $UF2"
    echo "Run: bash build.sh"
    exit 1
fi

if ! command -v picotool >/dev/null 2>&1; then
    echo "picotool is not installed."
    echo "Install with: brew install picotool"
    exit 1
fi

echo "Flashing $UF2 with picotool..."

# First try normal running-firmware handoff, then BOOTSEL mode.
if picotool load "$UF2" -f; then
    echo "Flashed successfully!"
elif picotool load "$UF2"; then
    echo "Flashed successfully!"
    picotool reboot -f 2>/dev/null || true
else
    echo "picotool could not access the Pico."
    echo "If the device is in BOOTSEL mode, confirm the USB connection and retry."
    echo "Otherwise use the explicit UF2 path: bash flash-uf2.sh"
    exit 1
fi
