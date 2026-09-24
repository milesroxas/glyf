#!/bin/bash

# Flash the built ELF over SWD via OpenOCD.
# Default probe interface is Raspberry Pi Debug Probe / CMSIS-DAP.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ELF="$PROJECT_DIR/glyf.elf"
OPENOCD_INTERFACE_CFG="${GLYF_OPENOCD_INTERFACE_CFG:-interface/cmsis-dap.cfg}"
OPENOCD_TARGET_CFG="${GLYF_OPENOCD_TARGET_CFG:-target/rp2040.cfg}"
OPENOCD_ADAPTER_SPEED="${GLYF_OPENOCD_ADAPTER_SPEED:-5000}"

if [ ! -f "$ELF" ]; then
    echo "Missing firmware artifact: $ELF"
    echo "Run: bash build.sh"
    exit 1
fi

if ! command -v openocd >/dev/null 2>&1; then
    echo "openocd is not installed."
    echo "Install with: brew install open-ocd"
    exit 1
fi

echo "Flashing $ELF via SWD..."
echo "Interface config: $OPENOCD_INTERFACE_CFG"
echo "Target config:    $OPENOCD_TARGET_CFG"
echo "Adapter speed:    $OPENOCD_ADAPTER_SPEED kHz"

openocd \
    -f "$OPENOCD_INTERFACE_CFG" \
    -f "$OPENOCD_TARGET_CFG" \
    -c "adapter speed $OPENOCD_ADAPTER_SPEED" \
    -c "program \"$ELF\" verify reset exit"
