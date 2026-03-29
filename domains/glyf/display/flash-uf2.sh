#!/bin/bash

# Flash an existing glyf.uf2 by copying it to a mounted RP2040 BOOTSEL drive.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
UF2="$PROJECT_DIR/glyf.uf2"
RPI_DRIVE="/Volumes/RPI-RP2"

if [ ! -f "$UF2" ]; then
    echo "Missing firmware artifact: $UF2"
    echo "Run: bash build.sh"
    exit 1
fi

if [ ! -d "$RPI_DRIVE" ]; then
    echo "BOOTSEL drive not found at $RPI_DRIVE"
    echo "Hold BOOTSEL while plugging in the Pico, then retry."
    exit 1
fi

echo "Copying $UF2 to $RPI_DRIVE..."
cp "$UF2" "$RPI_DRIVE/"
sync
echo "Copied UF2. The Pico should reboot automatically."
