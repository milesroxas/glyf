# Glyf documentation

Start at the [root README](../README.md) for the repo map, prerequisites, and dev commands.

## Product and planning

| Doc | Purpose |
|-----|---------|
| [product-line.md](product-line.md) | Vision, modules vs R&D, and why R&D stays in this repo |
| [audit/2026-09-24-action-plan.md](audit/2026-09-24-action-plan.md) | Codebase audit: task list for both apps, firmware, and tooling (IDs such as ME-02, SCR-03) |
| [plans/2026-09-25-keymap-designer.md](plans/2026-09-25-keymap-designer.md) | Keymap Designer: in-app keymap editing and profiles (KD-01 to KD-22) |

## Devices

| Device | Firmware and build | Hardware and protocol reference | Companion app |
|--------|--------------------|---------------------------------|---------------|
| Glyf display module | [README](../domains/glyf/display/README.md) | [glyf.md](../domains/glyf/display/docs/glyf.md) | [apps/glyf](../apps/glyf/README.md) |
| Macro Eleven | [README](../domains/prototypes/macropads/macro-eleven/README.md) | [macro-eleven.md](../domains/prototypes/macropads/macro-eleven/docs/macro-eleven.md), [rev 2 wiring guide](../domains/prototypes/macropads/macro-eleven/docs/rev2-wiring-guide.md) | [apps/macro-eleven](../apps/macro-eleven/README.md), [keymap engine](../apps/macro-eleven/docs/keymap-engine.md) |
| Four Pad | [README](../domains/prototypes/macropads/four-pad/README.md) | Same README | None |

## Shared and setup

| Doc | Purpose |
|-----|---------|
| [keymap-schema](../shared/libs/keymap-schema/README.md) | Keymap file format |
| [sdks/README.md](../sdks/README.md) | QMK and Pico SDK setup |
| [research/README.md](../research/README.md) | Where experiments go and how they graduate |
| [domains/README.md](../domains/README.md) | Firmware folder layout |

## Conventions

- Each directory with code has a `README.md` for people. Apps also have a `CLAUDE.md` for coding agents ([root CLAUDE.md](../CLAUDE.md)). It links to the README instead of repeating it.
- Each fact lives in one place. Pinouts and wire protocols live in the device reference under `domains/`. Other docs link to them.
- Plans and audits are dated (`YYYY-MM-DD-<topic>.md`). Delete them when the work ships.
