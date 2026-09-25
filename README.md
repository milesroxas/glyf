# Glyf

Monorepo for **Glyf**, a modular line of linked desk devices: module firmware, desktop companion apps, and the shared schemas between them. Vision, roadmap, and what counts as product vs R&D: [docs/product-line.md](docs/product-line.md). All docs: [docs/README.md](docs/README.md).

## Projects

| Project | Firmware | Companion app | Status |
|---------|----------|---------------|--------|
| Glyf display module: 4.0" TFT + touch | [domains/glyf/display](domains/glyf/display/) (Pico SDK) | [apps/glyf](apps/glyf/) | Active module |
| Macro Eleven: 11-key macropad + knob | [domains/prototypes/macropads/macro-eleven](domains/prototypes/macropads/macro-eleven/) (QMK) | [apps/macro-eleven](apps/macro-eleven/) | R&D |
| Four Pad: 7-key macropad + LCD | [domains/prototypes/macropads/four-pad](domains/prototypes/macropads/four-pad/) (QMK) | None | R&D, legacy |

Shared code:

| Path | What |
|------|------|
| [shared/libs/display-schema](shared/libs/display-schema/) | `@glyf/display-schema`: display config and state types |
| [shared/libs/keymap-schema](shared/libs/keymap-schema/) | `@glyf/keymap-schema`: macropad keymap format |
| `shared/libs/hotswap-sockets` | STL and Fusion 360 files for hot-swap switch sockets |
| `shared/libs/LiquidCrystal_I2C` | Vendored Arduino LCD library. No firmware uses it; Four Pad has its own `i2c_lcd.c`. |
| [research/](research/) | Tracked experiments that are not yet a module |
| [sdks/](sdks/) | External SDK clones (gitignored) |

Apps are Tauri v2 (Rust) with React 19 frontends in Feature-Sliced Design. Types shared between an app and its device live in `shared/libs/` and are mirrored in Rust.

## Prerequisites

| Tool | For | Install |
|------|-----|---------|
| Node 22 + pnpm 10 | JS workspaces | `corepack enable` (version from `packageManager`) |
| Rust stable | Tauri backends | [rustup.rs](https://rustup.rs) |
| Tauri CLI v2 | App dev and build | `cargo install tauri-cli --version ^2` |
| QMK CLI + `qmk_firmware` | Macropad firmware | `brew install qmk/qmk/qmk`, then [sdks/README.md](sdks/README.md) |
| Pico SDK + `arm-none-eabi-gcc` + CMake | Display firmware | [sdks/README.md](sdks/README.md) |
| OpenOCD + Debug Probe | SWD flashing (display) | `brew install open-ocd` |
| picotool | USB flashing (optional) | `brew install picotool` |

## Develop

```bash
pnpm install              # all workspaces
pnpm dev:glyf             # Glyf app
pnpm dev:macro-eleven     # Macro Eleven app
pnpm typecheck && pnpm lint && pnpm test
cargo test --workspace --locked
pnpm firmware             # interactive build / flash / launch for the display module
```

Firmware build and flash steps are in each firmware README.

## USB identifiers

| Device | VID | PID |
|--------|-----|-----|
| Four Pad | `0x4653` | `0x0001` |
| Macro Eleven | `0x4653` | `0x0002` |
| Glyf display module | `0x4653` | `0x0003` |

`0x4653` is not an allocated vendor ID. Get a real VID/PID before shipping hardware (audit FW-08).

## CI

GitHub Actions on push and pull request to `main` ([ci.yml](.github/workflows/ci.yml)):

- **Repository layout**: firmware folders and build scripts exist.
- **TypeScript & Vitest**: `pnpm typecheck`, then `pnpm test` (jsdom and Playwright Chromium).
- **Rust**: `cargo test --workspace --locked` on Ubuntu with Tauri system packages.

CI does not run `pnpm lint`, Clippy, or firmware builds yet (audit X-02).
