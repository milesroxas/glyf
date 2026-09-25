# Keymap Designer: production plan (2026-09-25)

Scope: `apps/macro-eleven` (Tauri host + React UI) and `shared/libs/keymap-schema`. Companion to the audit in `docs/audit/2026-09-24-action-plan.md`; task IDs from that file are referenced as `ME-xx`, `UI-xx`, `X-xx`. This plan answers audit decision #4 ("which keymap-management commands should the Keymap Designer use?") in section 4.2.

Written to be executed task-by-task by an LLM coding agent. Each task lists files, the change, and acceptance criteria. Run the audit's global gate after every task.

## 0. Goal

A user configures every key on every layer inside the app. No JSON, no scripts, no editor, no restart. Every change applies to the device the moment it is made, and can be undone.

Non-goals for this plan: the plugin action type, the Windows runtime, editing the firmware's standalone keymap, and the rev 2 screen. Section 7 lists what this plan leaves ready for them.

## 1. Where the feature stands today

Evidence, by file:

- `src/pages/KeymapDesignerPage.tsx` lists `launch_app` bindings as cards. "Edit Actions" has no handler. "Map Plugin" is disabled. Nothing else on the page can change a key.
- The only way to change a key is Layer Viewer's "Edit Keymap JSON" (`features/layer-viewer/LayerViewer.tsx:42-59`), which copies the active file to `user-custom.json` and opens it in Cursor (`commands/keymap_commands.rs:105-171`). The user then edits JSON by hand and presses "Reload Keymap". This is the path the plan removes.
- The Rust side already has `get_active_keymap`, `save_user_keymap`, `list_available_keymaps`, `load_keymap_by_name`, `reset_to_default`, and `get_active_application`, but no TypeScript wrapper calls them (`shared/lib/tauri.ts`). Saving does not reload the engine; the engine only reloads through a separate `reload_keymap` command.
- `save_keymap` writes with `fs::write` (not atomic) and always to `user-custom.json`. Layers are a `HashMap`, so saved JSON reorders layers. Unknown fields are dropped on round-trip (ME-11).
- App launch matches by display name through `osascript` ("app name must match exactly, case-sensitive" in the troubleshooting doc). There is no list of installed apps, no icons, and no bundle IDs.
- Shortcut vocabulary lives only in Rust (`executor/runtime/shortcuts.rs`). The UI has no way to validate or render a shortcut. TypeScript lists `fn` as a modifier, which Rust rejects (ME-15).
- Layer Viewer and the overlay push host labels through a QMK keycode parser (`keycodeToLabel`), so labels like `Cmd+T` render wrong and empty keys read `---` (UI-04).
- The window is 800×600 with a 256 px sidebar. The remaining 544 px content width cannot hold a key grid and an editing panel side by side.
- Layer Viewer (read-only grid) and Keymap Designer (list of apps) are two views of the same data. Neither can edit.

## 2. Product decisions

These come from the Apple design principles (purpose, agency, familiarity, simplicity, feedback, craft) applied to what the code can do today.

1. **One surface.** Merge Layer Viewer into the Designer. The physical key grid is the canvas. Clicking a key edits it in an inspector beside the grid. The `/layers` route redirects to the designer. The overlay window stays as is.
2. **The grid is the thing you edit.** Controls sit next to what they change (grouping and mapping). No list of bindings detached from the physical layout.
3. **Press a key on the pad to select it.** The app already streams key state at 60 Hz. When the designer is open and the device is connected, a physical press selects that tile. This mirrors "press a key to record" in macOS Keyboard settings and removes the need to work out which tile is which.
4. **Inspector, not a modal.** A persistent right-hand pane with a segmented control for the action kind: App, Shortcut, Layer, Macro, None. Content cross-fades when the selection changes. Macro is the only kind that needs a taller editor and gets a scrollable list inside the same pane.
5. **App picker with real icons and bundle IDs.** A searchable list of installed apps, read from the system, with icons. Store `bundleId` alongside the display name so launches stop depending on exact name matches.
6. **Shortcut recorder.** A field that reads "Press keys" and captures the chord the user types, rendered as macOS glyphs (⌘⇧T). This is the pattern users already know from System Settings. Esc cancels, Backspace clears, and a sequence (⌘K then ⌘S) is built by adding a step.
7. **Autosave with undo.** No Save button. Every edit writes the profile atomically and hot-reloads the engine. ⌘Z / ⇧⌘Z undo and redo in memory. Destructive actions that are easy to undo (delete a layer, clear a key) show an "Undo" toast instead of a confirmation. Only "Restore default keymap" and "Delete profile" confirm first.
8. **Profiles instead of file priority.** Replace the implicit `user-custom.json` over `default.json` rule with named profiles the user can create, duplicate, rename, import, export, and switch between. The default keymap is bundled, never written to disk, and appears as a read-only "Default" profile that can be duplicated.
9. **Try it here.** Every action has a "Try" button that runs it from the app. Shortcuts and macros count down 3 seconds first so the user can focus the target app. Physical presses show a toast with the result (completion or error) while the designer is open.
10. **Permissions in place.** When the action kind is Shortcut or Macro and macOS Accessibility is not granted, the inspector shows a banner with a button that opens System Settings (ME-09). The banner disappears on its own when permission is granted.
11. **Works without the device.** The designer edits offline. A quiet header line says "Plug in Macro Eleven to select keys by pressing them". Nothing is disabled.
12. **Advanced stays one level deeper.** "Show profile in Finder" and "Export…" live under a menu. There is no "Edit JSON" button.

## 3. Interaction specification

Concrete values follow the Apple design skill. Default springs are critically damped (`bounce: 0`, `duration: 0.3`). Bounce is reserved for the one gesture that carries momentum (a dropped drag).

### 3.1 Layout

- Window: default 1000×680, minimum 900×600 (`tauri.conf.json`). Sidebar stays 256 px. Content pane is a two-column grid: canvas `minmax(360px, 1fr)` and inspector `340px`, gap 24 px. Below 900 px the inspector becomes a bottom sheet (see 3.6), which only matters if the user shrinks the window.
- Header (existing): profile name, then the layer tabs on the row below. Breadcrumb in the inspector title: "Figma › Key 5".
- Layer tabs: horizontal, scrollable, with a "+" at the end. The active tab is the only one with a filled background. Layer 0 is pinned first and cannot be deleted.

### 3.2 Key tile

- Size: 80×64 px, matching `MacropadGrid`. Content: icon (16 px, top-left), label (11 px, `letter-spacing: 0.01em`, `line-clamp: 2`), and a small kind glyph bottom-right for Layer and Macro kinds. Empty tiles show a dashed border and no text.
- Pointer-down: `transform: scale(0.97)` over 100 ms. Not on click.
- Selection: a 2 px ring in `--primary` that moves between tiles with a spring (`bounce: 0`, `duration: 0.3`), driven from the ring's current on-screen position so a fast second click redirects mid-flight. Implement as one absolutely positioned ring element animated with `motion`, not per-tile CSS.
- Device press: the tile takes the pressed style from `key-tester/KeyCell.tsx` for as long as the key is held. If "Select by pressing" is on (default on), the tile also becomes selected on the press edge.
- Keyboard: arrow keys move selection across the physical layout (skipping the empty cell), Enter focuses the inspector's first control, Delete or Backspace clears the key (with an Undo toast), ⌘1–⌘9 switch layer.
- Accessibility: each tile is a `button` with `aria-label` such as "Row 1, column 2: New Tab, shortcut Command T" and `aria-pressed` for selection.

### 3.3 Inspector

- Title row: key position and current label. Below it, a segmented control (App, Shortcut, Layer, Macro, None) using `Tabs` from `radix-ui`. Switching kind keeps the label field and clears kind-specific fields; the previous value is one ⌘Z away.
- Content change: cross-fade 150 ms opacity. No slide. The pane itself never moves.
- Fields: Label (text, max 16 characters, live count), then the kind editor, then "Try" and "Clear key".
- Validation is inline and immediate: an invalid shortcut token, an app that no longer exists on disk, or a `switch_layer` target that does not exist shows a warning line under the field. Warnings do not block saving. Errors that block saving do not exist in the designer because every control only produces valid values.

### 3.4 App picker

- Opens from the App editor as a popover anchored to the "Choose app" button (`transform-origin` at the trigger). Search field autofocused. Results are the installed apps, icon left, name, bundle ID in muted text. Recently used apps first.
- Rows are draggable onto tiles. Pointer Events with `setPointerCapture`. The ghost is the icon plus name, follows the pointer 1:1 from the grab offset, and the tile under the pointer highlights. Drop commits, Esc cancels. A drop outside the grid springs the ghost back to its row with `bounce: 0.2`, `duration: 0.4`, using the release velocity.
- "Other…" at the bottom opens the native file dialog filtered to `.app`.

### 3.5 Shortcut recorder

- A single control that looks like a text field. Empty state shows "Press keys". On focus it shows a subtle ring and the text "Recording…". While keys are down it renders the chord live as glyphs. It commits on keyup of the primary key and blurs. Esc cancels and restores the previous value. Backspace on an empty recorder clears the value.
- Sequences: a "+ Add step" button under the recorder adds a second chord (for `cmd k, cmd s`). Steps render as chips that can be removed.
- Conflict check: if the same chord is already assigned on the current layer, show a warning with the other key's position. Warning, not error.
- The recorder maps `KeyboardEvent.code` to the shared token table (section 4.1). Keys not in the table are ignored with a short shake (4 px, 2 cycles, 200 ms) and a warning line.

### 3.6 Motion, reduced motion, materials

- All designer motion uses `motion` springs so it can be interrupted. No CSS `@keyframes` on anything the user can re-target.
- `prefers-reduced-motion: reduce`: the selection ring and drag ghost jump, cross-fades stay, the shake becomes a color flash.
- `prefers-reduced-transparency: reduce`: the header and popovers drop `backdrop-filter` and use solid backgrounds.
- The bottom-sheet fallback (window narrower than 900 px) is a drag-to-dismiss sheet. Track 1:1 from grab offset, rubber-band past the top, project the release velocity, and decide open or closed by the velocity sign. Spring `bounce: 0.2`, `duration: 0.3`. Ship this last; it is not on the common path.

### 3.7 Feedback

Four kinds, each with one presentation:

| Kind | Where | Example |
| --- | --- | --- |
| Status | Header, right side, fades in and out | "Saved" with a check, 1.2 s |
| Completion | Toast, bottom-right, 4 s | "Sent ⌘T to Google Chrome" |
| Warning | Inline under the field | "Figma is not installed" |
| Error | Toast that stays until dismissed, with a Retry action | "Could not save profile: permission denied" |

Toasts use `sonner`. Physical key presses while the designer is open produce completion or error toasts from `macro11:action-executed` and `macro11:action-error`.

## 4. Architecture

### 4.1 Shared schema (`shared/libs/keymap-schema`)

- `types.ts`: add `icon?: string` to `BaseAction` (a Lucide icon name; ME-15.6). Add `bundleId?: string` to `LaunchAppAction`. Remove `fn` from `KeyModifier`; add `option`.
- New `tokens.json` in `src/`: the single list of modifier tokens, special-key tokens, their display glyphs, and their `KeyboardEvent.code` values. TypeScript imports it. Rust reads it with `include_str!` in a test that asserts `ModifierKey::from_token` and `PrimaryKey::from_token` accept every token in the file, so the two sides cannot drift.
- New `shortcut.ts`: `isValidShortcutKeys(keys)`, `formatShortcut(keys)` (returns glyph groups), `codeToToken(event)`.
- New `edit.ts`: pure, immutable operations the designer uses for every change: `setKeyAction`, `clearKey`, `setLabel`, `addLayer`, `renameLayer`, `deleteLayer` (returns the list of `switch_layer` actions that pointed at it), `duplicateLayer`, `setLayerTrigger`, `moveLayer`. Each returns a new `Keymap`. Unit-tested.
- `validation.ts`: rename `validateKeymap` to `assertKeymap` and extend it with matrix bounds, `u8` layer IDs, `switch_layer` targets that exist, shortcut token validity, and macro step shapes (ME-15.5).
- One default keymap file, `macro-eleven.default.json`, imported by TypeScript and included by Rust (ME-15.1). Delete `defaults.ts` and `src-tauri/src/config/default_keymap.json`.

### 4.2 Rust backend (`apps/macro-eleven/src-tauri`)

Storage (ME-11):

- Profiles live in `app.path().app_config_dir()/profiles/<name>.json`, plus `settings.json` holding `{ "activeProfile": "<name>" }`. Migrate `~/.config/macro-eleven/keymaps/user-custom.json` once to `profiles/My keymap.json` and mark it active.
- Atomic writes: write `<name>.json.tmp`, then rename.
- Profile names match `^[A-Za-z0-9 _-]{1,48}$`. Validate on every command that takes a name.
- `Keymap.layers` becomes `BTreeMap<u8, Layer>` (ME-06). Add `#[serde(flatten)] extra: serde_json::Map<String, Value>` to `Keymap`, `Layer`, and each `Action` variant so unknown fields survive a round-trip.
- The bundled default is never written to disk. `get_profile("Default")` returns the `include_str!` keymap with `readOnly: true`.

Commands (this answers audit decision #4; delete every keymap command not in this list, ME-12):

| Command | Purpose |
| --- | --- |
| `list_profiles() -> { active: string, profiles: [{ name, readOnly, updatedAt }] }` | Profile menu |
| `get_profile(name) -> Keymap` | Load for editing |
| `save_profile(name, keymap) -> ()` | Validate, write atomically, hot-reload the engine if active, emit `macro11:keymap-changed` |
| `create_profile(name, from?: string) -> ()` | New or duplicate |
| `rename_profile(from, to)`, `delete_profile(name)` | Menu actions |
| `set_active_profile(name) -> ()` | Switch; reloads the engine |
| `import_profile(path) -> string`, `export_profile(name, path) -> ()` | Native file dialogs via `tauri-plugin-dialog` |
| `reveal_profiles_dir() -> ()` | Opens the folder with `tauri-plugin-opener` (replaces `open_active_keymap_file`, ME-13) |
| `list_installed_apps() -> [{ name, bundleId, path, iconUrl }]` | App picker |
| `run_action(action) -> ()` | "Try" button; runs on the action worker |
| `get_permissions() -> { accessibility: bool }` | Banner (ME-09) |
| `open_accessibility_settings() -> ()` | Banner button |
| `get_engine_snapshot() -> { layer, hostControl, activeProfile }` | Hydration on mount (ME-07) |

Installed apps (macOS): scan `/Applications`, `/Applications/Utilities`, `~/Applications`, `/System/Applications`, and `/System/Library/CoreServices`. Read `CFBundleDisplayName` or `CFBundleName` and `CFBundleIdentifier` from `Info.plist` (`plist` crate). Icons: `NSWorkspace::sharedWorkspace().iconForFile(path)`, rendered to a 64 px PNG with `NSBitmapImageRep`, cached at `app_cache_dir()/icons/<bundleId>.png`. Return `iconUrl` as a `convertFileSrc` asset URL; add the cache dir to the asset protocol scope in `tauri.conf.json`. Cache the list in memory; rescan on `list_installed_apps(refresh: true)`.

Executor:

- `launch_app` prefers `open -b <bundleId>` and falls back to `open -a <name>`; drop `osascript` (ME-09.2). `focusIfRunning: false` adds `-g`.
- Actions run on one worker thread (ME-02). `run_action` and physical presses share it, so a "Try" never interleaves with a real press.
- Hot reload: `save_profile` for the active profile swaps the engine's keymap under its lock and resets `manual_override`.

### 4.3 Frontend (FSD)

```
src/features/keymap-designer/
  KeymapDesigner.tsx          layout: LayerTabs, KeyCanvas, Inspector, PermissionsBanner
  KeymapProvider.tsx          keymap, history, selection, autosave, device-press selection
  LayerTabs.tsx
  KeyCanvas.tsx               MacropadGrid + KeyTile + SelectionRing (drop target)
  KeyTile.tsx
  SelectionRing.tsx
  Inspector.tsx               kind segmented control + one editor
  editors/AppEditor.tsx
  editors/ShortcutEditor.tsx
  editors/LayerEditor.tsx
  editors/MacroEditor.tsx
  ShortcutRecorder.tsx
  AppPicker.tsx
  LayerSettings.tsx           rename, trigger app, delete
  ProfileMenu.tsx
  PermissionsBanner.tsx
  useUndoRedo.ts
  useAutosave.ts
  useDeviceKeySelection.ts
src/entities/keymap.ts        re-exports edit ops; Profile and InstalledApp types
src/entities/app.ts           InstalledApp
src/shared/ui/                dialog, popover, tabs, tooltip, dropdown-menu, kbd (shadcn), sonner Toaster
src/shared/lib/tauri.ts       typed wrappers for every command in 4.2
src/shared/config/layout.ts   MATRIX_LAYOUT and matrixToIndex (moved from entities, UI-01)
```

State model in `KeymapProvider`:

- `keymap: Keymap`, `profile: { name, readOnly }`, `selected: { layer, row, col } | null`, `history: { past: Keymap[], future: Keymap[] }`, `save: "idle" | "saving" | "saved" | { error }`.
- Every edit: `apply(op)` pushes the current keymap to `past`, sets the new keymap, clears `future`, and schedules a save. Saves debounce 300 ms trailing edge, so typing a label writes once.
- Editing the read-only Default profile prompts once: "Duplicate Default to make changes?" with a name field. One step, then editing continues.
- On `macro11:keymap-changed` from another window, reload only if the change did not originate here (compare a `revision` counter included in the event payload).

Routes and nav:

- `/` becomes the designer. Key Tester moves to `/diagnostics` and is renamed "Diagnostics" in the nav. `/layers` redirects to `/`. Nav order: Designer, Diagnostics, Knob, Firmware.
- The overlay reads labels and icons straight from the keymap via `get_profile(active)` and `macro11:keymap-changed`. Delete `get_layer_data`, `useLayerData`, `keycode-labels.ts`, and `entities/layer.ts` (UI-04).

New dependencies: `motion` (springs), `sonner` (toasts), `cmdk` (searchable list in the app picker), `@tauri-apps/plugin-dialog` + `tauri-plugin-dialog`, `plist` (Rust). `radix-ui` already covers Dialog, Popover, Tabs, Tooltip, and DropdownMenu.

## 5. Tasks

Order matters within a phase. Each task is one commit. Prefix commit messages with the task ID.

### Phase A: foundations

- [ ] **KD-01 Shared token table and shortcut helpers**
  - Files: `shared/libs/keymap-schema/src/{tokens.json,shortcut.ts,types.ts,index.ts}`, `src-tauri/src/executor/runtime/shortcuts.rs`.
  - Change: as in 4.1. Add the Rust parity test.
  - Accept: `pnpm test` covers `formatShortcut(["cmd","shift","t"])` → `⌘⇧T` and `codeToToken` for letters, digits, punctuation, arrows, and F-keys. `cargo test` parity test passes.

- [ ] **KD-02 Edit operations and stricter validation**
  - Files: `shared/libs/keymap-schema/src/{edit.ts,validation.ts,edit.test.ts,validation.test.ts}`.
  - Change: as in 4.1. `deleteLayer` returns dangling `switch_layer` references; `assertKeymap` rejects them.
  - Accept: every op has a test. `assertKeymap` rejects a `switch_layer` to a missing layer, a key at `3,0`, and a shortcut containing `fn`.

- [ ] **KD-03 One default keymap, schema fields**
  - Files: `shared/libs/keymap-schema/src/macro-eleven.default.json`, delete `defaults.ts` and `src-tauri/src/config/default_keymap.json`, `types.ts`, `config/keymap.rs`.
  - Change: ME-15.1 plus `icon` and `bundleId`. Add bundle IDs to the default's `launch_app` actions (`com.google.Chrome`, `com.figma.Desktop`, `com.microsoft.VSCode`, `com.tinyspeck.slackmacgap`, `com.spotify.client`, `com.apple.Terminal`, `com.apple.MobileSMS`, `com.apple.Notes`, `com.apple.Music`, `com.apple.finder`).
  - Accept: a Vitest test asserts the JSON passes `assertKeymap`; a Rust test deserializes it.

- [ ] **KD-04 Profile storage**
  - Files: `src-tauri/src/config/{storage.rs,profiles.rs,settings.rs}`, `src-tauri/src/lib.rs`.
  - Change: as in 4.2 storage. Migration runs in `setup`.
  - Accept: `tempfile` tests for atomic save, name validation, migration from the old directory, and round-trip of a keymap with an unknown field.

- [ ] **KD-05 Profile and engine commands**
  - Files: `src-tauri/src/commands/{profiles.rs,engine.rs}`, delete `commands/keymap_commands.rs` and `commands/layers.rs`, delete `src-tauri/src/keymap/`, `lib.rs`, `shared/lib/tauri.ts`, `entities/keymap.ts`.
  - Change: the command table in 4.2 except apps, permissions, and `run_action`. `save_profile` hot-reloads. Remove the `regex` dependency.
  - Accept: `cargo tree -p macro-eleven | grep regex` is empty. Saving the active profile changes what a physical press does without a restart (simulator or hardware, noted in the PR).

- [ ] **KD-06 Installed apps**
  - Files: `src-tauri/src/apps/{mod.rs,macos.rs,icons.rs}`, `commands/apps.rs`, `tauri.conf.json` (asset scope), `entities/app.ts`, `shared/lib/tauri.ts`.
  - Change: as in 4.2 installed apps. Non-macOS returns an empty list.
  - Accept: `list_installed_apps` returns Finder and Safari with non-empty `iconUrl` on macOS. Second call returns from cache in under 5 ms.

- [ ] **KD-07 Permissions and `run_action`**
  - Files: `src-tauri/src/executor/permissions.rs`, `commands/engine.rs`, `executor/runtime/macos.rs`.
  - Change: `AXIsProcessTrusted`, the settings deep link, `open -b`, and `run_action` on the worker (depends on ME-02; if ME-02 is not done yet, run `run_action` on a fresh thread and note the follow-up).
  - Accept: with Accessibility revoked, `run_action` for a shortcut returns an error naming the permission.

### Phase B: designer core

- [ ] **KD-08 Shared UI primitives**
  - Files: `src/shared/ui/{dialog,popover,tabs,tooltip,dropdown-menu,kbd,input,toaster}.tsx`, `components.json` aliases (UI-06), `src/shared/config/layout.ts` (UI-01), `App.tsx` (window and Toaster).
  - Change: add the shadcn components, fix aliases, move layout constants, mount `Toaster`. Set the window to 1000×680 with a 900×600 minimum.
  - Accept: `pnpm -s fallow:dead-code --boundary-violations` reports none for `shared/ui`.

- [ ] **KD-09 KeymapProvider with history and autosave**
  - Files: `features/keymap-designer/{KeymapProvider.tsx,useUndoRedo.ts,useAutosave.ts}`.
  - Change: the state model in 4.3. ⌘Z / ⇧⌘Z bound at the provider level, ignored while a text field has focus and the field has its own undo.
  - Accept: Vitest with a mocked `save_profile`: three edits produce one save after 300 ms; undo restores the previous keymap and triggers a save; editing Default prompts to duplicate.

- [ ] **KD-10 Canvas, tiles, selection ring, device-press selection**
  - Files: `features/keymap-designer/{KeymapDesigner.tsx,KeyCanvas.tsx,KeyTile.tsx,SelectionRing.tsx,useDeviceKeySelection.ts}`, `pages/KeymapDesignerPage.tsx`, `App.tsx` routes, `shared/ui/NavBar.tsx`.
  - Change: 3.1 and 3.2. Route changes from 4.3. Delete Layer Viewer files.
  - Accept: clicking a tile moves the ring with a spring; clicking another tile mid-flight redirects without a jump; a physical press selects the tile; arrow keys move selection; reduced motion makes the ring jump.

- [ ] **KD-11 Inspector with App, Shortcut, Layer, None editors**
  - Files: `features/keymap-designer/{Inspector.tsx,editors/*.tsx,ShortcutRecorder.tsx}`.
  - Change: 3.3 and 3.5 (single chord and sequence). The App editor uses a plain "Choose app" button that opens the picker from KD-12; until then it is a text field for the name.
  - Accept: recording ⌘⇧T saves `["cmd","shift","t"]`; Esc restores the old value; a conflict on the same layer shows a warning; switching kind keeps the label; "Try" on a shortcut counts down and sends it.

### Phase C: app picker

- [ ] **KD-12 App picker with icons, search, and recents**
  - Files: `features/keymap-designer/AppPicker.tsx`, `editors/AppEditor.tsx`.
  - Change: 3.4 without drag. Recents stored in `localStorage` (a per-user convenience only).
  - Accept: typing "chr" lists Google Chrome first; choosing it fills name, bundle ID, and sets the tile icon to the app icon; a missing app shows the inline warning.

- [ ] **KD-13 Drag an app onto a key**
  - Files: `AppPicker.tsx`, `KeyCanvas.tsx`, `KeyTile.tsx`, a `useDragToTile.ts` hook.
  - Change: 3.4 drag behavior with Pointer Events, capture, grab offset, hover highlight, Esc cancel, and the spring-back on a miss.
  - Accept: drag is 1:1 from the grab point; releasing over a tile assigns the app; releasing elsewhere springs the ghost back; Esc cancels mid-drag.

### Phase D: layers and profiles

- [ ] **KD-14 Layer tabs and layer settings**
  - Files: `LayerTabs.tsx`, `LayerSettings.tsx`, `editors/LayerEditor.tsx`.
  - Change: add, rename, duplicate, delete (Undo toast; warns about dangling `switch_layer` keys and clears them to None), reorder by drag, and the "Activate when this app is in front" picker that writes `triggerApp` as a bundle ID. Global "Follow the front app" switch bound to `settings.autoSwitchLayers`. Layer 0 pinned.
  - Accept: deleting a layer that another key switches to shows the count in the toast and undo restores both.

- [ ] **KD-15 Profile menu, import, export**
  - Files: `ProfileMenu.tsx`, `App.tsx` header, `tauri.conf.json` (dialog plugin), `capabilities/default.json`.
  - Change: list, switch, new, duplicate, rename, delete (confirm), Import…, Export…, "Show in Finder". The engine follows the active profile.
  - Accept: export then import produces an identical profile; switching profiles changes a physical press immediately.

### Phase E: macros

- [ ] **KD-16 Macro editor**
  - Files: `editors/MacroEditor.tsx`, `MacroStepRow.tsx`.
  - Change: an ordered list of steps: Shortcut (uses the recorder), Type text, Wait (ms, with a slider from 0 to 2000 and a number field), Key down, Key up. Add, remove, and reorder by drag. "Try" counts down 3 seconds. Held modifiers are released at the end of a macro (ME-05).
  - Accept: a macro `[shortcut ⌘K, wait 100, text "github.com", key enter]` saves in the shared shape and runs from "Try".

### Phase F: polish

- [ ] **KD-17 Feedback surfaces**
  - Files: `KeymapDesigner.tsx`, `PermissionsBanner.tsx`, `useActionToasts.ts`.
  - Change: 3.7. Status "Saved" in the header, completion and error toasts from engine events, the permissions banner, the offline hint.
  - Accept: revoke Accessibility and press a shortcut key: an error toast and the banner appear; grant it and the banner leaves within 2 seconds without a reload.

- [ ] **KD-18 Reduced motion, reduced transparency, keyboard coverage**
  - Files: `App.css`, every animated component.
  - Change: 3.6 media queries; audit that every control is reachable and operable by keyboard; `aria-label`s on tiles.
  - Accept: with "Reduce motion" on in macOS, no element translates; with "Reduce transparency" on, no `backdrop-filter` is applied; the whole designer can be driven without a mouse.

- [ ] **KD-19 Narrow-window sheet**
  - Files: `Inspector.tsx`, `InspectorSheet.tsx`.
  - Change: 3.6 bottom sheet under 900 px, with 1:1 tracking, rubber-banding, momentum projection, and velocity-sign commit.
  - Accept: a flick down closes the sheet even when released above the midpoint; a slow drag past the midpoint and back stays open.

- [ ] **KD-20 Docs and cleanup**
  - Files: `apps/macro-eleven/{CLAUDE.md,README.md}`, `domains/prototypes/macropads/macro-eleven/docs/HOST_SIDE_KEYMAP_SYSTEM.md`, root `README.md`, `IMPLEMENTATION_SUMMARY.md`.
  - Change: describe profiles, the designer, and the app data directory. Remove every instruction that tells a user to edit JSON. Delete `IMPLEMENTATION_SUMMARY.md` or move it under `docs/`.
  - Accept: `grep -ri "user-custom.json" --include=*.md .` returns nothing outside `docs/audit`.

### Phase G: tests

- [ ] **KD-21 Vitest project for macro-eleven** (T-03)
  - Files: `apps/macro-eleven/vitest.config.ts`, root `vitest.config.ts`.
  - Tests: `KeymapProvider` (history, debounce, read-only prompt), `ShortcutRecorder` (glyphs, Esc, conflicts), `useDeviceKeySelection`, `AppPicker` search ordering, keyboard navigation across the physical layout.
- [ ] **KD-22 Rust tests** (T-01)
  - `profiles.rs` (atomic write, migration, names), `apps/macos.rs` (plist parsing on a fixture bundle), token parity (KD-01), `run_action` on the worker.

## 6. Decisions

Recommendations are listed first. Proceed with them unless overruled.

1. **Store bundle IDs.** Keep `app` (display name) for labels and the overlay; add `bundleId` and launch by it. Name-only entries from old files keep working through the `open -a` fallback.
2. **Autosave with undo, no Save button.** The device is the source of truth for "did it work", and undo covers slips. A Save button would add a state (unsaved) the user has to track.
3. **Merge Layer Viewer into the designer.** Two views of one keymap, one of which cannot edit, is the kind of duplication the simplicity principle removes.
4. **Drag and drop for apps only in this plan.** Shortcuts and macros are authored in the inspector. Dragging a shortcut has no natural source object.
5. **Profiles in the app config directory.** `~/Library/Application Support/com.milesroxas.macro-eleven/profiles` on macOS, with one-time migration from `~/.config/macro-eleven/keymaps`.
6. **Window 1000×680, minimum 900×600.** The alternative, an icon-only nav rail, saves 200 px but makes four labeled destinations into four tooltips.

Open, needs an answer before Phase D:

- Should a profile be able to target a different device matrix (Four Pad)? The schema allows it; the designer would need a layout per device. Default: no, Macro Eleven only, and `assertKeymap` rejects other matrices.

## 7. Left ready for later

- **Plugin actions.** Hidden from the kind selector. A profile that already contains one renders the tile as read-only "Plugin (unavailable)" with its IDs in the inspector.
- **Rev 2 screen.** `icon` and a 16-character label cap are the tile contract the screen composer (SCR-05) needs. `list_installed_apps` icons are the source for app tiles on the screen.
- **Windows.** The picker and launch paths are behind `#[cfg(target_os)]`; the designer itself is platform-neutral.
- **Sharing.** Export produces a plain profile JSON that already matches the community keymap format in `HOST_SIDE_KEYMAP_SYSTEM.md`.
