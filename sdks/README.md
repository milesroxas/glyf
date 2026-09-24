# SDKs

External SDKs are not vendored in the Glyf monorepo. Clone them separately:

## System Tooling

Install the host-side tools used by this repo:

```bash
brew install open-ocd   # preferred SWD flashing/debug path for glyf
brew install picotool   # optional RP2040 USB flashing path
brew install qmk/qmk/qmk
```

Then install:

- Rust via <https://rustup.rs>
- pnpm via `npm i -g pnpm`
- Tauri CLI via `cargo install tauri-cli --version ^2`

Recommended Glyf hardware tool:

- Raspberry Pi Debug Probe or another 3.3 V CMSIS-DAP probe for SWD flashing

## QMK Firmware (required for macropad projects)

```bash
git clone https://github.com/qmk/qmk_firmware.git ~/qmk_firmware
# Or clone to this folder:
# git clone https://github.com/qmk/qmk_firmware.git sdks/qmk_firmware
# Then: ln -sf $PWD/sdks/qmk_firmware ~/qmk_firmware
```

Then run `qmk setup` to install the QMK CLI.

## Pico SDK (for non-QMK projects)

```bash
git clone https://github.com/raspberrypi/pico-sdk.git sdks/pico-sdk
cd sdks/pico-sdk && git submodule update --init
export PICO_SDK_PATH=$(pwd)/sdks/pico-sdk
```

With the Pico SDK in place, the preferred daily Glyf workflow is:

```bash
pnpm firmware                 # interactive TUI for build / flash / launch
# or use explicit commands:
pnpm firmware:build
pnpm firmware:flash:swd
pnpm dev:glyf
```
