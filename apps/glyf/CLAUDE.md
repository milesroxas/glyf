# glyf Companion App

Desktop companion app for the glyf 4.0" ST7796S TFT display device (480×320,
XPT2046 touch).  Controls display brightness / power, visualises touch input,
and persists device settings, all via Raw HID.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Tauri v2 (Rust)
- **HID:** `hidapi` crate, Raw HID (32-byte reports, usage page `0xFF60`)
- **Routing:** react-router-dom

## Architecture & Standards

### Feature-Sliced Design (FSD)

Strict unidirectional imports — each layer may only import from layers below it:

```
src/
├── app/          # App shell, providers, global styles. Imports from all layers.
├── pages/        # Route-level components. Thin wrappers around features.
├── features/     # Self-contained UI + logic (display-preview, touch-monitor, settings).
├── entities/     # Domain types re-exported from @glyf/display-schema. No UI.
└── shared/       # Reusable UI components (ui/) and utilities (lib/). No business logic.
```

**Import direction:** `app → pages → features → entities → shared`. Never import upward.

### Domain-Driven Design

Entities model the hardware domain (single source of truth: `@glyf/display-schema`):
- `device.ts`  — connection status, device info
- `display.ts` — display config, state, orientation
- `touch.ts`   — touch point, calibration, events

### Principles

- **No multiple sources of truth** — all types live in `shared/libs/display-schema`.
  Rust structs in `src-tauri/src/config/display_config.rs` mirror them exactly.
- **Full type safety** — all Tauri commands have typed wrappers in `shared/lib/tauri.ts`.
  Rust structs derive `Serialize` / `Deserialize`. No `any`.
- **Separation of concerns** — hooks handle subscriptions (`useDisplayState`,
  `useTouchEvents`), components handle rendering.
- **Minimal dependencies** — React context + hooks, no external state library.

## Rust Backend Structure

```
src-tauri/src/
├── lib.rs              # Tauri setup, command registration, state management
├── main.rs             # Desktop entry point
├── commands/
│   ├── device.rs       # detect_device_cmd, connect_device, disconnect_device,
│   │                   # set_display_brightness, set_display_power
│   └── display.rs      # get_display_config, save_display_config, reset_display_config
├── hid/
│   ├── connection.rs   # HidConnection: background polling at ~60 Hz, auto-reconnect
│   └── protocol.rs     # 32-byte report format, build_* / parse_state_response
└── config/
    ├── display_config.rs  # GlyfConfig, DisplayConfig, TouchCalibration (mirrors schema)
    └── storage.rs         # JSON load/save → ~/.config/glyf/config.json
```

## Raw HID Protocol

Report size: 32 bytes, usage page `0xFF60`, VID `0x4653`, PID `0x0003`.

**Host → Device:**
- `[0x01]`       Poll state
- `[0x02, b]`    Set brightness (b = 0–255)
- `[0x03, p]`    Set power (p = 0 off / 1 on)
- `[0x04, h, l]` Fill display with RGB565 colour

**Device → Host (response to 0x01):**
- `[0]`   `0x01` echo
- `[1]`   brightness
- `[2]`   display_on
- `[3]`   touch_pressed
- `[4–5]` touch_x big-endian (0–479)
- `[6–7]` touch_y big-endian (0–319)
- `[8–9]` touch_z big-endian pressure (0–4095)

Tauri events emitted: `glyf:device-status`, `glyf:display-state`, `glyf:touch-event`.

## Hardware Reference

- **MCU:** RP2040 (Raspberry Pi Pico)
- **Display:** ST7796S 4.0" SPI TFT, 480×320 px, RGB565
- **Touch:** XPT2046 resistive, 12-bit ADC
- **USB:** VID `0x4653`, PID `0x0003`

### GPIO Pinout

| GPIO  | Signal    | Description                          |
|-------|-----------|--------------------------------------|
| GP10  | SPI1_SCK  | SPI clock (shared bus)               |
| GP11  | SPI1_MOSI | SPI MOSI (shared bus)                |
| GP12  | SPI1_MISO | SPI MISO (touch read-back)           |
| GP13  | TFT_CS    | Display chip-select (active LOW)     |
| GP14  | TFT_DC    | Display Data/Command                 |
| GP15  | TFT_RST   | Display hard reset (active LOW)      |
| GP16  | TFT_BL    | Backlight PWM (PWM0A)                |
| GP17  | TCH_CS    | Touch chip-select (active LOW)       |
| GP18  | TCH_IRQ   | Touch interrupt (active LOW)         |

See `domains/displays/glyf/docs/glyf.md` for the full firmware reference.

## Config Storage

```
~/.config/glyf/
└── config.json    # GlyfConfig (display settings + touch calibration)
```

## Commands

```bash
npm run tauri dev      # Launch in dev mode (frontend HMR + Rust rebuild)
npm run build          # Build frontend only
npx tsc --noEmit       # TypeScript typecheck
cd src-tauri && cargo build   # Rust build only
```

## UI Design

- **Theme:** dark, purple accent (oklch hue 270) to distinguish from macro-eleven's green
- **Window:** 900×640, sidebar nav + content area
- CSS custom properties in `app/App.css` — use `var(--*)` tokens, not raw colours

## Adding Features

- New pages: create in `pages/`, add route in `app/App.tsx`, add nav item in `shared/ui/NavBar.tsx`
- New Tauri commands: add to `commands/*.rs`, register in `lib.rs`, add typed wrapper in `shared/lib/tauri.ts`
- New types: add to `shared/libs/display-schema/src/types.ts` — mirror in Rust if serialised
- New HID message types: extend `hid/protocol.rs` and update firmware `hid_handler.c`
