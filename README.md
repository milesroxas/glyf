# Embedded Product Family

RP2040-based input and display devices — firmware, companion apps, and R&D.

## Products

| Product | Type | Status |
|---------|------|--------|
| [macro-eleven](domains/macropads/macro-eleven/) | 11-key macropad + potentiometer | Production |
| [four-pad](domains/macropads/four-pad/) | 4-key prototype macropad | Prototype / Rev 1 |
| [glyf](domains/displays/glyf/) | 4.0" TFT display + touch | Production |

## Repository Structure

```
embedded/
├── apps/                       # Companion desktop apps (Tauri)
│   ├── glyf/                   # glyf companion app
│   └── macro-eleven/           # Macro Eleven companion app
│
├── domains/                    # Device hardware domains (firmware)
│   ├── displays/
│   │   └── glyf/               # ST7796S 480×320 + XPT2046 (Pico SDK)
│   └── macropads/
│       ├── macro-eleven/       # 11-key QMK macropad
│       └── four-pad/           # 4-key QMK prototype
│
├── shared/                     # Shared kernel (single source of truth)
│   └── libs/
│       ├── display-schema/     # @embedded/display-schema — glyf types
│       └── keymap-schema/      # @embedded/keymap-schema — macropad types
│
├── research/                   # Tracked R&D (experiments, prototypes)
├── sdks/                       # External SDKs (clone separately — see sdks/README.md)
└── docs/                       # Project documentation
```

## Quick Start

### Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| pnpm 10 | JS package manager | `npm i -g pnpm` |
| Rust (stable) | Tauri backends | [rustup.rs](https://rustup.rs) |
| Tauri CLI v2 | App dev/build | `cargo install tauri-cli --version ^2` |
| QMK CLI | Macropad firmware | `brew install qmk/qmk/qmk && qmk setup` |
| Pico SDK | glyf firmware | See [sdks/README.md](sdks/README.md) |
| picotool | Flash firmware | `brew install picotool` |

### Install JS dependencies (all workspaces)

```bash
pnpm install
```

### Run a companion app

```bash
pnpm dev:glyf           # glyf companion app
pnpm dev:macro-eleven   # Macro Eleven companion app
```

### Typecheck all apps

```bash
pnpm typecheck
```

---

## Firmware

### macropad (QMK)

```bash
cd domains/macropads/macro-eleven
./build.sh apps        # build
./build.sh apps flash  # build + flash
./watch-and-flash.sh   # interactive: detects bootloader, prompts keymap
```

```bash
cd domains/macropads/four-pad
./build.sh apps flash
```

### glyf (Pico SDK)

```bash
export PICO_SDK_PATH=/path/to/pico-sdk   # or set in ~/.zshrc

cd domains/displays/glyf
./build.sh         # build only
./build.sh flash   # build + flash
```

---

## Architecture

All apps follow **Feature-Sliced Design (FSD)** on the frontend and
**Domain-Driven Design (DDD)** at the repo level.

- **No multiple sources of truth** — shared types live in `shared/libs/` and are
  mirrored (not duplicated) in Rust via matching `serde` structs.
- **Bounded contexts** — each product in `domains/` and `apps/` is self-contained.
- **Single install** — `pnpm install` at the root installs everything via workspaces.

### USB Identifiers

| Product | VID | PID |
|---------|-----|-----|
| macro-eleven | `0x4653` | `0x0002` |
| glyf | `0x4653` | `0x0003` |

---

## R&D

See [`research/README.md`](research/README.md) for conventions on starting and
graduating experiments.

## CI

GitHub Actions runs on every push to `main` and every pull request:

- **TypeScript** — `tsc --noEmit` for all companion apps (matrix, parallel)
- **Rust** — `cargo check --workspace` across all Tauri backends
