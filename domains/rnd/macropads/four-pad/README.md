# Four Pad

**R&D prototype** — handwired macropad using Raspberry Pi Pico (RP2040) with LCD1602
and application-specific layer switching. Part of macropad R&D for the **Glyf**
ecosystem; see [docs/product-line.md](../../../../docs/product-line.md).

A 7-key handwired macropad with LCD1602 display and application-specific layer switching.

## Project Structure

```
four-pad/
├── firmware/          # Symlink to QMK keyboard folder
├── hardware/
│   ├── pcb/           # KiCad PCB files (if custom PCB)
│   └── schematic/     # Wiring diagrams
├── enclosure/
│   ├── stl/           # Print-ready files
│   ├── step/          # STEP exports for compatibility
│   └── source/        # CAD source files (Fusion360, etc.)
├── docs/              # Build guides, photos, notes
└── config/            # VIA JSON, key mapping exports
```

## Firmware

QMK firmware location: `~/qmk_firmware/keyboards/handwired/four_pad`

### Build Commands

```bash
# Build firmware (copies .uf2 to project directory)
./build.sh apps     # apps keymap (recommended - hardcoded app launchers)
./build.sh via      # via keymap (for VIA configuration)
./build.sh default  # default keymap (basic layout)

# Or build manually with QMK
qmk compile -kb handwired/four_pad -km apps
qmk compile -kb handwired/four_pad -km via
qmk compile -kb handwired/four_pad -km default
```

### Available Keymaps

**apps (Recommended)** - Hardcoded app launchers with automatic layer switching
- No VIA configuration needed
- Apps launch via Spotlight and automatically switch to their layer
- Customize by editing `~/qmk_firmware/keyboards/handwired/four_pad/keymaps/apps/keymap.c`
- Pre-configured apps: Chrome, Figma, VS Code, Slack, Spotify, Terminal

**via** - VIA-compatible for GUI configuration
- Configure layers and shortcuts in VIA app
- Requires VIA definition file (`four_pad_via.json`)
- Layer switching must be done manually with `TO()` keycodes
- More flexible but requires VIA setup

**default** - Basic number/function key layout
- Simple testing keymap

### Flashing

**Automatic Flashing (Recommended):**

1. Start the auto-flash watcher:
   ```bash
   ./watch-and-flash.sh
   ```

2. Hold Key 7 (BACK_HOME) for 2 seconds to enter bootloader mode

3. Choose which firmware to flash:
   - **1** - apps (hardcoded app launchers - recommended)
   - **2** - via (VIA-compatible)
   - **3** - default (basic testing)
   - **Or wait 3 seconds** to flash the default (apps)

4. Firmware builds and flashes automatically
   - Device reboots with new firmware

**Changing the default keymap:**
Edit line 6 in `watch-and-flash.sh`:
```bash
DEFAULT_KEYMAP="apps"  # Change to "via" or "default" if preferred
```

**Manual Flashing:**

```bash
# Flash with automatic bootloader detection
./build.sh via flash

# Or flash manually
# 1. Hold BOOTSEL button while plugging in USB
# 2. Pico appears as RPI-RP2 drive
# 3. Drag handwired_four_pad_via.uf2 to the drive
# 4. Pico automatically reboots
```

### Pin Mapping

**Keys (7 total):**
| Row | Col 0 | Col 1 | Col 2 |
|-----|-------|-------|-------|
| 0   | GP0   | GP1   | GP2   |
| 1   | GP3   | GP4   | GP5   |
| 2   | GP20  | -     | -     |

**LCD1602 (I2C):**
- **SDA**: GP14
- **SCL**: GP15
- **VCC**: VBUS (5V)
- **GND**: GND
- **Address**: 0x27 (or 0x3F)
- **Display**: Shows current layer and key labels

## Hardware

- **MCU**: Raspberry Pi Pico (RP2040)
- **Switches**: MX-compatible (7 keys)
- **Layout**: 3×3 matrix with direct pin wiring (7 keys used)
- **Display**: LCD1602 (I2C) - shows current layer and key mappings
- **Layers**: Multiple layers for app-specific macros

## Apps Keymap (Recommended Setup)

The `apps` keymap provides a simple, hardcoded solution with automatic app launching and layer switching.

### How It Works:

**Layer 0** - App Selection:
- Key 1: Launch Chrome → Switch to Layer 1 (Chrome shortcuts)
- Key 2: Launch Figma → Switch to Layer 2 (Figma shortcuts)
- Key 3: Launch VS Code → Switch to Layer 3 (VS Code shortcuts)
- Key 4: Launch Slack → Switch to Layer 4 (Slack shortcuts)
- Key 5: Launch Spotify → Switch to Layer 5 (Spotify shortcuts)
- Key 6: Launch Terminal → Switch to Layer 6 (Terminal shortcuts)
- Key 7: BACK_HOME (hold 2s for bootloader)

**Layers 1-6** - App-specific shortcuts with Key 7 as BACK_HOME to return to Layer 0

### Customizing Apps:

Edit `~/qmk_firmware/keyboards/handwired/four_pad/keymaps/apps/keymap.c`:

1. **Change app names** (around line 170):
```c
case APP_VSCODE:
    launch_app("Visual Studio Code", 3);  // Change app name here
    return false;
```

2. **Change shortcuts** in the keymap arrays (lines 30-140)

3. **Rebuild**: `./build.sh apps flash`

No VIA configuration needed - everything is in the firmware!

## Layer System (VIA Keymap)

The VIA keymap uses a layer selection system designed for application-specific shortcuts:

### Layer 0 (App Selection Layer)
- **Purpose**: Select which application layer to switch to
- **Keys 1-6**: Press to switch to corresponding app layer
  - Example: Key 1 → TO(1) switches to Chrome layer
  - Example: Key 2 → TO(2) switches to Figma layer
- **Key 7**: Can be used for any function or left unassigned

### Layers 1-5 (Application Layers)
- **Purpose**: App-specific macro keys
- **Keys 1-6**: Programmable shortcuts/macros for the selected app
- **Key 7**: TO(0) - Returns to Layer 0 (app selection)

### Current Configuration
- **Layer 0**: App selection
- **Layer 1**: Chrome shortcuts
- **Layer 2**: Figma shortcuts
- **Layers 3-5**: Available for additional apps

### Configuring in VIA

#### App Launch with Auto Layer Switch (Recommended)

Create VIA macros that launch apps AND switch layers automatically:

**1. In VIA MACROS tab**, create macros with layer switching built-in:

**M0 - Chrome (switches to Layer 1):**
```
{KC_LGUI,KC_SPC}{500}{KC_C}{KC_H}{KC_R}{KC_O}{KC_M}{KC_E}{400}{KC_ENT}{QK_TO,1}
```

**M1 - Figma (switches to Layer 2):**
```
{KC_LGUI,KC_SPC}{500}{KC_F}{KC_I}{KC_G}{KC_M}{KC_A}{400}{KC_ENT}{QK_TO,2}
```

The `{QK_TO,1}` at the end switches to Layer 1 after launching the app!

**2. In VIA KEYMAP tab on Layer 0**, assign the macros:
- **Key 1**: Assign macro M0 (Chrome)
- **Key 2**: Assign macro M1 (Figma)
- **Key 3**: Assign macro M2 (your next app)
- **Key 7**: Use `Any` keycode `0x5DC0` for BACK_HOME

**3. On Layers 1-6**, set up your app-specific shortcuts:
- **Keys 1-6**: Your app shortcuts
- **Key 7**: Use `Any` keycode `0x5DC0` for BACK_HOME (returns to Layer 0)

#### BACK_HOME Key (Recommended for Key 7)

| Custom Keycode | Hex Code | Function |
|----------------|----------|----------|
| BACK_HOME | 0x5DC0 | Tap: Return to Layer 0<br>Hold 2s: Bootloader mode |

**How to assign in VIA:**
- Click on Key 7
- Go to "SPECIAL" tab → "Any"
- Enter `0x5DC0`

This gives you a consistent "home" button on all layers that also serves as your bootloader reset key.

### Customization

3. **Custom Layer Names**:
   - Edit `layer_names[]` in `firmware/four_pad.c` to customize LCD layer names
   - Current names: Layer 0 = "App Select", Layer 1 = "Chrome", Layer 2 = "Figma"
   - Set to `NULL` for layers not yet assigned (will display "Layer N" instead)

4. **Custom Macro Labels** (optional):
   - Edit `macro_labels[]` in `firmware/four_pad.c` to customize VIA macro display names
   - Example: M0 = "Figma", M1 = "Chrome"

## VIA Configuration

### Loading Custom VIA Definition

Since this is a custom keyboard, VIA needs a definition file to recognize it:

1. Open VIA or go to [usevia.app](https://usevia.app)
2. Go to **Settings** (gear icon) and enable **"Show Design tab"**
3. Go to the **Design** tab
4. Click **"Load"** and select `four_pad_via.json` from the project directory
5. Connect your macropad - VIA should now recognize it with proper macOS key labels

### Creating VIA Macros

VIA supports powerful macros for opening applications, typing text, and more:

**Example: Open Figma with one keypress**
```
{KC_LGUI,KC_SPC}{500}{KC_F}{KC_I}{KC_G}{KC_M}{KC_A}{400}{KC_ENT}
```
- Opens Spotlight (Cmd+Space)
- Waits 500ms for Spotlight to open
- Types "figma"
- Waits 400ms for search results
- Presses Enter to launch

**Macro Syntax:**
- Single key: `{KC_X}`
- Chord: `{KC_X,KC_Y}`
- Delay (ms): `{500}`
- Type text: Letters are automatically converted

**To add a macro in VIA:**
1. Go to the **MACROS** tab
2. Select a macro slot (M0, M1, etc.)
3. Paste your macro code
4. Go to **KEYMAP** tab and assign the macro to a key

### Quick Start Setup Guide

**After flashing firmware, follow these steps:**

1. **Load VIA definition** (see above)
2. **Create app launch macros** in MACROS tab (note the `{QK_TO,X}` at the end for layer switching):
   - M0: `{KC_LGUI,KC_SPC}{500}{KC_C}{KC_H}{KC_R}{KC_O}{KC_M}{KC_E}{400}{KC_ENT}{QK_TO,1}`
   - M1: `{KC_LGUI,KC_SPC}{500}{KC_F}{KC_I}{KC_G}{KC_M}{KC_A}{400}{KC_ENT}{QK_TO,2}`
3. **Configure Layer 0** in KEYMAP tab:
   - Key 1: Assign macro M0 (launches Chrome, switches to Layer 1)
   - Key 2: Assign macro M1 (launches Figma, switches to Layer 2)
   - Key 7: SPECIAL → Any → `0x5DC0` (BACK_HOME)
4. **Configure Layers 1 & 2**:
   - Add your app-specific shortcuts on Keys 1-6
   - Key 7: SPECIAL → Any → `0x5DC0` (BACK_HOME - returns to Layer 0)

### Understanding the LCD Display

**What you should see:**

- **When on Layer 0**: LCD shows **"App Select"** - this is correct!
- **After pressing Key 1** (APP_L1): LCD changes to **"Chrome"** - now on Layer 1
- **After pressing Key 2** (APP_L2): LCD changes to **"Figma"** - now on Layer 2
- **After pressing Key 7** (BACK_HOME): LCD changes back to **"App Select"** - back to Layer 0

**The layer names (Chrome, Figma) only appear when you switch TO those layers, not on the app selection layer.**

### Troubleshooting

**Q: I see "???" on the LCD when I press a key**  
A: The firmware doesn't recognize the keycode. Make sure you:
1. Flashed the latest firmware
2. Loaded the VIA definition (`four_pad_via.json`)
3. Are using standard VIA keycodes or the BACK_HOME custom keycode (`0x5DC0`)

**Q: I only see "App Select" on my LCD, not "Chrome" or "Figma"**  
A: This is correct! Layer 0 is your app selection layer. You'll see "Chrome" or "Figma" AFTER you press the corresponding button to switch to those layers.

**Q: Pressing macro keys doesn't change the layer**  
A: Make sure your VIA macros include the layer switch command at the end: `{QK_TO,1}` for Layer 1, `{QK_TO,2}` for Layer 2, etc.

**Q: The app doesn't launch when I press the macro**  
A: Check your macro syntax in VIA. Make sure it's formatted correctly:
- Use curly braces: `{KC_LGUI,KC_SPC}`
- Add delays: `{500}` for 500ms
- End with layer switch: `{QK_TO,1}`

**Q: The watch-and-flash script isn't working**  
A: Make sure you're holding the bootloader key (Key 7 with BACK_HOME `0x5DC0` assigned) for the full 2 seconds. The LCD should show "Hold for reset 2 seconds..." then "Resetting to bootloader...".

## Bootloader

**Enter bootloader mode:**
1. **Physical method**: Hold BOOTSEL button while plugging in USB
2. **BACK_HOME key (recommended)**: Hold Key 7 for 2 seconds
   - Normally tapping Key 7 returns you to Layer 0
   - Holding for 2 seconds enters bootloader mode
   - LCD displays "Hold for reset 2 seconds..." during the hold
   - Release before 2 seconds to cancel and return to Layer 0
   - After 2 seconds, LCD shows "Resetting to bootloader..." and device enters bootloader mode
3. **QK_BOOT keycode**: Assign `QK_BOOT` to any other key in VIA (works the same as BACK_HOME)

**Recommended setup:**
- Use `BACK_HOME` (0x5DC6) on Key 7 across all layers
- This gives you a consistent home/reset button
- The 2-second hold requirement prevents accidental firmware resets
