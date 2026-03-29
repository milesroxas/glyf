# SDKs

External SDKs are not vendored in the Glyf monorepo. Clone them separately:

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
