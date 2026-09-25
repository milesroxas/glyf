# Glyf product line

**Glyf** is a modular system of physical productivity devices that connect and link: shared protocols, companion software, and hardware that composes into one desk workflow instead of separate gadgets.

## Direction

Hardware is organized around modules you add over time:

- a **base** or hub module that other modules attach to or route through;
- a **display** module (keys + screen) for labels, navigation, and context;
- a **knob / control** module (rotaries, switches) for mode and parameter control.

Not all of these exist yet. Firmware and apps should move toward interchangeable modules and shared behavior, even while a board is a prototype.

## Product vs R&D

| Layer | Meaning |
|-------|---------|
| Product line | Glyf: the brand and the modular architecture |
| Modules | Devices maintained for real use, under `domains/glyf/` (today: the display module) |
| Macropad prototypes | Macro Eleven and Four Pad, under `domains/prototypes/macropads/`. QMK testbeds for layouts and host-side patterns (such as the keymap schema) that inform Glyf. Not long-term product names. |

Folder names (`macro-eleven`, `four-pad`) follow the QMK keyboard IDs.

## One repo, one source of truth

Shared contracts (TypeScript types, schemas, and their Rust mirrors) live in `shared/libs/`. Apps live in `apps/`. One clone, one `pnpm install`, and one CI pipeline cover everything that ships together.

**Decision: keep R&D in this repo.** A separate lab repo would give outsiders a cleaner story and a smaller clone. It would also mean two places to bump schemas, duplicated CI, and version skew, unless `shared/libs` is published as versioned packages.

Split only if legal, team size, or open-source packaging requires it. Then publish `shared/libs` as versioned npm packages or crates, and make the lab repo a consumer, not a fork. If clones get large first, use git sparse checkout.

Experiments and graduation rules: [research/README.md](../research/README.md).
