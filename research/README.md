# Research & Development

This directory is for tracked experiments, prototypes, and exploratory work that
extends the product family. Unlike `sandbox/` (gitignored, local-only throwaway),
everything here is committed and collaborative.

## When to use `research/` vs somewhere else

| Work type                                    | Where it lives              |
|----------------------------------------------|-----------------------------|
| New hardware variant, MCU, or display        | `research/<name>/`          |
| Alternative firmware approach or protocol   | `research/<name>/`          |
| Throwaway / purely local experiment         | `sandbox/` *(gitignored)*   |
| Production-ready firmware for a device      | `domains/<type>/<name>/`    |
| Production-ready companion app              | `apps/<name>/`              |
| Shared type schema or library               | `shared/libs/<name>/`       |

## Lifecycle

```
research/<name>/   →   domains/ or apps/   →   shipped
   [exploring]           [graduating]           [production]
```

1. **Create** a subdirectory: `research/<name>/`
2. **Add** a `README.md` with status, purpose, and links to related production code
3. **Mark** status in the README header as one of:
   - `[exploring]` — early idea, may be abandoned
   - `[promising]` — worth continued investment
   - `[graduating]` — ready to move into `domains/` or `apps/`
4. **Graduate** by moving the relevant parts to their production home and deleting
   the research directory (or keeping it as a historical record with `[archived]` status)

## Naming

Use kebab-case and be descriptive:

```
research/
├── glyf-mini/              # Smaller display variant (e.g. 2.8" ST7789)
├── glyf-pro/               # Larger display, more I/O
├── gesture-recognition/    # Touch gesture experiments
├── esp32-port/             # ESP32-S3 MCU alternative
├── lvgl-integration/       # LVGL graphics library evaluation
└── wireless-hid/           # BLE HID instead of USB
```

## Rules

- Every research directory **must** have a `README.md`
- Research code is held to a lower bar than production — it does not need full
  test coverage or CI passing, but it should build
- Do not import from `research/` in `apps/` or `domains/` — research depends on
  production, never the other way around
- Delete or archive stale experiments rather than letting them rot
