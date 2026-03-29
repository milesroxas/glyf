#!/bin/bash
# Auto-flash script - watches for bootloader mode and automatically flashes firmware

# Default keymap (change this to your preferred default)
DEFAULT_KEYMAP="apps"

echo "👀 Watching for bootloader mode..."
echo "Press your bootloader reset key (hold 2 seconds) to trigger auto-flash"
echo "Default keymap: $DEFAULT_KEYMAP"
echo "Press Ctrl+C to stop watching"
echo ""

while true; do
    # Check if device is in bootloader mode
    if picotool info >/dev/null 2>&1; then
        echo "✓ Bootloader detected!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  SELECT FIRMWARE TO FLASH"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  1) apps   - Hardcoded app launchers (recommended)"
        echo "  2) via    - VIA-compatible for GUI config"
        echo "  3) default - Basic testing keymap"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        # Give user 10 seconds to choose
        read -t 10 -p "Enter choice (1-3) or wait 10s for '$DEFAULT_KEYMAP': " choice

        case $choice in
            1)
                KEYMAP="apps"
                echo "Selected: apps"
                ;;
            2)
                KEYMAP="via"
                echo "Selected: via"
                ;;
            3)
                KEYMAP="default"
                echo "Selected: default"
                ;;
            *)
                KEYMAP="$DEFAULT_KEYMAP"
                echo ""
                echo "⏱️  Timeout - using default: $DEFAULT_KEYMAP"
                ;;
        esac

        echo ""
        echo "Building and flashing $KEYMAP keymap..."
        ./build.sh "$KEYMAP" flash

        if [ $? -eq 0 ]; then
            echo ""
            echo "✓ Flash complete! Device should be running $KEYMAP firmware."
            echo "👀 Watching for next bootloader reset..."
        else
            echo ""
            echo "✗ Flash failed. Check errors above."
            echo "👀 Continuing to watch..."
        fi

        # Wait a bit before checking again to avoid detecting same bootloader session
        sleep 3
    fi

    # Check every 0.5 seconds
    sleep 0.5
done
