# Glyf

Monorepo for **Glyf**—a modular product line of linked physical productivity devices (firmware, companion apps, shared schemas, and R&D).

**Vision:** devices compose into a system (e.g. a base module, a display + keys module, a knob / switches module for context). This repository is the engineering home for that line: shared types, apps, and module firmware live together so you can concept and ship without maintaining parallel copies of protocols or tooling.

See **[docs/product-line.md](docs/product-line.md)** for roadmap framing, R&D vs modules, and notes on **monorepo vs a separate lab repo**.

## Modules and R&D (current tree)

| Name | What it is | Status |
|------|------------|--------|
| [Display module](domains/glyf/display/) | 4.0" TFT + touch (RP2040, Pico SDK) — Glyf display hardware | Active module |
| [Glyf companion app](apps/glyf/) | Desktop app for the display module | Active |
| [Macro Eleven](domains/prototypes/macropads/macro-eleven/) | 11-key QMK macropad + host keymap experiments | R&D / prototype |
| [Macro Eleven app](apps/macro-eleven/) | Tauri companion tied to Macro Eleven | R&D / prototype |
| [Four Pad](domains/prototypes/macropads/four-pad/) | QMK macropad prototype | R&D / prototype |

**Macro Eleven** and **Four Pad** are intentionally kept for learning and R&D (layouts, QMK, companion patterns). They are **not** the public product definition of the Glyf line—the line is the **modular system** and the **display module** (and future modules) under Glyf.

## Repository structure

```
glyf/
├── apps/                       # Companion desktop apps (Tauri)
│   ├── glyf/                   # Glyf display module companion
│   └── macro-eleven/           # Macro Eleven (R&D) companion
│
├── domains/                    # Firmware (see domains/README.md)
│   ├── glyf/
│   │   └── display/            # Glyf display module (Pico SDK)
│   └── prototypes/
│       └── macropads/
│           ├── macro-eleven/   # R&D — QMK
│           └── four-pad/       # R&D — QMK
│
├── shared/                     # Shared contracts (single source of truth)
│   └── libs/
│       ├── display-schema/     # @glyf/display-schema — display types
│       └── keymap-schema/      # @glyf/keymap-schema — macropad / keymap types
│
├── research/                   # Tracked experiments (see research/README.md)
├── sdks/                       # External SDKs (clone separately — sdks/README.md)
└── docs/                       # Product line and doc index
```

## Quick start

### Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| pnpm 10 | JS package manager | `npm i -g pnpm` |
| Rust (stable) | Tauri backends | [rustup.rs](https://rustup.rs) |
| Tauri CLI v2 | App dev/build | `cargo install tauri-cli --version ^2` |
| QMK CLI | Macropad R&D firmware | `brew install qmk/qmk/qmk && qmk setup` |
| Pico SDK | Glyf display firmware | See [sdks/README.md](sdks/README.md) |
| picotool | Optional USB flashing path | `brew install picotool` |

### Install JS dependencies (all workspaces)

```bash
pnpm install
```

### Run a companion app

```bash
pnpm dev:glyf           # Glyf display companion
pnpm dev:macro-eleven   # Macro Eleven (R&D) companion
```

### Typecheck all apps

```bash
pnpm typecheck
```

---

## Firmware

### Macropads (QMK) — R&D

```bash
cd domains/prototypes/macropads/macro-eleven
./build.sh apps        # build
./build.sh apps flash  # build + flash
./watch-and-flash.sh   # interactive: detects bootloader, prompts keymap
```

```bash
cd domains/prototypes/macropads/four-pad
./build.sh apps flash
```

### Glyf display module (Pico SDK)

Rows follow **connector pin order** on the display (1 → 14).

| # | TFT pad | Connect to Pico |
|---|---------|-------------------|
| 1 | VCC | 3V3(OUT) |
| 2 | GND | GND |
| 3 | CS | GP13 |
| 4 | RESET | GP15 |
| 5 | DC/RS | GP14 |
| 6 | SDI (MOSI) | GP11 |
| 7 | SCK | GP10 |
| 8 | LED | GP16 |
| 9 | SDO (MISO) | GP12 |
| 10 | T_CLK | GP10 (same net as SCK) |
| 11 | T_CS | GP17 |
| 12 | T_DIN | GP11 (same net as SDI/MOSI) |
| 13 | T_DO | GP12 (same net as SDO/MISO) |
| 14 | T_IRQ | GP18 |

```bash
export PICO_SDK_PATH=/path/to/pico-sdk   # or set in ~/.zshrc

cd domains/glyf/display
./build.sh              # build only
./flash-uf2.sh          # explicit BOOTSEL / mounted RPI-RP2 path
./flash-picotool.sh     # explicit picotool path
```

Recommended workflow:

```bash
pnpm firmware                 # interactive TUI for build / flash / launch

pnpm firmware:build
pnpm firmware:flash:picotool   # preferred when your USB tool path is reliable
# or
pnpm firmware:flash:uf2        # explicit BOOTSEL recovery / bring-up path
pnpm dev:glyf
```

---

## Architecture

Apps use **Feature-Sliced Design (FSD)** on the frontend; the repo uses **bounded contexts** per app and domain.

- **Single source of truth** — shared types in `shared/libs/`, mirrored in Rust with matching `serde` structs where needed.
- **One install** — `pnpm install` at the root installs workspaces together.

### USB identifiers

| Device | VID | PID |
|--------|-----|-----|
| Macro Eleven (R&D) | `0x4653` | `0x0002` |
| Glyf display module | `0x4653` | `0x0003` |

---

## R&D

- Tracked experiments and graduation: [`research/README.md`](research/README.md)
- Macropad prototypes: [`domains/prototypes/macropads/`](domains/prototypes/macropads/) (see table above)

## CI

GitHub Actions on push/PR to `main`:

- **TypeScript** — `tsc --noEmit` for Glyf and Macro Eleven apps (matrix)
- **Rust** — `cargo check --workspace` for Tauri backends
