# Codebase Audit & Action Plan — 2026-09-24

Scope: `apps/macro-eleven` (Tauri host + React UI), `domains/prototypes/macropads/macro-eleven` (QMK firmware), `shared/libs/keymap-schema`, and repo tooling. Section B covers `apps/glyf`, `domains/glyf/display`, and `shared/libs/display-schema`.

This file is written to be executed task-by-task by an LLM coding agent (Claude). Each task is self-contained: files, evidence, exact change, acceptance criteria, and verification commands.

**Plan revision 2 (same day): rev 2 hardware adds a screen.** No screen hardware exists yet. Both products (Macro Eleven rev 2 and the Glyf display module) will use the same **ST7796S 480×320 SPI TFT** (the glyf display also has XPT2046 touch). Firmware stays in C (QMK for Macro Eleven, Pico SDK for Glyf). The user wants to see the screen in the Tauri apps **before** building hardware. This revision adds:

- **Phase 1 (LINK):** a shared Rust device-link crate with a hardware transport and a **simulator** transport. It also fixes the duplicated connection bugs in both apps once.
- **Phase 3 (SCR):** a portable C screen core. The same C code renders on the device and inside the Tauri app, so the in-app screen is pixel-identical to rev 2 hardware.
- Updated tasks where these phases absorb or change earlier work. Look for **→ Revised:** notes.

**Status on 2026-09-25.** Two commits landed after this audit: b8627c7 (Macro Eleven firmware updates: `0x03 GET_INFO`, `0x04 ENTER_BOOTLOADER`, PICOBOOT updater) and ee151ca (connect/disconnect removed; the poll thread starts at launch). Re-read the cited code before you start these tasks:

| Task | Status | What changed |
|------|--------|--------------|
| ME-01 | Moot | `stop()`, `connect_device`, and `disconnect_device` are gone. `start()` runs once from `setup` (`lib.rs`). Ticked. |
| H-00 | Partial | The files are tracked now. The CI `test -f domains/glyf/display/flash-swd.sh` check is still missing. |
| ME-07 | Partial | `get_device_status` + `useDeviceStatus` seed connection status on mount. Layer and host-control state are still not seeded. |
| FW-07 | Partial | HID bootloader entry exists once, in `macro_eleven.c`. The per-keymap `BACK_HOME` copies remain. |
| UI-02 | Partial | `button.tsx` and `card.tsx` are used by `FirmwareUpdatePanel.tsx`. The copied class strings remain elsewhere. |
| LINK-01, LINK-02 | Evidence stale | The spec and the v1 adapter must cover `0x03`/`0x04`. `DeviceLink` must keep the `suspend()` handoff the firmware updater uses. |
| LINK-03 | Evidence stale | Add `commands/firmware.rs`, `firmware/updater.rs`, and `examples/flash.rs` to Files. The manual Disconnect/Connect check no longer applies to macro-eleven. |
| ME-03, ME-04 | Evidence stale | Line numbers in `connection.rs` moved. A `GET_INFO` query now runs before test mode on each connect. The problems remain. |
| FW-03 | Evidence stale | `raw_hid_receive` is at keyboard level now. `default`/`via` answer `0x03`/`0x04` but not `0x01`. |
| X-01 | Evidence stale | macro-eleven `providers.tsx` and `StatusBadge.tsx` changed; re-run `pnpm -s fallow:dupes`. |
| X-03 | Partial | Docs reorganized on 2026-09-25. See the task. |

---

## 0. How to execute this plan

1. Work on a branch: `git switch -c audit/fixes`. The working tree had ~90 uncommitted files when this audit ran. **Before starting, ask the user to commit or stash that work.** Do not mix audit fixes into their WIP.
2. Execution order:
   1. Phase 0 (hygiene).
   2. Phase 1 (LINK). Most host P0s are fixed here, once, for both apps.
   3. Phase 2 (ME, macro-eleven host logic).
   4. Phase 3 (SCR, virtual screen).
   5. Phase 4 (FW, macro-eleven firmware).
   6. Phases 5–7 (tests, UI, tooling).
   7. Section B tasks not already absorbed by LINK/SCR.

   Inside a phase, order by task ID unless a task lists `Depends on`.
3. One task per commit. Commit message: Conventional Commits with the task ID, e.g. `fix(link): per-run stop token for device thread (LINK-02)`.
4. Read every file listed under **Files** in full before editing.
5. After each task run the **global gate** (below) plus the task's own **Verify** steps. Do not move on with a red gate.
6. Tick the task checkbox in this file in the same commit. When a task says "absorbed by X", tick it in the same commit as X.
7. Never touch `sdks/` (vendored pico-sdk). Never flash hardware.
8. **Hardware status.** Rev 1 Macro Eleven (no screen) may be available. No screen hardware exists for either product.
   - Screen work is verified against the **simulator** and **golden images** only.
   - Firmware tasks end at "compiles". Collect manual hardware checks in `docs/bring-up/rev2-screen.md` (SCR-10) instead of asking the user to run them now.
9. Tasks marked **[DECISION]** need a user answer first. Ask, then continue with other tasks.

### Global gate

```bash
pnpm typecheck
pnpm lint
pnpm test
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked          # includes glyf-core C tests + golden images once SCR lands
pnpm -s fallow:dead-code                 # must not grow vs. baseline below
pnpm -s screen:assets --check            # once SCR-02 lands: generated C assets are up to date
```

Firmware compile check (only if the toolchain exists locally):

```bash
bash domains/prototypes/macropads/macro-eleven/build.sh apps      # QMK, needs ~/qmk_firmware + qmk
bash domains/prototypes/macropads/macro-eleven/build.sh via
bash domains/glyf/display/build.sh                                # Pico SDK, needs arm-none-eabi-gcc
```

### Baseline at audit time

| Check | Result |
|---|---|
| `pnpm typecheck` | pass (apps only; shared libs have no `typecheck` script) |
| `pnpm lint` (Biome) | pass, 112 files |
| `pnpm test` (Vitest) | 12 tests pass; 0 tests for `apps/macro-eleven` |
| `cargo clippy` | clean (default lints) |
| `cargo test` | 8 pass: glyf 6 protocol tests; macro-eleven 2 (keymap.c parser, active-app smoke test) |
| `fallow` dead code | 52 issues: 2 unused files, 15 unused exports, 23 unused types, 4 unused deps, 4 unlisted deps, 4 boundary violations |
| `fallow` duplication | 8.4% (434 lines, 12 clone groups, almost all glyf ↔ macro-eleven copy-paste) |
| `fallow` health | 58.7 / C; 18 functions above complexity/CRAP thresholds |

fallow is installed as a pinned root devDependency, configured in `.fallowrc.json`:
- FSD boundary zones.
- Ignores for `sdks/`, firmware, and Tauri `gen/`.

Scripts: `pnpm fallow`, `fallow:dead-code`, `fallow:dupes`, `fallow:health`, `fallow:changed`, `fallow:fix-preview`. Before deleting any "unused" export, run `pnpm exec fallow dead-code --trace <file>:<export>`.

---

## 1. Architecture

### 1.1 Current (macro-eleven)

```
QMK firmware (RP2040)                     Tauri host (Rust)                          React UI
────────────────────                      ─────────────────                          ────────
raw_hid_receive()  <── 0x01 poll ────────  hid::connection poll thread (16 ms loop)
  replies 32 B state ─────────────────>     parse_state_response()
                                            ├─ emit macro11:key-event   (every poll) ──> useKeyEvents
                                            ├─ emit macro11:pot-value   (every poll) ──> usePotValue
                                            └─ KeymapEngine::process_key_state()
                                                 ├─ edge detect -> emit macro11:key-press (unused by UI)
                                                 ├─ execute_key_action() -> thread::spawn per press
                                                 │    └─ ActionExecutor -> MacRuntime (CGEvent / osascript)
                                                 └─ auto layer switch via NSWorkspace (every poll)
                   <── 0x02 test-mode ──────  set_test_mode command (from UI toggle)
```

The glyf app has a near-copy of the same connection code with the same bugs (Section B).

In code, "test mode" means **host control**: firmware suppresses all key output and the host synthesizes actions. The name is misleading; tasks below rename it to `host_control`.

### 1.2 Target: host

```
apps/macro-eleven/src-tauri ─┐
apps/glyf/src-tauri ─────────┴─> shared/crates/glyf-link
                                   ├─ Transport trait { write(&[u8; 32]), read(timeout) -> Option<[u8; 32]> }
                                   │    ├─ HidTransport   (hidapi)        real rev 1 / rev 2 hardware
                                   │    └─ SimTransport   (glyf-core FFI) no hardware: the firmware's own C logic, in-process
                                   ├─ DeviceLink: ONE I/O thread owns the transport; mpsc command channel; per-run stop
                                   │    token + JoinHandle; interruptible sleeps; reconnect; timeout counting; heartbeat;
                                   │    on_connected / on_stop hooks; snapshot(); emits typed events on change only
                                   ├─ codec: protocol v2 host side (+ temporary v1 adapters per device)
                                   └─ ScreenMirror: shadow glyf-core renders scene + live inputs -> RGBA frame for the UI
```

- **One owner per resource.** Only the DeviceLink thread touches the transport. Everything else sends commands over a channel. There is no `Arc<Mutex<Option<HidDevice>>>`.
- **No blocking I/O under a lock.** App engine state lives in one small struct behind one mutex, held only for reads and writes.
- **One action worker thread** (macro-eleven) executes actions in order. No `thread::spawn` per key press.
- **Firmware pushes edge events.** The host does a blocking read. The protocol is versioned (`HELLO`).
- **Firmware is safe without the host.** It boots in standalone mode. The host claims control and sends heartbeats; the firmware reverts on timeout.

### 1.3 Target: screen (rev 2, virtual-first)

```
shared/firmware/glyf-core/          C11 subset; no malloc, no float, no platform headers
├─ link/     protocol v2 device side: frame decode, dispatch, input events, heartbeat timeout
├─ scene/    chunked scene upload, CRC16, double buffer, scene diff -> dirty rects
├─ render/   band renderer: (layout, scene, live inputs, band rect) -> RGB565 pixels
├─ panel/    ST7796S init / window / orientation over a 5-function SPI HAL
├─ layouts/  macro_eleven_r2.c, glyf_display_r1.c  (const tables: rects, fonts, colors)
└─ assets/generated/   fonts (Inter, 4bpp), icons (Lucide, 4bpp), theme colors (RGB565)

compiled by:  QMK (Macro Eleven rev 2)  |  Pico SDK (Glyf display)  |  cc crate -> shared/crates/glyf-core-sys (host)
                                                                          ├─ SimTransport (simulated device)
                                                                          └─ ScreenMirror -> Tauri -> <VirtualScreen/>
```

**Rule: the app never draws the device screen itself.** It shows pixels produced by the same C code that will run on the device. Three modes, all using the same path:

| Connected to | What the Screen view shows |
|---|---|
| Simulator (no hardware) | ScreenMirror renders the scene. Virtual keys, knob, and touch feed inputs through SimTransport → C core → events, the same path as hardware. |
| Rev 1 Macro Eleven (`HELLO`: no screen) | Preview of what rev 2 would show, driven by the real keys and knob. |
| Rev 2 hardware (`HELLO`: screen) | The scene is uploaded to the device. The mirror shows the identical frame (same code, same scene, same inputs). |

Why this design:
- **Streaming pixels from the host is not feasible over raw HID.** Reports are 32 bytes at 1 ms, about 32 KB/s. One 480×320 RGB565 frame is 300 KB, about 10 s.
- **A separate TypeScript canvas renderer would drift** from the firmware renderer.
- **The host sends only semantic content** (layer name, labels, icons, app context, toasts). That is at most ~512 bytes, uploaded in ~20 packets (~20 ms at `bInterval = 1`).
- **The firmware renders live state from its own inputs:** pressed-key highlight, knob gauge, and touch feedback. There is no host round trip, and it keeps working in standalone mode.

Embedded constraints to design in from day one:
- RP2040 SRAM is 264 KB. A 480×320×2 framebuffer is 300 KB and does not fit. **Render in horizontal bands** (e.g. 480×20 px = 19.2 KB; two bands double-buffered for DMA = 38.4 KB).
- Cortex-M0+ has no FPU. Use **integer math only**, with precomputed tables for the knob ticks.
- A full redraw is 2.46 Mbit, ≈ 62 ms at the 40 MHz SPI in `pinout.h` (`TFT_SPI_BAUD`). **Redraw dirty rects only.** A key-press highlight must stay under 5 ms of SPI time.
- Glyf display and touch share SPI1 at different clocks (40 MHz / 2 MHz). Sample touch **between** bands, never during DMA.
- The host must not overrun the device: max scene size is advertised in `HELLO`, and upload is acknowledged at commit.

---

## 2. Phase 0 — Repo hygiene (low risk, do first)

- [ ] **H-00 [P1] Untracked files that tracked code depends on**
  - Evidence: several files are untracked:
    - `biome.json`, the root lint config used by `pnpm lint`.
    - `domains/glyf/display/flash-swd.sh`, referenced by root `package.json` script `firmware:flash:swd` and by `scripts/firmware.mjs:13`.
    - `apps/glyf/src/features/device-debug/` and `apps/glyf/src/pages/DebugPage.tsx`.

    A fresh clone gets default Biome rules and a broken `firmware:flash:swd` script.
  - Change: ask the user to include these in their WIP commit (they are user work, not audit changes). Add `test -f domains/glyf/display/flash-swd.sh` to the `repo-layout` CI job.

- [ ] **H-01 [P2] Untrack broken gitlink and pnpm store symlink**
  - Evidence: `git ls-files -s` shows two bad entries:
    - `.claude/worktrees/strange-bose` as mode `160000` (submodule gitlink) with no `.gitmodules`.
    - `.pnpm-store/v10/projects/...` as a tracked symlink (`120000`) to a path on the author's machine.
  - Change: `git rm --cached .claude/worktrees/strange-bose ".pnpm-store/v10/projects/aaea752381318b380fa234e71e74a29c"`. Add `.claude/worktrees/` and `.pnpm-store/` to root `.gitignore`.
  - Accept: `git ls-files .claude .pnpm-store` prints nothing.

- [ ] **H-02 [P2] Delete stale nested lockfiles in macro-eleven**
  - Files: `apps/macro-eleven/package-lock.json`, `apps/macro-eleven/pnpm-lock.yaml`, `apps/macro-eleven/src-tauri/Cargo.lock`.
  - Evidence: the repo is a pnpm workspace (root `pnpm-lock.yaml`) and a Cargo workspace (root `Cargo.lock`). These three files predate the monorepo move (dated 2026-03-28) and nothing reads them.
  - Change: `git rm` them. Add `apps/*/package-lock.json` and `apps/*/pnpm-lock.yaml` to `.gitignore`.
  - Accept: `pnpm install --frozen-lockfile` and `cargo test --workspace --locked` still pass.

- [ ] **H-03 [P2] Rename root package to stop `--filter glyf` matching two projects**
  - Evidence: root `package.json` and `apps/glyf/package.json` both have `"name": "glyf"`. `pnpm --filter glyf exec pwd` prints both the repo root and `apps/glyf`.
  - Change: root `"name": "glyf-monorepo"`. Grep for `--filter glyf` usages; they now select only the app.
  - Accept: `pnpm --filter glyf exec pwd` prints only `apps/glyf`.

- [ ] **H-04 [P3] Use pnpm in Tauri hooks**
  - Files: `apps/macro-eleven/src-tauri/tauri.conf.json:7,9` (and the same keys in `apps/glyf/src-tauri/tauri.conf.json`).
  - Change: `"beforeDevCommand": "pnpm dev"`, `"beforeBuildCommand": "pnpm build"`.

- [ ] **H-05 [P3] Fix unlisted and unused JS dependencies (from fallow)**
  - Unlisted in `apps/glyf`: `@testing-library/jest-dom`, `@testing-library/react`, `@testing-library/user-event`, `@vitest/browser-playwright`. They are only in root devDeps and resolve through hoisting.
    - Add them to `apps/glyf/package.json` `devDependencies` with the same exact versions as root.
    - Remove them from root if nothing else at root imports them.
  - Unused JS packages. Verify each with `pnpm exec fallow dead-code --trace-dependency <name>` and remove only those that trace as unused:
    - `class-variance-authority` and `radix-ui` in `apps/glyf`.
    - `@tauri-apps/plugin-opener` in both apps. The Rust plugin is used; the JS package is never imported.
  - Accept: `pnpm -s fallow:dead-code --unused-deps --unlisted-deps` reports 0.

- [ ] **H-06 [P3] Align `.editorconfig` with Biome**
  - Evidence: `.editorconfig` default `indent_size = 4`; Biome formats JS/TS/JSON with 2 spaces.
  - Change: add `[*.{js,mjs,cjs,ts,tsx,jsx,json,jsonc,html}]` → `indent_size = 2`. Keep CSS at 4 (Biome css `indentWidth: 4`) and C at 4.

---

## 3. Phase 1 — Shared device link + simulator (LINK)

New Cargo workspace members: `shared/crates/glyf-link`, `shared/crates/glyf-core-sys`. Add them to root `Cargo.toml` `[workspace] members`.

- [ ] **LINK-01 [P0] Write the shared protocol v2 + scene spec**
  - Files: new `docs/protocol/glyf-link-v2.md`. It replaces the per-device spec that FW-03 and GFW-06 would have written.
  - Content (write it as the normative spec; every offset gets a test in LINK-04):
    - **Transport.** Raw HID, usage page `0xFF60`, 32-byte reports. Host writes 33 bytes (report ID `0x00` + 32). Device endpoints `bInterval = 1`.
    - **Frame.** Byte `[0] = 0xA5` (magic; outside VIA's command range, so VIA can coexist). `[1] = cmd`. `[2] = seq` (host increments; device echoes in the reply). `[3] = payload length`. `[4..31]` = payload (28 bytes). A reply uses `cmd | 0x80`. An error reply uses `cmd = 0xFF` with payload `{failed_cmd, code}`.
    - **Commands:**

      | cmd | name | direction | payload |
      |---|---|---|---|
      | `0x00` | `HELLO` | host → dev | reply: `proto=2`, `fw_major/minor/patch`, `hw_id` (1 = Macro Eleven, 2 = Glyf display), `hw_rev`, `caps` u16 (bit0 keys, bit1 knob, bit2 screen, bit3 touch, bit4 backlight), `key_count`, `rows`, `cols`, `screen_w` u16, `screen_h` u16, `pixel_format` (1 = RGB565), `orientation`, `max_scene` u16 |
      | `0x01` | `GET_STATE` | host → dev | reply: same body as `EVENT_INPUT` |
      | `0x02` | `SET_HOST_CONTROL` | host → dev | `{enable}`; reply echoes state |
      | `0x03` | `HEARTBEAT` | host → dev | none; device drops host control after 1000 ms without any valid frame |
      | `0x10` | `EVENT_INPUT` | dev → host (unsolicited) | `event_seq`, `keys` u16 bitmask, `knob` u16 (filtered 0-1023), `touch_flags` (bit0 down, bit1 press-edge since last event), `touch_x` u16, `touch_y` u16, `fw_layer`, `host_control` |
      | `0x20` | `SCENE_BEGIN` | host → dev | `scene_seq` u8, `total_len` u16, `crc16` u16 (CRC-16/CCITT-FALSE over the body) |
      | `0x21` | `SCENE_CHUNK` | host → dev | `offset` u16 + ≤ 26 data bytes; no reply (throughput) |
      | `0x22` | `SCENE_COMMIT` | host → dev | `scene_seq`; reply `{status}` 0 = ok, 1 = crc, 2 = too big, 3 = gap, 4 = bad version |
      | `0x30` | `SET_BRIGHTNESS` | host → dev | `{level 0-255}` |
      | `0x31` | `SET_POWER` | host → dev | `{on}` |
      | `0x32` | `SET_ORIENTATION` | host → dev | `{0..3}` |
      | `0x7E` | `DEBUG_FILL` | host → dev | `{rgb565 u16}`; debug builds only |
      | `0x7F` | `REBOOT_BOOTLOADER` | host → dev | `{magic 0xB007}` |

    - **Endianness:** all multi-byte fields are little-endian.
    - **Scene body v1** (≤ `max_scene`, 512 on both devices):

      | Field | Encoding |
      |---|---|
      | `version` | u8, = 1 |
      | `flags` | u8: bit0 `host_control`, bit1 `connected` |
      | `layer_index` | u8 |
      | `title` | str ≤ 24 |
      | `context` | str ≤ 32 (active app) |
      | `tile_count` | u8, ≤ 16 |
      | tiles | `tile_count` × { `icon_id` u8 (0 = none), `accent` u8 (theme color index), `label` str ≤ 16 } |
      | `toast` | str ≤ 48, then `toast_kind` u8 (0 info, 1 success, 2 error), then `toast_ttl_ms` u16 |

      `str` is `u8 len` + UTF-8 bytes. The device renders code points outside the font as `?`. The host truncates with an ellipsis using `glyf_text_width` (same metrics as the device).
  - Accept: the spec exists, has the tables above, and states which task implements each side.

- [ ] **LINK-02 [P0] `glyf-link` crate: transport trait, HID transport, device thread**
  - Files: new `shared/crates/glyf-link/` (`Cargo.toml`, `src/{lib,transport,hid,link,codec/mod,codec/v1_macro_eleven,codec/v1_glyf,codec/v2,snapshot}.rs`).
  - Absorbs: **ME-01, ME-04, ME-10 (link part), ME-16, GL-01, GL-02 (I/O part), GL-04, GL-06, GL-T1.** Read their evidence below; this crate fixes all of them once.
  - Change:
    1. `pub trait Transport: Send { fn write(&mut self, frame: &[u8; 32]) -> io::Result<()>; fn read(&mut self, timeout: Duration) -> io::Result<Option<[u8; 32]>>; }`
    2. `HidTransport`: open by VID/PID/usage page. Use `hidapi` feature `macos-shared-device` (ME-16). Prepend the report ID on write. Require a full 32-byte read.
    3. `DeviceLink::start(profile_filter, transport_factory) -> DeviceLink`:
       - spawns one thread that owns the transport, with a per-run `Arc<AtomicBool>` stop token and a stored `JoinHandle`;
       - `stop()` signals and joins; `start()` stops any previous run first;
       - all sleeps go through `sleep_or_stop(&stop, dur)` in ≤ 50 ms slices.
    4. Commands reach the thread over `mpsc::Sender<LinkCommand>`. Replies come back through a oneshot channel (`std::sync::mpsc::sync_channel(1)`).
    5. After each write, read until a reply whose `cmd` and `seq` match arrives, or 100 ms passes. Dispatch unsolicited frames (`EVENT_INPUT`) instead of dropping them. Drain stale input before each request.
    6. Count consecutive timeouts; reconnect after 10. On connect, run `HELLO`; if there is no valid reply, report `compatible: false` with a reason and do not poll.
    7. Hooks: `on_connected(&mut LinkCtx)` (used for GL-07 settings replay and ME-03 claiming host control) and `on_stop(&mut LinkCtx)` (used for ME-03 releasing host control).
    8. Events go to the app through a callback `Fn(LinkEvent)` (the app bridges them to `tauri::Emitter`). Emit only on change: connection status, input bitmask/knob beyond a deadband, touch edges.
    9. No `.lock().unwrap()`: use `parking_lot::Mutex`. Wrap the thread body so a panic is caught, reported as `LinkEvent::Fault`, and the running flag is cleared.
    10. `snapshot() -> LinkSnapshot { status, profile, host_control, last_input }`, readable without blocking the I/O thread (e.g. `arc-swap` or a `parking_lot::RwLock` written only by the thread).
    11. **v1 adapters.** Until firmware speaks v2, `codec::v1_macro_eleven` (current `0x01` poll / `0x02` test mode, including draining the `0x02` ACK) and `codec::v1_glyf` (current `0x01`-`0x04`) translate to the same `LinkEvent`/`LinkCommand` types. The codec is chosen by PID when `HELLO` fails. Delete the v1 adapters once FW-03 and GFW-06 ship.
  - Accept: unit tests with a scripted `FakeTransport` cover:
    - start/stop ×2 rapidly → exactly one live thread (counter);
    - stale reply drained;
    - ACK consumed;
    - 10 timeouts → reconnect;
    - panic in the thread → `Fault` event and restartable;
    - `on_stop` writes release-host-control.

- [ ] **LINK-03 [P1] Migrate both apps onto `glyf-link`**
  - Files:
    - macro-eleven: `apps/macro-eleven/src-tauri/src/hid/{connection,protocol}.rs`, `commands/device.rs`, `lib.rs`.
    - glyf: `apps/glyf/src-tauri/src/hid/{connection,protocol}.rs`, `commands/device.rs`, `lib.rs`.
  - Change:
    - Delete both `connection.rs` files.
    - Manage `DeviceLink` as Tauri state (no outer `Mutex`).
    - Make every device command `#[tauri::command(async)]` so none runs on the main thread (GL-02).
    - Add `get_link_snapshot()` for UI hydration (absorbs ME-07 backend part and GL-12 backend part).
    - Keep app-specific logic in the apps: the macro-eleven keymap engine, and glyf display config.
  - Accept: both apps build; the existing glyf protocol tests move into `glyf-link` and pass. Manual (optional, rev 1 only): Disconnect/Connect 10× quickly → one `action-executed` per key press.

- [ ] **LINK-04 [P1] `glyf-core` C skeleton, `glyf-core-sys` crate, `SimTransport`, v2 codec**
  - Depends on: LINK-01, LINK-02.
  - Files: new `shared/firmware/glyf-core/{include/glyf_core.h, src/link.c, src/scene.c, src/crc16.c, CMakeLists.txt, README.md}`; new `shared/crates/glyf-core-sys/{Cargo.toml, build.rs, src/lib.rs}`; `glyf-link/src/{sim.rs, codec/v2.rs}`.
  - Change:
    1. C API (C11 without VLAs or `_Generic`, so it builds under QMK `gnu11`, Pico SDK C11, clang, and MSVC; `<stdint.h>`, `<stdbool.h>`, `<stddef.h>`, `<string.h>` only; no heap, no float):
       ```c
       typedef struct glyf_core glyf_core_t;               /* opaque; size exported as GLYF_CORE_SIZE */
       void   glyf_core_init(glyf_core_t *c, const glyf_device_info_t *info, const glyf_layout_t *layout);
       size_t glyf_link_handle(glyf_core_t *c, const uint8_t in[32], uint8_t out[32]);  /* returns reply len, 0 = none */
       bool   glyf_link_next_event(glyf_core_t *c, uint8_t out[32]);                     /* unsolicited EVENT_INPUT */
       void   glyf_core_set_inputs(glyf_core_t *c, uint16_t keys, uint16_t knob, const glyf_touch_t *t);
       void   glyf_core_tick(glyf_core_t *c, uint32_t now_ms);                           /* heartbeat timeout, toast ttl */
       bool   glyf_core_host_control(const glyf_core_t *c);
       ```
    2. `glyf-core-sys/build.rs` compiles the C sources with the `cc` crate (`.std("c11")`, `.warnings_into_errors(true)`, plus `-Wall -Wextra -Wdouble-promotion` when the compiler is GCC/Clang), with `cargo:rerun-if-changed` on the C tree. `src/lib.rs` holds hand-written `extern "C"` declarations (no `bindgen`, so no libclang in CI) and safe wrappers.
    3. `SimTransport` implements `Transport` on top of an owned `glyf_core_t`. Host writes go into `glyf_link_handle`; reads return replies or `glyf_link_next_event` output. Virtual inputs arrive through `SimTransport::set_inputs`.
    4. `codec::v2` is the host side of LINK-01.
  - Accept: loopback tests (`glyf-link` codec ↔ C core via `SimTransport`) for every command in the LINK-01 table, scene upload (ok, CRC error, gap, too big), heartbeat timeout dropping host control, and seq echo.

- [ ] **LINK-05 [P1] Simulator connection mode in both apps**
  - Depends on: LINK-03, LINK-04.
  - Files: both apps' `commands/device.rs`, `lib.rs`, `src/app/providers.tsx`, `src/shared/lib/tauri.ts`; new `shared/libs/link-schema` (`@glyf/link-schema`: TS types for `LinkSnapshot`, `DeviceProfile`, `SimInput`, `ScreenFrameMeta`).
  - Change:
    - Add a device source picker in the header: `Hardware (auto)`, `Simulated Macro Eleven rev 1`, `Simulated Macro Eleven rev 2`, `Simulated Glyf Display`.
    - Commands: `set_device_source(source)` and `sim_input({keys?, knob?, touch?})`.
    - Persist the choice in app config.
    - The status badge shows `Simulated` distinctly from `Connected`.
    - **[DECISION]** ship simulator mode in production builds (recommended: yes, as "Demo mode") or gate it on `import.meta.env.DEV`.
  - Accept: with no hardware plugged in, choosing a simulated device shows Connected (simulated). Clicking virtual keys (SCR-08) runs host actions in macro-eleven exactly as hardware keys do.

---

## 4. Phase 2 — macro-eleven host logic (ME)

Crate: `apps/macro-eleven/src-tauri` (package `macro-eleven`, lib `macro_eleven_lib`).

- [x] **ME-01 [P0] Duplicate HID poll threads after disconnect → connect** → **Moot since ee151ca:** the app has no disconnect/connect path, and `start()` runs once at launch.
  - Evidence (kept for context):
    - `stop()` (connection.rs:66) only stores `running=false`. The poll thread may be inside `thread::sleep(RECONNECT_INTERVAL)` (2 s, lines 102/118/130/234).
    - A Connect inside that window finds `is_running()` false, so `start()` (line 51) spawns a second thread. The old thread wakes, sees the shared `running` flag true, and keeps looping.
    - Result: two engines, and every key press executes twice. The macOS exclusive open makes the second thread emit `connected:false` every 2 s.
    - The exiting thread also clears the new engine (line 238).

- [ ] **ME-02 [P0] Action execution holds `current_layer` lock across blocking I/O and stalls HID polling**
  - Files: `src/hid/keymap_engine.rs`, `src/executor/actions.rs`.
  - Evidence:
    - `execute_key_action` (keymap_engine.rs:121-128) spawns a thread that locks `current_layer` and holds it for the whole `executor.execute(...)`. That call runs `osascript` (hundreds of ms), CGEvent posting with 35 ms sleeps, and macro `Wait { ms }` steps.
    - The poll thread locks the same mutex at the start of every `process_key_state` (line 43), so polling freezes until the action finishes.
    - The firmware reports **level state**, not edges, so any press and release inside the freeze is lost.
    - A new OS thread per key press lets two quick presses run out of order or interleave keystrokes.
  - Change:
    1. Replace the three `Arc<Mutex<..>>` fields with one `Mutex<EngineState { current_layer: u8, manual_override: Option<u8>, last_keys: u16, last_active_app: Option<String> }>`.
    2. Split actions into two kinds:
       - **State actions** (`SwitchLayer`, `CycleLayer`) run inline under the lock (pure, microseconds).
       - **I/O actions** (`LaunchApp`, `Shortcut`, `Macro`, `Plugin`) go to a single long-lived worker thread via `std::sync::mpsc::Sender<Job>`. The worker runs jobs in order and emits `macro11:action-executed` / `macro11:action-error`.
    3. `ActionExecutor::execute` must not take `&mut u8`; move layer math into the engine (see ME-06).
    4. Never call `get_active_app()` or any ObjC/`Command` while holding the engine lock.
    5. The engine consumes `LinkEvent::Input` from `glyf-link` (edges come from the key bitmask diff; after FW-05 the firmware pushes them).
  - Accept: a unit test with a fake `PlatformRuntime` whose `send_shortcut` sleeps 500 ms shows input handling returns in < 5 ms while the job runs. Two queued jobs execute in FIFO order.

- [ ] **ME-03 [P0] Host never hands control back to firmware; macropad is dead without the app**
  - Files: `src/lib.rs`, `src/commands/device.rs`, the `glyf-link` hooks from LINK-02. Firmware side: FW-01.
  - Evidence:
    - `desired_test_mode` defaults to `true` (connection.rs:33) and is sent on every connect (line 137).
    - Nothing sends `enable=false` on `disconnect_device`, on app quit, or on crash.
    - Firmware `test_mode_active` also defaults to `true` (apps/keymap.c:210). `process_record_user` returns `false` for every key while it is set (line 232).
    - So with no companion app running, the device emits no keystrokes at all, even after re-plugging.
  - Change:
    1. Claim host control in `on_connected` and release it in `on_stop` (LINK-02 hooks).
    2. In `lib.rs`, switch from `.run(generate_context!())` to `.build(generate_context!())?.run(|app, event| { if let RunEvent::Exit = event { /* DeviceLink::stop() releases control */ } })`.
    3. Rename `test_mode` → `host_control` across Rust, TS event payloads (`macro11:test-mode` → `macro11:host-control`), and UI copy.
  - Accept: `FakeTransport` test records the release frame on stop. Simulator check: quit the app while a simulated rev 1 device is connected, and the sim core reports `host_control=false`. Rev 1 hardware check goes to the bring-up doc.

- [ ] **ME-04 [P1] Response framing: test-mode ACK desynchronizes the poll loop by one report** → **Revised: absorbed by LINK-02** (v1 adapter drains the ACK; v2 matches `cmd`+`seq`). Tick with LINK-02.
  - Evidence (kept): firmware ACKs `0x02` (`apps/keymap.c:355-359`). The host never reads the ACK and reads one report per poll (connection.rs:180), so every later read returns the previous frame. `set_test_mode` can also write between the poll thread's write and read.

- [ ] **ME-05 [P1] Macro `keydown`/`keyup` for normal keys press the key twice; held modifiers are ignored**
  - Files: `src/executor/actions.rs:66-81`, `src/executor/runtime/mod.rs`, `src/executor/runtime/macos.rs`, `noop.rs`, `windows.rs`.
  - Evidence:
    - For a non-modifier key, both `KeyDown` and `KeyUp` call `runtime.key_press` (down+up), so `keydown a` + `keyup a` types "aa".
    - `modifier_down` posts a key event, but `key_press` (macos.rs:363-373) creates the next event with `set_flags(empty)` (or only Shift). That overrides the held modifier, so `keydown cmd` + `keypress c` sends plain `c`.
  - Change:
    1. Add `key_down(&PrimaryKey)` and `key_up(&PrimaryKey)` to `PlatformRuntime`; map `MacroStep::KeyDown/KeyUp` to them.
    2. In `MacRuntime`, keep `held: Mutex<CGEventFlags>`. `modifier_down` ORs the flag in, `modifier_up` removes it, and every posted key event uses `held | chord_flags | shift_if_needed`.
    3. At the end of `handle_macro` (success **or** error), release any modifiers still held so a failed macro cannot leave Cmd stuck.
  - Accept: unit tests with a recording fake runtime:
    - `[keydown cmd, keypress c, keyup cmd]` produces `modifier_down(Cmd), key_press(c), modifier_up(Cmd)`.
    - `[keydown a, keyup a]` produces `key_down(a), key_up(a)`.
    - A macro that errors mid-way still emits `modifier_up` for held modifiers.

- [ ] **ME-06 [P1] Layer model breaks with non-contiguous layer IDs; manual override never clears**
  - Files: `src/executor/actions.rs:29-36`, `src/config/keymap.rs:189-217`, `src/hid/keymap_engine.rs`.
  - Evidence:
    - `CycleLayer` uses `(current + 1) % layers.len()` and `SwitchLayer` clamps to `len - 1`. With layers `{0, 1, 5}`, `switch_layer 5` lands on layer 2, which does not exist. Every key then logs "No action", and the user is stuck because manual override blocks auto-switch.
    - `current + 1` on `u8 = 255` panics in debug builds.
    - `manual_override` is cleared only by `LaunchApp` (keymap_engine.rs:135-138). After pressing "Back" once, per-app auto-switching stays off until an app is launched from the pad.
    - `determine_layer` iterates a `HashMap`, so when two layers share a `triggerApp` the winner is random.
  - Change:
    1. Change `Keymap.layers` to `BTreeMap<u8, Layer>` (also fixes random key order when saving JSON).
    2. Cycle = next key in sorted order after the current one, wrapping. Switch = only if the target layer exists, else return `Err("Layer N does not exist")`.
    3. Clear `manual_override` when the frontmost app changes (compare with `EngineState.last_active_app`).
    4. `determine_layer` picks the lowest layer ID whose `triggerApp` matches.
  - Accept: unit tests for cycle over `{0,1,5}`, switch to a missing layer errors, override cleared on app change, and deterministic trigger match.

- [ ] **ME-07 [P1] UI never learns current state after reload or when the overlay opens** → **Revised: backend via LINK-03 `get_link_snapshot`; this task is the frontend + engine fields.**
  - Files: `src/shared/lib/tauri.ts`, `src/app/providers.tsx:31-42`, `src/features/overlay/OverlayView.tsx:65-74`, `src/shared/lib/useKeyEvents.ts:11-16`; Rust `commands/device.rs`.
  - Evidence: `device-status` is emitted only on transitions. A window reload (HMR), or an overlay opened after connecting, starts at `"disconnected"` and stays there while the device is connected. Host-control state starts at `true` in the UI regardless of backend state.
  - Change: add `get_engine_snapshot() -> { layer, host_control, source }` next to `get_link_snapshot()`. Hooks call both on mount, then apply events.
  - Accept: open the overlay after connecting (simulated device is fine) → it shows "Connected" and the current layer immediately.

- [ ] **ME-08 [P1] 60 Hz event flood to every webview** → **Revised: the backend part is absorbed by LINK-02 (emit on change).** Remaining: frontend.
  - Files: `src/shared/lib/useKeyEvents.ts`, `src/shared/lib/usePotValue.ts`.
  - Change: bail out of `setState` when the payload equals current state.
  - Accept: with the pad idle, zero events per second in the devtools event log.

- [ ] **ME-09 [P1] macOS permissions and automation**
  - Files: `src/executor/runtime/macos.rs`, `src/executor/app_detector.rs`, `src/hid/keymap_engine.rs`.
  - Evidence:
    - `CGEvent::post` needs Accessibility permission. Without it, macOS drops events silently and the app still emits `action-executed`.
    - `launch_app` uses `osascript` `tell application ... to activate` (macos.rs:336-343). That needs Apple Events automation permission and, in a signed/notarized build, the `com.apple.security.automation.apple-events` entitlement plus `NSAppleEventsUsageDescription`.
    - `get_active_app()` (NSWorkspace, ObjC) runs on the HID thread at 60 Hz with no autorelease pool.
    - Keycode tables assume a US ANSI layout. `type_text` fails part-way on any non-ASCII character, after typing the prefix.
  - Change:
    1. Add an `accessibility_trusted()` check (`#[link(name = "ApplicationServices", kind = "framework")] extern "C" { fn AXIsProcessTrusted() -> bool; }`).
       - Expose a `get_permissions()` command.
       - The UI shows a banner with a button that opens System Settings (`x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility`).
       - Shortcut/macro execution returns an error when not trusted.
    2. Replace the osascript launch with `open -a <name>` (focus) / `open -g -a <name>` (launch without focus). No Apple Events permission is needed.
    3. Wrap `get_active_app` in `objc2::rc::autoreleasepool`, run it on the action worker or a 250 ms timer (never the link thread), and cache the value in `EngineState`.
    4. `type_text`: post one key event per character using `CGEvent::set_string` (a Unicode string) instead of the keycode table, so text is layout-independent and supports non-ASCII.
  - Accept: with Accessibility revoked, pressing a shortcut key produces `action-error` with a clear message, and the UI shows the banner.

- [ ] **ME-10 [P2] Mutex poisoning** → **Revised: link part absorbed by LINK-02.** Remaining: the engine and action worker.
  - Change: use `parking_lot::Mutex` in the engine. Wrap each job in `catch_unwind` and emit `macro11:action-error` on panic.

- [ ] **ME-11 [P2] Keymap storage robustness**
  - Files: `src/config/storage.rs`, `src/commands/keymap_commands.rs`.
  - Evidence and change:
    - `save_keymap` uses `fs::write`, which leaves a partial file on crash. Write to `<name>.json.tmp`, then `fs::rename`. Put this helper in a small shared module both apps use (GL-03 needs it too).
    - `load_keymap_by_name(name)` joins user input into a path (`../../x` escapes the dir). Validate `name` against `^[A-Za-z0-9_-]{1,64}$`.
    - `~/.config/macro-eleven` is hard-coded via `dirs::home_dir`. Use `app.path().app_config_dir()` (Tauri path API), so macOS uses `~/Library/Application Support/<identifier>` and Windows uses `%APPDATA%`. Migrate an existing `~/.config/macro-eleven/keymaps` directory once on startup.
    - `ensure_default_keymap` writes `default.json` once and never updates it, so new app versions keep a stale default. Do not persist the default: load it from `include_str!` when `user-custom.json` does not exist.
    - Unknown JSON fields are silently dropped on round-trip. TS `BaseAction.description`, `ShortcutAction.modifiers`, and `KeymapSettings.plugins` do not exist in Rust. Add these fields to the Rust structs, or add `#[serde(flatten)] extra: serde_json::Map<String, Value>` to each struct so saves preserve them.
  - Accept: unit tests for name validation, atomic save, and round-trip of a keymap containing `description` and `modifiers`.

- [ ] **ME-12 [P3] Remove dead IPC surface and legacy parser**
  - Evidence:
    - The UI never passes `path` to `get_layer_data` (useLayerData.ts calls `getLayerData()`). So `commands/layers.rs:32-36` and `src/keymap/parser.rs` (regex `keymap.c` parser) are dead, and they also let the frontend read any file path.
    - Commands `get_active_keymap`, `save_user_keymap`, `list_available_keymaps`, `load_keymap_by_name`, `get_active_application`, `reset_to_default`, and `detect_device_cmd` have no caller in `src/`.
    - `KeymapEngine::get_current_layer` is `#[allow(dead_code)]`.
    - `DeviceState.test_mode` is parsed but unused.
    - Stale comments in `lib.rs:2-5`.
  - Change: delete the `keymap/` module, the `path` parameter, and the `regex` dependency. Move `action_label` (layers.rs:66-95) to `src/keymap_labels.rs`; the screen composer (SCR-05) reuses it. For each unused command, either delete it or add a typed wrapper in `tauri.ts` if a planned UI needs it. **[DECISION]** ask the user which keymap-management commands the Keymap Designer will use; default to deleting.
  - Accept: `cargo tree -p macro-eleven | grep regex` is empty; `pnpm -s fallow:dead-code` shows fewer unused exports.

- [ ] **ME-13 [P2] Open keymap file with the system handler, not a hard-coded editor**
  - Files: `src/commands/keymap_commands.rs:85-171`.
  - Evidence: the macOS path tries `open -a Cursor` first (the author's editor), then `open`.
  - Change: use `tauri_plugin_opener::OpenerExt` → `app.opener().open_path(path, None::<&str>)`; delete the platform `Command` branches.

- [ ] **ME-14 [P2] Enable a Content Security Policy**
  - Files: `src-tauri/tauri.conf.json:22-24` (`"csp": null`), same in `apps/glyf`.
  - Change: `"csp": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src ipc: http://ipc.localhost"`. (`blob:` covers VirtualScreen snapshot export in SCR-07.) Run `pnpm dev:macro-eleven` and check the webview console for CSP violations.

- [ ] **ME-15 [P2] Keymap schema parity between TS and Rust**
  - Files: `shared/libs/keymap-schema/src/{types,validation,defaults}.ts`, `src-tauri/src/config/keymap.rs`, `src-tauri/src/config/default_keymap.json`, `apps/macro-eleven/src/entities/keymap.ts:61-81`.
  - Evidence:
    - `autoSwitchLayers` defaults to **true** in Rust (`keymap.rs:195`) and **false** in TS `determineActiveLayer` (`entities/keymap.ts:66`).
    - TS `KeyModifier` includes `"fn"`, but Rust `ModifierKey::from_token` has no `fn`, which gives the runtime error "Unknown key token: fn". Rust accepts `option`/`opt`/`meta`/`super`; the TS type does not list them.
    - `settings.debounceMs` exists in both schemas and in the default keymap, but nothing reads it.
    - `MACRO_ELEVEN_DEFAULT_KEYMAP` (TS) and `default_keymap.json` (Rust) are two hand-maintained copies. They match today except `metadata.createdAt: new Date()` in TS (non-deterministic).
    - `validateKeymap` returns a type predicate but throws instead of returning `false`. It does not check that layer IDs fit `u8`, matrix bounds, macro step shapes, or shortcut key tokens.
  - Change:
    1. Keep one copy of the default keymap:
       - Move `default_keymap.json` to `shared/libs/keymap-schema/src/macro-eleven.default.json`.
       - In TS, import it (add `"resolveJsonModule": true` to the keymap-schema tsconfig) and export it as `MACRO_ELEVEN_DEFAULT_KEYMAP` typed as `Keymap`.
       - In Rust (`src/config/storage.rs`), use `include_str!("../../../../../shared/libs/keymap-schema/src/macro-eleven.default.json")`.
       - Remove `createdAt: new Date()`.
    2. Decide the `autoSwitchLayers` default (recommend `true`, matching the shipped behavior) and align TS.
    3. Remove `"fn"` from `KeyModifier` (CGEvent cannot synthesize Fn reliably) and add `"option"`.
    4. Remove `debounceMs` (firmware already debounces) or implement it. Recommend remove.
    5. Rename `validateKeymap` → `assertKeymap` (throws, `asserts keymap is Keymap`) and extend the checks.
    6. Add an optional `icon` field to actions (a Lucide icon name from the SCR-02 icon subset). Tiles use it on the screen; if absent, the composer picks an icon by action type.
    7. Longer term (optional, P3): generate TS types from Rust with `specta`/`tauri-specta`, so command payloads and events are typed end-to-end.
  - Accept: a new Vitest test in keymap-schema validates the shared default JSON; a new Rust test deserializes the same file via `include_str!`.

- [ ] **ME-16 [P3] macOS opens the raw HID interface exclusively** → **Revised: absorbed by LINK-02.** Tick with LINK-02.
  - Evidence (kept): the `hidapi 2.6.5` macOS backend defaults to `kIOHIDOptionsTypeSeizeDevice` (`etc/hidapi/mac/hid.c:469`) unless the crate feature `macos-shared-device` is on.

---

## 5. Phase 3 — Screen, virtual-first (SCR)

Goal: a pixel-accurate rev 2 screen inside both Tauri apps, with no hardware. Done means:
- the Screen view works against the simulator and against rev 1 hardware (preview);
- golden images pass in `cargo test`;
- the rev 2 firmware targets compile.

- [ ] **SCR-01 [P1] Device layouts and theme contract**
  - Files: `shared/firmware/glyf-core/include/glyf_layout.h`, `src/layouts/macro_eleven_r2.c`, `src/layouts/glyf_display_r1.c`; add a layout section to `docs/protocol/glyf-link-v2.md`.
  - Change: define layouts as `const` tables (no code):
    - **Macro Eleven rev 2**, 480×320 landscape:
      - header 44 px: title (layer name), context (active app), status dots for connected and host control;
      - body: a 4×3 tile grid mirroring the physical keys (`MATRIX_LAYOUT` order), 4 px gaps;
      - cell `[0,3]` (the physical knob slot) is a knob gauge driven by live knob input;
      - toast overlay: bottom 36 px band.
    - **Glyf display rev 1**, 480×320 landscape: header 44 px, then a 3×2 grid of touch tiles; tap feedback comes from live touch input.
    - Theme: a palette of ≤ 16 RGB565 colors indexed by `accent`/role. It is generated in SCR-02 from the app theme tokens, so screen and app match.
  - Accept: `glyf_layout_validate()` (C, run in Rust tests) checks that rects stay inside the screen, do not overlap unless flagged as overlay, and that tile count matches `key_count`.

- [ ] **SCR-02 [P1] Asset pipeline: fonts, icons, theme → generated C**
  - Files: new `tools/screen-assets/` (a pnpm workspace package: `package.json`, `src/index.ts`); output `shared/firmware/glyf-core/assets/generated/{fonts.c,fonts.h,icons.c,icons.h,theme.h}`; licenses in `shared/firmware/glyf-core/assets/LICENSES/`.
  - Change:
    - **Fonts.** Commit Inter TTF (OFL-1.1, add `OFL.txt`). Rasterize with `@napi-rs/canvas` (Skia) at 14, 20, and 28 px: ASCII 32-126 plus `… • ✓ × ↑ ↓ ← →`.
      - Output 4-bit alpha glyph bitmaps with per-glyph advance, bearing, and box.
      - Kerning is out of scope.
    - **Icons.** Rasterize a curated subset of `lucide-static` SVGs (ISC) with `@resvg/resvg-js` at 24 and 32 px, as 4-bit alpha. Start with: `layers`, `rocket`, `keyboard`, `list-ordered`, `puzzle`, `circle-off`, `app-window`, `play`, `pause`, `skip-forward`, `skip-back`, `volume-2`, `volume-x`, `search`, `plus`, `x`, `save`, `terminal`, `globe`, `pen-tool`, `message-square`, `music`, `folder`, `sun`, `power`. `icon_id` = index into the generated table; also emit `icons.json` (name → id) for the host composer.
    - **Theme.** Parse the CSS tokens from `shared/libs/ui/src/theme.css` (after X-01; until then `apps/macro-eleven/src/app/App.css`). Convert oklch → sRGB with `culori`, then to RGB565.
    - Scripts: `pnpm screen:assets` (write) and `pnpm screen:assets --check` (exit 1 if output differs). Outputs are committed, so firmware builds need no Node.
  - Accept: `--check` passes on a clean tree; generated flash footprint is printed and stays under 150 KB total.

- [ ] **SCR-03 [P1] Band renderer in `glyf-core`**
  - Depends on: SCR-01, SCR-02.
  - Files: `shared/firmware/glyf-core/include/glyf_render.h`, `src/render.c`, `src/text.c`, `src/widgets.c`.
  - Change:
    1. API:
       ```c
       void     glyf_render_band(const glyf_core_t *c, glyf_rect_t band, uint16_t *rgb565_out); /* row-major, band.w*band.h */
       uint8_t  glyf_dirty_rects(glyf_core_t *c, glyf_rect_t *out, uint8_t max);                /* since last call; merges overlaps */
       uint16_t glyf_text_width(uint8_t font_id, const char *utf8, uint8_t len);
       ```
    2. Primitives: fill rect, rounded rect (integer corner table), 4-bit alpha blend into RGB565 (`c = bg + (((fg - bg) * a) >> 4)` per channel), glyph and icon blit, single-line text with clip and ellipsis.
    3. Widgets:
       - header;
       - tile (label, icon, accent, pressed state from live keys/touch);
       - knob gauge: 31 ticks like the app's `KnobDial`, positions from a generated table, no trig at runtime;
       - toast with TTL;
       - status dots.
    4. Dirty tracking:
       - a scene commit diffs old vs. new scene per widget;
       - a key or touch change dirties only that tile;
       - a knob change dirties only the gauge rect.
    5. Output is native-endian `uint16_t` RGB565. Byte-swapping for SPI is the panel HAL's job.
  - Accept (Rust tests in `glyf-core-sys`):
    - **Golden images.** Render fixed scenes (default layer, long labels needing ellipsis, all tiles pressed, knob 0/512/1023, error toast, glyf touch tile pressed) to PNG under `shared/firmware/glyf-core/tests/golden/` and compare bytes exactly. `UPDATE_GOLDEN=1 cargo test -p glyf-core-sys` regenerates them.
    - **Band invariance.** Rendering the full screen with band heights 1, 7, 20, and 320 gives identical pixels.
    - **SPI budget.** Estimated SPI time for the dirty rects of one key press at 40 MHz is < 5 ms; a full scene change is < 70 ms.

- [ ] **SCR-04 [P1] `ScreenMirror` in `glyf-link`**
  - Depends on: LINK-04, SCR-03.
  - Files: `shared/crates/glyf-link/src/mirror.rs`.
  - Change:
    - `ScreenMirror` owns its own `glyf_core_t` for the connected device's profile.
    - It is fed the same scene the host uploads, plus the live inputs from `LinkEvent::Input` (or from the simulator).
    - It keeps a full RGB565 framebuffer on the host (300 KB is fine there) and re-renders only dirty rects.
    - It exposes `frame_rgba() -> Vec<u8>` (614,400 B) and `take_dirty() -> Vec<Rect>`.
    - For rev 2 hardware, scene upload (`SCENE_BEGIN`/`CHUNK`/`COMMIT`) happens only when `HELLO` has the screen cap. The mirror updates in every mode.
  - Accept: unit test — upload a scene through `SimTransport`, and the mirror frame equals the golden image for that scene.

- [ ] **SCR-05 [P1] Scene composers**
  - Depends on: SCR-04, ME-02, ME-12 (`action_label` moved).
  - Files: new `apps/macro-eleven/src-tauri/src/screen/composer.rs`; new `apps/glyf/src-tauri/src/screen/composer.rs`.
  - Change:
    - **macro-eleven** builds the scene from engine state:
      - title = layer name;
      - context = active app;
      - 11 tiles in `MATRIX_LAYOUT` order, label = `action_label`, icon = action `icon` or an icon by action type (`launch_app` → `rocket`, `shortcut` → `keyboard`, `macro` → `list-ordered`, layer actions → `layers`, `noop` → none);
      - flags = connected, host control;
      - toast = last `action-error` (error, 3 s) or layer change (info, 1 s).

      Recompose only when an input changes (layer, keymap reload, active app, host control, toast). Truncate labels with `glyf_text_width`.
    - **glyf:** title "Glyf", status from display state, and tiles from a new `GlyfConfig.tiles: [{label, icon}]` (default 6 demo tiles). A tap on a tile emits `glyf:tile-pressed {index}`. **[DECISION]** what the Glyf display should show by default and what tile taps do (default: demo tiles, event only).
  - Accept: composer unit tests (default keymap → expected scene bytes; label truncation; recompose-on-change only).

- [ ] **SCR-06 [P1] Deliver frames to the UI**
  - Depends on: SCR-04.
  - Files: both apps' `commands/screen.rs` (new), `lib.rs`, `src/shared/lib/tauri.ts`.
  - Change:
    - Event `screen:frame-ready { seq, dirty: Rect[] }`, emitted at most 60/s and coalesced.
    - Command `#[tauri::command(async)] get_screen_frame() -> tauri::ipc::Response` returns raw RGBA bytes (arrives in JS as `ArrayBuffer`, no JSON).
    - The UI fetches on the event, drops stale `seq`, and paints with `putImageData`.
    - Optimization (later): `get_screen_rect(rect)` for dirty-rect-only transfer.
  - Accept: turning the virtual knob continuously keeps the UI at 60 fps. Measure with the devtools Performance panel; no long tasks > 16 ms.

- [ ] **SCR-07 [P1] `VirtualScreen` component (shared UI)**
  - Depends on: SCR-06, X-01 (now required; see Phase 7).
  - Files: `shared/libs/ui/src/device/VirtualScreen.tsx`; macro-eleven new page `src/pages/ScreenPage.tsx` + nav item; glyf `src/features/display-preview/DisplayPreview.tsx` (replace the `DisplayCanvas` placeholder, then delete `DisplayCanvas.tsx`).
  - Change:
    - `<canvas width={w} height={h}>` at device resolution (w/h from `DeviceProfile`), scaled with CSS (`image-rendering: pixelated`) at 1×/1.5×/2×, with a device bezel.
    - Orientation rotation from the profile.
    - Toggles:
      - **Dirty regions**: flash the rects from `frame-ready.dirty` for 150 ms.
      - **SPI cost**: show estimated device redraw ms per update = `pixels × 16 / 40e6`.
    - "Save PNG" exports the frame (for design review and bring-up comparison).
    - Badge text: `Simulated`, `Preview (device has no screen)`, or `Mirroring device`.
  - Accept: the Screen page renders the default scene with a simulated rev 2 device. Browser test: the canvas gets non-black pixels after a mocked frame.

- [ ] **SCR-08 [P2] Virtual input**
  - Depends on: LINK-05, SCR-07.
  - Files: macro-eleven `src/shared/ui/MacropadGrid.tsx` (after UI-01), `src/features/key-tester/*`, `src/shared/ui/KnobDial.tsx`; glyf `VirtualScreen` pointer handling.
  - Change:
    - In simulator mode, MacropadGrid cells are pressable: pointer down/up → `sim_input({keys})`, including multi-touch/chords.
    - Keyboard mapping `1 2 3 / q w e r / a s d f` → the 11 keys (shown in a legend).
    - `KnobDial` already supports `onChange`; wire it to `sim_input({knob})`, throttled to 100 Hz.
    - Glyf: pointer down/move/up on `VirtualScreen` → `sim_input({touch})` in device coordinates (account for CSS scale and orientation).
    - All inputs travel SimTransport → C core → `EVENT_INPUT` → the same engine path as hardware.
  - Accept: in simulator mode, clicking the Chrome tile's key on layer 1 fires the same `action-executed` event a hardware key would. The pressed highlight appears on the VirtualScreen.

- [ ] **SCR-09 [P2] Rev 2 firmware integration scaffolding (compile-only)**
  - Depends on: SCR-03, FW-03.
  - Macro Eleven (QMK):
    1. Restructure into QMK revisions:
       - `firmware/info.json` (shared: USB IDs, features);
       - `firmware/rev1/keyboard.json` (current matrix/pins);
       - `firmware/rev2/keyboard.json` (matrix plus display pins as `TODO(rev2-pins)` placeholders that still compile);
       - `firmware/macro_eleven.c` shared at the parent level.

       Keymaps stay under `firmware/keymaps/`.
    2. `build.sh` copies `shared/firmware/glyf-core` into the QMK keyboard dir (`lib/glyf-core/`) and the keyboard `rules.mk` lists each file explicitly (`SRC += lib/glyf-core/src/link.c lib/glyf-core/src/scene.c ...`; make does not glob `SRC`) and adds the include dir to `VPATH`. Check `$QMK_DIR/builddefs/build_keyboard.mk` for how `SRC`/`VPATH` paths resolve under a revision folder (`KEYBOARD_PATH_*` variables) before choosing relative or absolute paths. Rev 2 sets `SPI_DRIVER_REQUIRED = yes` plus `halconf.h`/`mcuconf.h` SPI enables.
    3. New `firmware/rev2/glyf_hal_qmk.c`:
       - SPI HAL via QMK `spi_master.h` (`spi_init`, `spi_start`, `spi_transmit`, `spi_stop`) plus GPIO for DC/RST/BL;
       - render one band per `housekeeping_task_kb` call, so matrix scanning stays responsive;
       - band size 480×16 double-buffered.
  - Glyf display (Pico SDK):
    1. `firmware/CMakeLists.txt`: `add_subdirectory(${CMAKE_CURRENT_LIST_DIR}/../../../../shared/firmware/glyf-core glyf-core)` and link `glyf_core`.
    2. Move the ST7796S driver into `shared/firmware/glyf-core/src/panel/st7796s.c` behind the 5-function HAL (`spi_write`, `spi_write_dma_async`, `dc`, `cs`, `delay_ms`), with the MADCTL fix from GFW-01. The Pico HAL uses `hardware_spi` + `hardware_dma`; the old `display/st7796s.c` is deleted.
    3. Replace `hid_handler.c` dispatch with `glyf_link_handle`. The main loop renders dirty bands between `tud_task()` calls (absorbs GFW-02) and samples touch between bands (GFW-05).
  - Accept: `qmk compile -kb handwired/macro_eleven/rev1 -km apps`, `.../rev2 -km apps`, and glyf `build.sh` all compile. Report flash/RAM usage from the build output in the commit body (RAM budget for rev 2: ≤ 64 KB for glyf-core state + band buffers).

- [ ] **SCR-10 [P3] Hardware bring-up checklist (for when rev 2 exists)**
  - Files: new `docs/bring-up/rev2-screen.md`.
  - Content (ordered):
    1. Power and backlight PWM (GFW-09).
    2. Panel init and orientation test pattern: a 1-px border at 0,0-479,319, a colored quadrant per corner, confirm all edges (GFW-01).
    3. Color order: pure R, G, B bars vs. the MADCTL BGR bit.
    4. SPI clock ramp 20 → 40 → 62.5 MHz with a checksum pattern.
    5. Compare a device photo to "Save PNG" from the mirror.
    6. Touch calibration: a corner-target flow on VirtualScreen writes `TouchCalibration`.
    7. Measured redraw times vs. the SCR-03 budget.
    8. Rev 1 host-control checks from ME-03 and FW-01.

---

## 6. Phase 4 — macro-eleven firmware (QMK)

Location: `domains/prototypes/macropads/macro-eleven/firmware`. The build copies this into `$QMK_DIR/keyboards/handwired/macro_eleven`. After SCR-09 the layout is `info.json` + `rev1/` + `rev2/`.

- [ ] **FW-01 [P0] Boot in standalone mode; host claims control with heartbeat; revert on timeout** → **Revised: the timeout and state live in `glyf-core` (`glyf_core_tick`); this task is the QMK glue.**
  - Files: `keymaps/apps/keymap.c:209-234,350-361` (moved to keyboard level in FW-03).
  - Evidence:
    - `static bool test_mode_active = true;` swallows every key until a host sends `0x02 0x00`.
    - If the companion app crashes or quits (see ME-03), the device stays silent.
    - Bootloader-hold on `BACK_HOME` is also blocked in this state, because `process_record_user` returns early.
  - Change:
    1. Default `host_control = false` (the `glyf-core` default).
    2. Call `glyf_core_tick(core, timer_read32())` from `housekeeping_task_kb`. `process_record_kb` suppresses keycodes only while `glyf_core_host_control()` is true.
    3. Always process `BACK_HOME` hold-to-bootloader, even under host control.
    4. The host sends `HEARTBEAT` every 250 ms (LINK-02 v2 codec). With the v1 adapter, the 16 ms poll is the heartbeat.
  - Accept: compiles for `apps`. Simulator test (LINK-04) covers the timeout. Hardware checks go to SCR-10: (a) no app → keys type; (b) app connects → host actions run; (c) `kill -9` the app → keys type again within ~1 s.

- [ ] **FW-02 [P1] Potentiometer: gated by mode, initialized, filtered, rate-limited**
  - Files: `keymaps/apps/keymap.c:312-344,380-381`.
  - Evidence:
    - (a) Pot volume/Figma taps run in `matrix_scan_user` even in host-control mode.
    - (b) `pot_last_value` starts at 0, so the first scan after boot sends a spurious `KC_VOLU`.
    - (c) `analogReadPin` runs every matrix scan, and the raw, unfiltered value is sent to the host (UI jitter).
    - (d) The 80-count threshold gives only ~12 steps.
  - Change:
    - Sample every 10 ms and apply an integer EMA (`filt += (raw - filt) >> 3`, scaled ×16).
    - Initialize the reference from the first sample; use 24-count hysteresis.
    - Skip key taps under host control.
    - Pass the filtered value to `glyf_core_set_inputs` (it drives `EVENT_INPUT` and, on rev 2, the knob gauge).
  - Accept: compiles. Hardware checks go to SCR-10.

- [ ] **FW-03 [P1] Companion protocol at keyboard level for every keymap; VIA coexistence** → **Revised: the spec is LINK-01; the protocol logic is `glyf-core`; this task is the QMK glue.**
  - Files: `macro_eleven.c`, `keymaps/apps/keymap.c`, new `firmware/companion_qmk.c` (`SRC +=` in `rules.mk`).
  - Evidence:
    - Only the `apps` keymap implements `raw_hid_receive`.
    - `default` and `via` builds enumerate raw HID but never reply. The host "connects", every `read_timeout` returns 0 bytes, and the UI shows Connected with no input.
    - Command IDs `0x01`/`0x02` collide with VIA's `id_get_protocol_version`/`id_get_keyboard_value`.
  - Change:
    1. Without VIA: `raw_hid_receive` → `glyf_link_handle` → `raw_hid_send` when the reply length is > 0.
    2. With VIA: check `$QMK_DIR/quantum/via.c` for the unhandled-command hook in the installed QMK version (`raw_hid_receive_kb` in current QMK) and route frames with magic `0xA5` there.
    3. In `housekeeping_task_kb`, send `glyf_link_next_event` output (FW-05).
    4. Delete `raw_hid_receive` and the test-mode code from `keymaps/apps/keymap.c`.
  - Accept: `apps`, `via`, and `default` keymaps compile (rev1). `HELLO` works from the host against rev 1 hardware (SCR-10 checklist item).

- [ ] **FW-04 [P1] `via` keymap is not VIA-enabled**
  - Evidence: `keymaps/via/` contains only `keymap.c`; there is no `rules.mk` with `VIA_ENABLE = yes` (compare `four-pad/firmware/keymaps/via/rules.mk`). `build.sh` defaults to `via` (line 10).
  - Change: add `keymaps/via/rules.mk` with `VIA_ENABLE = yes`. Set the `build.sh` default keymap to `apps`.
  - Accept: `build.sh via` compiles, and the `qmk compile` output lists VIA.

- [ ] **FW-05 [P2] Push input edge events instead of host level-polling** → **Revised: the event encoding lives in `glyf-core`.**
  - Depends on: FW-03, LINK-02.
  - Change: `housekeeping_task_kb` calls `glyf_core_set_inputs(matrix bitmask, filtered pot)`. While `glyf_link_next_event` returns a frame, send it (only under host control). The host does a blocking read (LINK-02).
  - Accept: covered by the LINK-04 loopback test (event on change, `event_seq` gap detection).

- [ ] **FW-06 [P2] Remove blocking waits from the key handler**
  - Files: `keymaps/apps/keymap.c:213-228` (`launch_app`: `wait_ms(500)` + `wait_ms(400)` inside `process_record_user`).
  - Evidence: ~1 s of blocking stops matrix scanning, USB servicing, raw HID replies and, on rev 2, screen rendering.
  - Change: **[DECISION]** ask the user whether standalone Spotlight launching is still wanted.
    - If yes, rewrite it as a `defer_exec` state machine (`DEFERRED_EXEC_ENABLE = yes`).
    - If no, delete the `APP_*` keycodes and the launcher.

- [ ] **FW-07 [P2] One hold-to-bootloader implementation**
  - Files: `macro_eleven.c:13-40` (handles a `QK_BOOT` hold that no keymap uses), `keymaps/apps/keymap.c:236-250,302-310`, `keymaps/via/keymap.c:82-113`.
  - Change: define `BACK_HOME = QK_KB_0` at keyboard level (tap = layer 0 / cycle per keymap callback, hold 2 s = `bootloader_jump()`), implement it once in `macro_eleven.c`, and delete the per-keymap copies. Also handle `REBOOT_BOOTLOADER` from LINK-01.

- [ ] **FW-08 [P2] Hardware-mapping and config cleanup**
  - Bootmagic vs. physical top-left:
    - `config.h:16-18` sets bootmagic to `[0,2]` and claims that is physically top-left "after column reversal".
    - The keymap diagrams, the host UI, and the rev 2 screen layout (SCR-01) all treat `[0,0]` as top-left and `[0,3]` as the knob slot.
    - **[DECISION]** ask the user which physical key is top-left, then make comments, bootmagic, `MATRIX_LAYOUT`, and `macro_eleven_r2.c` agree.
  - `keyboard.json`: remove `"mousekey": true`; set a real `maintainer`.
  - `config.h`: move `DYNAMIC_KEYMAP_LAYER_COUNT 4` to `keymaps/via/config.h`.
  - VID `0x4653` is shared by Four Pad (`0x0001`), Macro Eleven (`0x0002`), and Glyf display (`0x0003`) and is not an allocated vendor ID. Before shipping rev 2 hardware, obtain a VID/PID (e.g. pid.codes); record this in `docs/product-line.md`. `HELLO.hw_id/hw_rev` identify revisions, so rev 2 does not need a new PID.

- [ ] **FW-09 [P3] Build script robustness**
  - Files: `macro-eleven/build.sh`, `macro-eleven/watch-and-flash.sh`, `four-pad/build.sh` (a near-identical copy).
  - Change:
    - Replace the hard-coded `$HOME/Library/Python/3.13/bin` with `command -v qmk || { echo "install qmk"; exit 1; }`.
    - Sync with `rsync -a --delete firmware/ "$KEYBOARD_DIR/"`, plus the `glyf-core` copy from SCR-09.
    - Use `set -euo pipefail`.
    - In `watch-and-flash.sh`, call `"$(dirname "$0")/build.sh"`.
    - Accept a revision argument (`rev1` default).
    - Extract a shared `scripts/qmk-build.sh <keyboard> <keymap> [flash]`.

---

## 7. Phase 5 — Tests (add alongside earlier phases; minimum set)

- [ ] **T-01 [P1] Rust unit tests for macro-eleven**
  - `shortcuts.rs`: `ShortcutSequence::from_keys` happy path, trailing modifier error, F-keys, unknown token.
  - `keymap.rs`: `MatrixPosition::from_key` edge cases, `determine_layer`.
  - Engine: edge detection and the layer rules from ME-06.
  - The `include_str!` default keymap deserializes.
  - Protocol tests live in `glyf-link` (LINK-02/LINK-04).
- [ ] **T-02 [P2] Make the active-app smoke test non-flaky** — `executor/app_detector.rs:22-28` asserts a frontmost app exists, which fails on headless macOS runners and over SSH. Mark it `#[ignore = "needs a GUI session"]`.
- [ ] **T-03 [P2] Add a Vitest project for `apps/macro-eleven`**
  - Create `apps/macro-eleven/vitest.config.ts` (jsdom) and add it to root `vitest.config.ts` `projects`.
  - First tests:
    - `matrixToIndex`/`MATRIX_LAYOUT` round-trip;
    - `getActionLabel`;
    - `useKeyEvents` layer resolution with mocked `@tauri-apps/api/event`;
    - the virtual-input keyboard mapping (SCR-08).
- [ ] **T-04 [P2] Typecheck shared libs in CI** — add `"typecheck": "tsc --noEmit"` to every package under `shared/libs/*` (keymap-schema, display-schema, link-schema, ui) and to `tools/screen-assets`.
- [ ] **T-05 [P1] Screen regression suite** — golden images, band invariance, and SPI-budget tests (SCR-03), plus mirror-equals-golden (SCR-04), all run in `cargo test --workspace`. Add a `glyf-core` cross-compile smoke build to CI (X-02):
  - Build `shared/firmware/glyf-core/CMakeLists.txt` as a static library with `arm-none-eabi-gcc -mcpu=cortex-m0plus -mthumb -Os -Werror -Wdouble-promotion -Wfloat-conversion`.
  - Fail if `arm-none-eabi-nm` shows any `__aeabi_f*`/`__aeabi_d*` (soft-float) or `malloc` reference.
  - Print `arm-none-eabi-size` so flash growth is visible.

---

## 8. Phase 6 — macro-eleven frontend

- [ ] **UI-01 [P2] Fix the FSD boundary violation** — `src/shared/ui/MacropadGrid.tsx:1` imports runtime values (`MATRIX_LAYOUT`, `matrixToIndex`) from `entities/key`, and `shared` must not depend on `entities`. Pass the layout as a prop from features/pages, or move the constants to `src/shared/config/layout.ts`. MacropadGrid also becomes the virtual input surface (SCR-08), so add `onKeyDown(index)` / `onKeyUp(index)` props. Verify with `pnpm -s fallow:dead-code --boundary-violations`.
- [ ] **UI-02 [P2] Use the shared `Button`; delete or adopt `card.tsx`** — `shared/ui/button.tsx` and `card.tsx` are unused (fallow `unused_files`), while `App.tsx:22-41`, `KeymapDesignerPage.tsx:20-79`, `KeyTester.tsx:307-313`, and `LayerViewer.tsx:99-114` copy long button class strings. After X-01 these come from `@glyf/ui`.
- [ ] **UI-03 [P2] Split `KeyTester` (289 lines, cognitive 20)** — extract `HostModeSwitch`, `DebugStats`, `DebugEventFeed`, and a `useDebugEventFeed()` hook. Replace the light-theme badge colors (`bg-slate-100`, `bg-amber-50 text-amber-900`, lines 42-63 and 263) with theme tokens.
- [ ] **UI-04 [P2] Layer viewer label pipeline** — the host now returns human labels (`action_label`), but `KeyLabel`/`OverlayKeyCell` still run them through `keycodeToLabel` (a QMK keycode parser) and fall back to `"KC_NO"` (`entities/layer.ts:17-19`). Render labels as-is; an empty slot is `"—"`. Delete `keycode-labels.ts` if no firmware-keymap viewer remains. Consider showing a small VirtualScreen thumbnail in the Layer Viewer (the same frame source as SCR-07).
- [ ] **UI-05 [P3] Dead UI and dead exports**
  - The "Edit Actions" button in `KeymapDesignerPage.tsx:65-73` has no handler.
  - Remove unused exports reported by fallow (trace each first): `getActionIcon`, `getActionForKey`, `determineActiveLayer`, `getLayerNames`, `isValidForDevice`, re-exports in `entities/keymap.ts`, `entities/action.ts` type re-exports, `KeyAssignment`, `KeyPressEvent`, `DeviceInfo`, `detectDevice`, `badgeVariants`.
- [ ] **UI-06 [P3] `components.json` aliases**
  - Aliases point at `@/components`, `@/lib/utils`, and `@/hooks`, which do not exist under FSD.
  - Set `"ui": "@/shared/ui"`, `"utils": "@/shared/lib/utils"`, `"lib": "@/shared/lib"`, `"hooks": "@/shared/lib"`, `"components": "@/shared/ui"`.
  - Check `apps/glyf/components.json` too.
- [ ] **UI-07 [P3] Pot monitor shows the firmware layer in host mode** — `PotMonitor.tsx` labels the pot function by the firmware layer, which never changes under host control. Drive it from the host layer + keymap, or hide the card in host mode.

---

## 9. Phase 7 — Cross-app duplication and tooling

- [ ] **X-01 [P2] Create `@glyf/ui` shared package** → **Revised: now required** (the user chose a screen shared across both apps; `VirtualScreen` needs a shared home and the theme is the source for screen colors). Do it before SCR-07.
  - fallow reports 434 duplicated lines: the `App.css` theme tokens (6 clone groups), `NavBar.tsx`, `StatusBadge.tsx`, `providers.tsx`, and the `App.tsx` header.
  - Create `shared/libs/ui` (`@glyf/ui`) with:
    - `src/theme.css` (single token source, also read by SCR-02);
    - `NavBar` (items as props), `StatusBadge` (adds a `simulated` state), `Button`, `Card`, `Badge`, `Separator`, `cn`;
    - `src/device/` for `VirtualScreen` and a `DeviceSourcePicker`.
  - Both apps import it.
  - Verify with `pnpm -s fallow:dupes` (target < 3%).

- [ ] **X-02 [P2] CI coverage gaps**
  - Problem: `.github/workflows/ci.yml` never runs `pnpm lint`, `cargo fmt --check`, or `cargo clippy`.
  - `typescript` job:
    - add `pnpm lint` and `pnpm -s screen:assets --check`;
    - add `pnpm exec fallow dead-code --ci --fail-on-issues` **after** cleanup brings dead code to 0. Until then use a baseline: commit `pnpm exec fallow dead-code --save-baseline fallow-baseline.json` at repo root, and have CI run with `--baseline fallow-baseline.json`.
  - `rust` job: add `cargo fmt --all --check` and `cargo clippy --workspace --all-targets --locked -- -D warnings`.
  - New `firmware` job:
    - `glyf-core` cross-compile smoke build (T-05);
    - glyf display build with pico-sdk (GFW-12);
    - optionally QMK rev1/rev2 builds in the `qmkfm/qmk_cli` container.

- [ ] **X-03 [P3] Documentation drift**
  - Done 2026-09-25: both app `CLAUDE.md` files and READMEs match the code; the root README CI section is correct; `IMPLEMENTATION_SUMMARY.md` is deleted; `HOST_SIDE_KEYMAP_SYSTEM.md` is now `apps/macro-eleven/docs/keymap-engine.md`; the Macro Eleven wire protocol is in `macro-eleven.md`.
  - Remaining: when LINK and SCR land, point both app `CLAUDE.md` files to `glyf-link`, the simulator, and `docs/protocol/glyf-link-v2.md`. Add a "Develop without hardware (simulator)" section to the root README. Update `keymap-engine.md` after ME-11 and LINK-01.

- [ ] **X-04 [P3] fallow false positive** — `fallow security` flags `scripts/firmware.mjs:19` (`spawn` with a non-literal command), but all call sites pass literals. Add `// fallow-ignore-next-line security-sink` with a one-line reason.

---

## 10. Section B — glyf app, glyf display firmware, display-schema

Baseline:
- `cargo test -p glyf`: 6 protocol tests pass.
- `tsc --noEmit` is clean for `apps/glyf` and `shared/libs/display-schema`.
- Firmware was not built during the audit. No P0 found.
- **The Glyf display hardware is not built yet.** Every hardware check below moves to SCR-10. Host and firmware compile work proceeds now; the simulator covers behavior.

Host root paths: `apps/glyf/src-tauri/src/` (crate `glyf`) and `apps/glyf/src/`. Firmware root: `domains/glyf/display/firmware/src/`.

### B.1 Host (Rust)

- [ ] **GL-01 [P1] Duplicate poll threads after disconnect → connect** → **Revised: absorbed by LINK-02/LINK-03.**
  - Evidence (kept): `hid/connection.rs:101-135,475` has the same bug as ME-01. The second loop emits `connected:false` every 2 s. After a user Disconnect, the old thread emits "unplugged or connection lost" (`:468-474`).
- [ ] **GL-02 [P1] Sync Tauri commands block the main (UI) thread on the device mutex** → **Revised: I/O part absorbed by LINK-02/LINK-03 (`#[tauri::command(async)]`, single I/O owner).** Remaining: throttle slider writes to ≤ 30 Hz trailing-edge in `DisplayPreview.tsx:94` and `DeviceSettings.tsx:112`; `get_device_debug_snapshot` (every 500 ms, `DeviceDebugView.tsx:167`) reads `DeviceLink::snapshot()` without touching the device.
- [ ] **GL-03 [P1] Corrupt `config.json` is silently replaced by defaults**
  - Evidence: in `config/storage.rs:13-24`, `load_config` falls through on a read or parse failure and overwrites the file with defaults. `get_display_config` calls it on every read.
  - Fix:
    - Write defaults only when the file is missing.
    - On a parse error, rename the file to `config.json.bak`, log it, and return defaults without saving.
    - Add `#[serde(default)]` to the config structs.
    - Use the atomic-write helper from ME-11.
- [ ] **GL-04 [P2] Read timeouts ignored; stale replies** → **Revised: absorbed by LINK-02.**
  - Evidence (kept): `hid/connection.rs:387-456` ignores `Ok(0)`. A device that never answers stays "waiting…" forever, and a late reply shifts every later read.
- [ ] **GL-05 [P2] Event flood** → **Revised: backend absorbed by LINK-02 (emit on change).**
  - Remaining: bail out of `setState` on equal values in `useDisplayState.ts:16-18`, `useTouchEvents.ts:14-16`, `DisplayPreview.tsx:16-18`.
  - Remaining: one release event per touch.
- [ ] **GL-06 [P2] Mutex poisoning bricks the connection until restart** → **Revised: absorbed by LINK-02.**
- [ ] **GL-07 [P2] Saved settings not replayed on auto-reconnect** → **Revised: implement in the LINK-02 `on_connected` hook.**
  - Evidence: `providers.tsx:77-83` replays brightness only on a manual `connect()`. Firmware boots at brightness 200 (`hid_handler.c:13`). Power state is never restored.
  - Replay brightness, power, and orientation on every connected transition.
- [ ] **GL-08 [P2] Tighten security surface**
  - Evidence:
    - `tauri.conf.json:22-24` sets `csp: null`.
    - The opener plugin and `opener:default` are enabled but unused.
    - `core:event:allow-emit` lets page script forge `glyf:device-status`.
    - The extra `core:event:*` entries are redundant with `core:default`.
  - Fix: CSP as in ME-14; remove the opener plugin and its permission; drop `allow-emit`.
- [ ] **GL-09 [P2] Config fields saved but never sent to device** → **Revised with the screen plan:**
  - `orientation`: send `SET_ORIENTATION` (LINK-01). VirtualScreen and the renderer honor it.
  - `colorDepth`: **remove**. The renderer is RGB565 by design, and 18-bit doubles SPI traffic for no visible gain.
  - `sleepAfterMs`: implement in `glyf-core` as backlight-off after idle (live inputs reset the timer). The simulator shows it by dimming VirtualScreen.
  - `TouchCalibration`: keep it in config. The calibration UI comes with bring-up (SCR-10), and `SET_TOUCH_CAL` is added then.
- [ ] **GL-10 [P3] Schema mismatches**
  - Rust `color_depth` is removed (GL-09).
  - TS `GlyfConfig.metadata` has no Rust field, so it is dropped on save: add `metadata: Option<serde_json::Value>`.
  - `DeviceStateReport` comment in `display-schema/src/types.ts:151-158` says raw ADC 0-4095, but the protocol sends pixels.
  - Delete unused types and commands: `DeviceStateReport`, `DisplayState`, `RawTouchPoint`, `DeviceInfo`, `detect_device_cmd`/`detectDevice`.
  - Move `DeviceDebugSnapshot` into `@glyf/link-schema`.
- [ ] **GL-11 [P3] Touch release event carries 0,0** — `hid/connection.rs:441-445`. `EVENT_INPUT` (LINK-01) keeps the last coordinates with `touch_flags.down = 0`; make the v1 adapter do the same.

### B.2 Frontend

- [ ] **GL-12 [P1] Status wrong after webview reload** → **Revised: backend via LINK-03 `get_link_snapshot`.** Remaining: `providers.tsx:39-67` subscribes, then seeds from the snapshot.
- [ ] **GL-13 [P1] Touch dots invisible (invalid CSS color)**
  - Evidence: `TouchPoint.tsx:16` and `TouchMonitor.tsx:36,55` use `hsl(var(--primary))` / `hsl(var(--border))`, but the tokens are `oklch(...)`, so the fill is black and the stroke and borders disappear.
  - Fix: use `var(--primary)` / `var(--border)` or Tailwind `fill-primary stroke-primary border-border`.
  - `DisplayCanvas.tsx:25` has the same bug, but that file is deleted by SCR-07.
  - Add a browser test that asserts the computed fill is not `rgb(0, 0, 0)`.
- [ ] **GL-14 [P2] `connect()` can hang or mis-report**
  - Evidence: `providers.tsx:76-89` polls for 45 `requestAnimationFrame` ticks, then exits without setting a status. rAF pauses in hidden windows, and "USB opened — waiting" flips the status mid-connect.
  - Fix: use the LINK status model (`connecting` / `connected` / `simulated` / `incompatible` / `disconnected` + detail) and a `setTimeout` deadline.
- [ ] **GL-15 [P2] Brightness slider jitter**
  - Evidence: in `DisplayPreview.tsx:16-18,34-42`, device events overwrite the optimistic value, so the slider snaps back while dragging.
  - Fix: keep a draft value that stays dirty until the device confirms (the `brightnessDirty` pattern from `DeviceDebugView`). In the simulator, the VirtualScreen backlight level reflects brightness.
- [ ] **GL-16 [P3] Smaller UI issues**
  - `DeviceSettings.tsx:33-43,51-57` and `providers.tsx:96-100`: Save, Reset, and disconnect have no error handling. The Default Brightness slider changes the live device without saving.
  - `useDisplayState.ts:7-10`: state starts at `{on:true, brightness:200}` and goes stale after a disconnect.
  - The Debug page (raw fill/power) ships in the production nav: gate it on `import.meta.env.DEV`.
  - `DeviceDebugView` (408 lines, cognitive 33) is the top fallow refactoring target: split it into panels and hooks.
  - The `DisplayCanvas` placeholder is replaced by `VirtualScreen` (SCR-07).

### B.3 Display firmware (Pico SDK, ST7796S + XPT2046)

- [ ] **GFW-01 [P1] Wrong MADCTL for 480×320 landscape** → **Revised: fix it in the shared panel driver (`glyf-core/src/panel/st7796s.c`, SCR-09); hardware verification moves to SCR-10.**
  - Evidence: ST7796S memory is natively 320 wide × 480 tall.
    - Init (`display/st7796s.c:142`) writes `MADCTL_MX | MADCTL_BGR` with no `MV`, while `CASET 0-479` (`TFT_WIDTH 480u`) is used. About a third of the panel is never written.
    - `set_orientation` (`:164-178`) has landscape and portrait swapped.
  - Fix, per orientation:

    | Orientation | MADCTL |
    |---|---|
    | landscape | `MV\|BGR` (0x28) |
    | landscape-flip | `MX\|MY\|MV\|BGR` (0xE8) |
    | portrait | `MX\|BGR` (0x48) |
    | portrait-flip | `MY\|BGR` (0x88) |

    Then retune `g_touch_cal.swap_axes`.
- [ ] **GFW-02 [P2] Display fill runs inside the USB callback** → **Revised: absorbed by SCR-09** (dirty-band rendering in the main loop between `tud_task()` calls; DMA). Keep `DEBUG_FILL` as a debug-only command that also renders from the main loop.
  - Evidence (kept): `hid_handler.c:38-42` calls `st7796s_fill` (307,200 single-byte SPI writes, ~150-200 ms) inside `tud_hid_set_report_cb`.
- [ ] **GFW-03 [P2] USB not serviced during enumeration**
  - Evidence: `main.c:84-90` runs `tusb_init()` before the splash (~0.5 s with no `tud_task`).
  - Fix: put the splash before `tusb_init()`, or render it band-by-band with `tud_task()` between bands.
- [ ] **GFW-04 [P2] Dropped poll replies**
  - Evidence: `main.c:50-54` ignores the `tud_hid_report()` return value and never checks `tud_hid_ready()`.
  - Fix: queue outgoing frames (a replies/events ring of 4) and send when ready or from `tud_hid_report_complete_cb`.
- [ ] **GFW-05 [P2] Touch sampling only on host poll, unfiltered** → **Revised:** sample in the main loop between render bands (shared SPI1). Gate on the IRQ pin, discard the first conversion, take the median of 5, and feed the result to `glyf_core_set_inputs`. The simulator exercises the logic; tuning happens in SCR-10.
  - Evidence (kept): `main.c:92-94`, `hid_handler.c:53`, `xpt2046.c:89-92` take one sample per host poll.
- [ ] **GFW-06 [P2] No protocol version / sequence** → **Revised: absorbed by LINK-01 (spec) + SCR-09 (`glyf_link_handle` dispatch).**
- [ ] **GFW-07 [P2] USB endpoint interval** → **Revised: priority raised from P3.** `usb_descriptors.c:77` has `bInterval = 10` ms, so a 512-byte scene upload takes ~200 ms instead of ~20 ms. Set `bInterval = 1`, and use the same setting in QMK (`RAW_POLLING_INTERVAL` default is 1; verify).
- [ ] **GFW-08 [P3] Leading-0x00 stripping heuristic** → **Revised: removed by v2 framing** (magic byte; the host writes the report ID). Delete `main.c:34-41` in SCR-09.
- [ ] **GFW-09 [P3] Backlight PWM**
  - `st7796s.c:127-130`: wrap 255 with clkdiv 1 gives ~488 kHz PWM. Target 1-25 kHz, and map 255 → wrap+1.
  - `set_power(false)` leaves the backlight on. Drive PWM to 0.
  - Move this into the shared panel HAL.
- [ ] **GFW-10 [P3] Robustness nits**
  - GET_REPORT should copy `min(reqlen, 32)`.
  - The renderer's clipping replaces `fill_rect`/`blit` bounds math.
  - Raise `bMaxPower` above 100 mA; a 3.5" backlight plus the MCU needs more.
  - Add a watchdog (`watchdog_enable` + `watchdog_update` in the main loop).
  - Fix the `xpt2046.c:6` channel-map comment.
  - Send raw Z1/Z2 or compute pressure in integers.
- [ ] **GFW-11 [P3] Flash/build scripts**
  - `build.sh:37-42`: add `pipefail`, drop the `grep`, and drop `--fresh` (or raise the CMake minimum to 3.24).
  - `flash-picotool.sh:25` needs a reset interface. The `REBOOT_BOOTLOADER` command (LINK-01) calls `reset_usb_boot(0, 0)`.
  - `flash-uf2.sh:9`: detect the mount point per OS or allow an env override.
  - `docs/glyf.md:51` DMA claim: true after SCR-09.
- [ ] **GFW-12 [P3] CI firmware build** — install `gcc-arm-none-eabi`, check out pico-sdk at the pinned version, and run `domains/glyf/display/build.sh` (now including `glyf-core`). Part of the X-02 `firmware` job.

### B.4 Tests for glyf

- [ ] **GL-T1 [P3]** → **Revised: the device-thread tests are absorbed by LINK-02.** Remaining:
  - a `tempfile`-based test for `storage.rs` with a corrupt file (GL-03);
  - a provider hydration test with mocked `@tauri-apps/api` (GL-12).

---

## 11. Verified-correct (no action)

- **Rust ↔ firmware v1 wire format** matches byte for byte, for both devices:
  - Macro Eleven: VID `0x4653`, PID `0x0002`, usage page `0xFF60`.
    - Request `[report_id=0, 0x01]`; test-mode `[0, 0x02, enable]`.
    - Response `[0x01, key_lo, key_hi, pot_lo, pot_hi, layer, test_mode]`.
    - Added after the audit (b8627c7): `0x03 GET_INFO` → `[0x03, proto=1, major, minor, patch]` and `0x04 ENTER_BOOTLOADER` `[0x04, 'B','O','O','T', flags]` → `[0x04, 1]`, handled in `macro_eleven.c` for every keymap. The v1 adapters must keep these too.
  - Glyf: PID `0x0003`. Commands `0x01`-`0x04` and the big-endian state report match `hid_handler.c:55-66`.
  - The v1 adapters in LINK-02 must preserve this exactly.
- **Key index order** matches across firmware `matrix_map` (`apps/keymap.c:369-373`), Rust `index_to_position` (`keymap_engine.rs:179-186`), and TS `matrixToIndex` (`entities/key.ts:53-57`). The SCR-01 tile order must use the same order.
- **Multiple `HidApi::new()` instances** are allowed by `hidapi 2.6.5` (global C init once).
- **No lock-order deadlock exists today.** The problem is a stall, not a deadlock (ME-02).
- **Default keymaps:** `default_keymap.json` and `MACRO_ELEVEN_DEFAULT_KEYMAP` are identical apart from `metadata.createdAt`.
- **Display constants:** TS 480×320 matches the firmware's `TFT_WIDTH`/`TFT_HEIGHT` (`pinout.h:71-72`). This is the canonical landscape resolution for SCR layouts.

## 12. Decisions

Answered (2026-09-24):
- A screen arrives in rev 2 for **both** Macro Eleven and the Glyf display, via a shared implementation.
- Panel: **ST7796S 480×320** for both.
- Firmware stack: **stay on C** (QMK / Pico SDK). The device renders from a compact host scene; the app mirrors it with the same C code.
- Shared UI package: **yes** (X-01 now required).

Open:
1. Firmware default when no host is running: standalone keymap (recommended) or host-only? (FW-01)
2. Keep firmware Spotlight app launching (FW-06), or rely on host mode only?
3. Which physical key is top-left, and which key should be bootmagic? (FW-08; affects the SCR-01 tile order)
4. Which keymap-management commands should the Keymap Designer use? (ME-12)
5. Ship simulator ("Demo") mode in production builds? (LINK-05)
6. What should the Glyf display show by default, and what should tile taps do? (SCR-05)
7. Rev 2 pin plan for display SPI, DC, RST, BL, touch CS/IRQ on each board (SCR-09 placeholders until decided).
8. Screen font: Inter, to match the apps (default), or another?
