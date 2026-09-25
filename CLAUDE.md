# Glyf monorepo

Repo map, prerequisites, and run commands: [README.md](README.md). Doc index: [docs/README.md](docs/README.md). Each app has its own `CLAUDE.md` with app-specific rules.

## Commands

```bash
pnpm install                    # all JS workspaces, one lockfile
pnpm typecheck                  # tsc --noEmit in each workspace with a typecheck script
pnpm lint                       # Biome check; pnpm lint:fix writes fixes
pnpm test                       # Vitest: shared libs + apps/glyf (jsdom and Playwright browser)
cargo test --workspace --locked # both Tauri crates
pnpm fallow:dead-code           # unused code/deps and FSD boundary violations
```

## Conventions

- **pnpm only.** No npm or yarn lockfiles.
- **One source of truth for shared types.** File and wire types live in `shared/libs/*`. Rust mirrors them with `serde` structs. Change both sides in the same commit.
- **Typed IPC.** The UI calls Tauri commands only through the typed wrappers in the app's `src/shared/lib/tauri.ts`.
- **Feature-Sliced Design** in both app frontends. Import only downward: `app → pages → features → entities → shared`.

  | Layer | Holds |
  |-------|-------|
  | `app/` | Shell, providers, routes, global CSS |
  | `pages/` | Route components, thin wrappers around features |
  | `features/` | Self-contained UI and logic |
  | `entities/` | Domain types and constants. No UI, no side effects. |
  | `shared/` | Reusable UI (`ui/`) and utilities (`lib/`). No business logic. |

- **Theme tokens.** Use the CSS custom properties in `src/app/App.css` (`var(--*)` or Tailwind theme classes). No raw colors.
- **Hooks own subscriptions, components render.** No state library; React context and hooks.
- **Commits.** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- `sdks/` holds external SDK clones (gitignored). Do not edit them.

## Docs

- `README.md` explains a directory to people. `CLAUDE.md` holds agent rules and code maps, and links to READMEs instead of copying them.
- State each fact once and link to it. Pinouts and wire protocols live in the device doc under `domains/`.
- Plans and audits live in `docs/plans/` and `docs/audit/` as `YYYY-MM-DD-<topic>.md`. Delete them when the work ships.
