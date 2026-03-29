# `domains/` — device firmware

Firmware is grouped by **role**: shipping **Glyf modules** vs **R&D** hardware.

| Path | Role |
|------|------|
| [`glyf/display/`](glyf/display/) | **Display module** — RP2040 firmware for the ST7796S + XPT2046 Glyf display board (Pico SDK). |
| [`rnd/macropads/macro-eleven/`](rnd/macropads/macro-eleven/) | **R&D** — 11-key QMK macropad prototype. |
| [`rnd/macropads/four-pad/`](rnd/macropads/four-pad/) | **R&D** — earlier macropad prototype (QMK). |

New **Glyf modules** go under **`domains/glyf/<module>/`**. New **experiments** that are not yet a named module use [`research/`](../research/README.md); macropad R&D that already lives in-tree stays under **`domains/rnd/`**.

Do not import from `research/` into production module paths—see [`research/README.md`](../research/README.md).
