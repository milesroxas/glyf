# `domains/` — device firmware

Firmware is grouped by **role**: shipping **Glyf modules** vs **prototype** hardware.

| Path | Role |
|------|------|
| [`glyf/display/`](glyf/display/) | **Display module** — RP2040 firmware for the ST7796S + XPT2046 Glyf display board (Pico SDK). |
| [`prototypes/macropads/macro-eleven/`](prototypes/macropads/macro-eleven/) | **Prototype** — 11-key QMK macropad. |
| [`prototypes/macropads/four-pad/`](prototypes/macropads/four-pad/) | **Prototype** — earlier macropad (QMK). |

New **Glyf modules** go under **`domains/glyf/<module>/`**. New **experiments** that are not yet a named module use [`research/`](../research/README.md); macropad prototypes that already live in-tree stay under **`domains/prototypes/`**.

Do not import from `research/` into production module paths—see [`research/README.md`](../research/README.md).
