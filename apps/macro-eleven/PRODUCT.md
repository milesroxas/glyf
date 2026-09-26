# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A Tauri v2 desktop app for macOS. The UI is React in a WebKit webview, and it follows macOS conventions (menu bar extra, Settings window, window behavior) rather than web conventions.

## Users

People new to the Macro Eleven pad: they plug it in, assign apps, shortcuts, and macros to its eleven keys, and then use it all day without opening the app. Design for someone who has never used a macropad companion before. The maker also uses it every day, so power-user controls stay available.

## Product Purpose

Macro Eleven is the companion app for the Macro Eleven macropad (eleven keys and a knob, USB). The host runs every key action: it opens apps, sends shortcuts, plays macros, and switches layers when the front app changes. The knob sets the system volume. The app also shows live input and updates the pad's firmware.

The pad does nothing unless the app is running, so the app must stay running after its window closes. Success: the user sets the pad up once, the app stays out of the way in the menu bar, and the keys always work.

## Positioning

The host, not the firmware, runs the actions, so a key can do anything the Mac can do, and edits reach the pad at once. The same drawing of the pad appears in the designer, the overlay, and Diagnostics.

## Operating Context

- The pad sits on the desk next to the keyboard. The user presses keys while working in other apps, so the app is rarely frontmost.
- The designer is opened occasionally to change keys. Daily use is the pad itself, the overlay, and the menu bar.
- The overlay is a small always-on-top window drawn as the pad, over whatever the user is working in.
- Shortcuts and macros need macOS Accessibility permission. Without it they fail.

## Capabilities and Constraints

- Keymaps are profiles. One is active; Default is read-only. Layers can follow the front app.
- Firmware updates ship bundled in the app.
- Release builds are signed with a Developer ID, not distributed through the Mac App Store.
- Macro Eleven is an R&D prototype in the Glyf product line (see `docs/product-line.md`). The name is not a long-term product name.

## Brand Commitments

- Dark theme, green primary (hue 163), Inter.
- One pad look everywhere: `MacropadGrid`, `Keycap`, and `pad.css`.

## Evidence on Hand

No testimonials, press, or usage data exist. Do not invent any.

## Product Principles

1. The keys must keep working. Nothing in the UI may stop the engine by accident.
2. Stay out of the way. The app lives in the menu bar and speaks up only when the user needs to act.
3. Teach once, at the moment it matters, then never again.
4. Behave like a Mac app: familiar controls, familiar places, immediate feedback.

## Accessibility & Inclusion

Honor Reduce Motion, Reduce Transparency, and Increase Contrast. Every control works from the keyboard.
