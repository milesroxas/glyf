# Glyf product line

**Glyf** is the product line: a modular system of physical productivity devices designed to **connect and link**—shared protocols, companion software, and hardware that composes into a desk workflow rather than isolated gadgets.

## Direction

Hardware is organized around **modules** you can mix over time, for example:

- A **base** or hub module that other modules attach to or route through
- A **display** module (keys + screen) for labels, navigation, and context
- A **knob / control** module (rotaries, switches) for mode and parameter control

Not all of these exist as shipping SKUs yet; the list describes where the line is headed. Firmware and apps in this repo should move **toward** interchangeable modules and shared behavior, even when a given board is still a prototype.

## What is “production” vs R&D in this repo

| Layer | Meaning here |
|-------|----------------|
| **Product line** | Glyf—the brand and the modular architecture |
| **Modules** | Concrete devices (e.g. the current display board under `domains/glyf/display/`) whose firmware and host tools are maintained for real use |
| **Macropad prototypes** | **Macro Eleven** and **Four Pad** are **R&D**: QMK testbeds, layout experiments, and host-side patterns (e.g. keymap schema) that inform Glyf. They are not positioned as the long-term product names for the line |

R&D macropads live under `domains/rnd/macropads/`; shipping modules under `domains/glyf/`. Folder names (`macro-eleven`, `four-pad`) reflect tooling and QMK keyboard IDs; the README tables spell out R&D vs module roles.

## Single source of truth and low overhead

Shared contracts (types, schemas, Rust mirrors) live under **`shared/libs/`**. Companion apps live under **`apps/`**. That layout keeps **one clone**, **one `pnpm install`**, and **one CI pipeline** for everything that ships together.

## Separate repo for R&D?

**Usually no—until you have a clear pain.**

| Approach | Pros | Cons |
|----------|------|------|
| **Keep R&D in this monorepo** (current) | One source of truth for `shared/libs`, apps, and CI; fastest iteration; no version skew between “lab” and “product” | Repo looks busier; newcomers need the README hierarchy |
| **Separate `glyf-lab` (or similar) repo** | Cleaner story for outsiders; smaller default clone if you only publish product code | Two places to bump schemas, duplicate CI, submodule/subtree pain, or manual sync—**multiple sources of truth** unless you invest in packaging (`npm`/crates) or automation |

**Practical recommendation:** keep prototypes and experiments **here**, clearly labeled (see root `README.md` and `domains/README.md`). Split only if legal, team size, or open-source packaging **requires** isolation; then publish **`shared/libs`** as versioned packages and treat the lab repo as a **consumer**, not a fork of duplicated types.

**Git sparse checkout** is an option if clones get large: you can thin the working tree without splitting git history.

## Related

- Tracked experiments and graduation rules: [`research/README.md`](../research/README.md)
