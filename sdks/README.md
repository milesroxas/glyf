# SDKs

External SDKs are not vendored. Everything in this folder except this README is gitignored. Host tools (pnpm, Rust, QMK CLI, OpenOCD) are listed in the [root README](../README.md#prerequisites).

## QMK firmware (Macro Eleven, Four Pad)

```bash
qmk setup                  # clones qmk_firmware to ~/qmk_firmware and installs its dependencies
```

The macropad `build.sh` scripts use `QMK_DIR`, default `~/qmk_firmware`. To keep the clone here instead, clone it to `sdks/qmk_firmware` and set `QMK_DIR=$PWD/sdks/qmk_firmware`.

`build.sh` also adds `~/Library/Python/3.13/bin` to `PATH` for a pip-installed `qmk` (audit FW-09).

## Pico SDK (Glyf display module)

```bash
git clone https://github.com/raspberrypi/pico-sdk.git sdks/pico-sdk
git -C sdks/pico-sdk submodule update --init
```

`domains/glyf/display/build.sh` uses `PICO_SDK_PATH`, or `sdks/pico-sdk` when it is unset. It also needs CMake 3.13+ and `arm-none-eabi-gcc`.
