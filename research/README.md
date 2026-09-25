# Research

Tracked, shared experiments that extend the Glyf line but are not a module yet. Local throwaway work goes in `sandbox/` (gitignored).

## Where work goes

| Work | Location |
|------|----------|
| New hardware variant, MCU, display, protocol, or firmware approach | `research/<name>/` |
| Throwaway local experiment | `sandbox/` |
| Glyf module firmware | `domains/glyf/<module>/` |
| Companion app | `apps/<name>/` |
| Shared schema or library | `shared/libs/<name>/` |
| Existing macropad prototypes (QMK) | `domains/prototypes/macropads/` |

## Lifecycle

1. Create `research/<name>/` (kebab-case, descriptive: `esp32-port`, `lvgl-integration`).
2. Add a `README.md` with purpose, links to related code, and a status: `[exploring]`, `[promising]`, or `[graduating]`.
3. Graduate by moving the code to `domains/glyf/` or `apps/`. Then delete the research folder, or keep it with status `[archived]`.

## Rules

- Every research folder has a `README.md`.
- Research code must build. It does not need full tests or CI.
- `apps/` and `domains/glyf/` never import from `research/`. Research may depend on production code.
- Delete or archive stale experiments.
