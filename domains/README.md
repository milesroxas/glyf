# `domains/`: device firmware

| Path | Role |
|------|------|
| [`glyf/display/`](glyf/display/) | Glyf display module: RP2040 firmware for the ST7796S + XPT2046 board (Pico SDK) |
| [`prototypes/macropads/macro-eleven/`](prototypes/macropads/macro-eleven/) | R&D prototype: 11-key QMK macropad |
| [`prototypes/macropads/four-pad/`](prototypes/macropads/four-pad/) | R&D prototype: earlier 7-key QMK macropad |

New Glyf modules go in `domains/glyf/<module>/`. Experiments that are not a module yet go in [`research/`](../research/README.md). Module code never imports from `research/`.
