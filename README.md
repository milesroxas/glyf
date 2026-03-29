# Glyf

Monorepo for **Glyf**—a modular product line of linked physical productivity devices (firmware, companion apps, shared schemas, and R&D).

**Vision:** devices compose into a system (e.g. a base module, a display + keys module, a knob / switches module for context). This repository is the engineering home for that line: shared types, apps, and module firmware live together so you can concept and ship without maintaining parallel copies of protocols or tooling.

See **[docs/product-line.md](docs/product-line.md)** for roadmap framing, R&D vs modules, and notes on **monorepo vs a separate lab repo**.

## Modules and R&D (current tree)

| Name | What it is | Status |
|------|------------|--------|
| [Display module](domains/glyf/display/) | 4.0" TFT + touch (RP2040, Pico SDK) — Glyf display hardware | Active module |
| [Glyf companion app](apps/glyf/) | Desktop app for the display module | Active |
| [Macro Eleven](domains/rnd/macropads/macro-eleven/) | 11-key QMK macropad + host keymap experiments | R&D / prototype |
| [Macro Eleven app](apps/macro-eleven/) | Tauri companion tied to Macro Eleven | R&D / prototype |
| [Four Pad](domains/rnd/macropads/four-pad/) | QMK macropad prototype | R&D / prototype |

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
│   └── rnd/
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
| picotool | Flash firmware | `brew install picotool` |

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
cd domains/rnd/macropads/macro-eleven
./build.sh apps        # build
./build.sh apps flash  # build + flash
./watch-and-flash.sh   # interactive: detects bootloader, prompts keymap
```

```bash
cd domains/rnd/macropads/four-pad
./build.sh apps flash
```

### Glyf display module (Pico SDK)

```bash
export PICO_SDK_PATH=/path/to/pico-sdk   # or set in ~/.zshrc

cd domains/glyf/display
./build.sh         # build only
./build.sh flash   # build + flash
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
- Macropad prototypes: [`domains/rnd/macropads/`](domains/rnd/macropads/) (see table above)

## CI

GitHub Actions on push/PR to `main`:

- **TypeScript** — `tsc --noEmit` for Glyf and Macro Eleven apps (matrix)
- **Rust** — `cargo check --workspace` for Tauri backends
