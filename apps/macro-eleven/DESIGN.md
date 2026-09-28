---
name: Macro Eleven
description: The companion app for the Macro Eleven macropad; a dark Mac app that draws the pad the same way everywhere.
colors:
  primary: "oklch(0.7 0.15 162)"
  primary-foreground: "oklch(0.26 0.05 173)"
  warning: "oklch(0.82 0.14 80)"
  destructive: "oklch(0.704 0.191 22.216)"
  background: "oklch(0.145 0 0)"
  card: "oklch(0.205 0 0)"
  popover: "oklch(0.205 0 0)"
  foreground: "oklch(0.985 0 0)"
  muted: "oklch(0.269 0 0)"
  muted-foreground: "oklch(0.708 0 0)"
  secondary: "oklch(0.274 0.006 286.033)"
  accent: "oklch(0.371 0 0)"
  border: "oklch(1 0 0 / 10%)"
  input: "oklch(1 0 0 / 15%)"
  ring: "oklch(0.556 0 0)"
  glass-tint: "oklch(0.145 0 0 / 0.3)"
  glass-well: "oklch(0 0 0 / 0.22)"
  glass-edge: "oklch(1 0 0 / 0.1)"
  glass-hover: "oklch(1 0 0 / 0.1)"
  glass-press: "oklch(1 0 0 / 0.16)"
  chrome-panel: "oklch(0.218 0 0 / 0.82)"
  chrome-capsule: "oklch(0.289 0 0 / 0.72)"
  chrome-capsule-hover: "oklch(0.33 0 0 / 0.76)"
  chrome-capsule-press: "oklch(0.37 0 0 / 0.8)"
  chrome-highlight: "oklch(1 0 0 / 0.09)"
  chrome-edge: "oklch(1 0 0 / 0.06)"
  chrome-shadow: "oklch(0 0 0 / 0.6)"
  chrome-well: "oklch(1 0 0 / 0.05)"
  chrome-hover: "oklch(1 0 0 / 0.05)"
  chrome-selection: "oklch(1 0 0 / 0.12)"
  keycap-edge-top: "oklch(0.36 0 0)"
  keycap-edge-bottom: "oklch(0.2 0 0)"
typography:
  window-title:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "19px"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "18px"
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  label:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  footnote:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "15px"
  shortcut:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.08em"
  key-legend:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "clamp(10px, calc(var(--key) * 0.15), 13px)"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "3.2px"
  md: "5.2px"
  lg: "7.2px"
  xl: "11.2px"
  row: "7px"
  sidebar-well: "10px"
  group: "10px"
  tip-well: "12px"
  pad-well: "14px"
  overlay: "16px"
  panel: "18px"
  full: "9999px"
spacing:
  panel-inset: "6px"
  chrome-inset: "8px"
  gutter: "24px"
  sidebar-row-height: "28px"
  toolbar-height: "52px"
  row-inline: "10px"
  row-height: "26px"
  group-gap: "6px"
  settings-row-inline: "12px"
  settings-row-block: "10px"
  pane-inline: "24px"
  pane-top: "20px"
components:
  panel-surface:
    backgroundColor: "{colors.glass-tint}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
    width: "320px"
  panel-surface-solid:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
  panel-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "0 10px"
    height: "{spacing.row-height}"
  panel-row-hover:
    backgroundColor: "{colors.glass-hover}"
  panel-row-active:
    backgroundColor: "{colors.glass-press}"
  panel-well:
    backgroundColor: "{colors.glass-well}"
    rounded: "{rounded.pad-well}"
    padding: "12px 12px 10px"
  close-tip:
    backgroundColor: "{colors.glass-well}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.tip-well}"
    padding: "12px"
  settings-group:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.group}"
  settings-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    padding: "10px 12px"
  toolbar-pane:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    width: "72px"
    height: "48px"
  toolbar-pane-selected:
    textColor: "{colors.foreground}"
  segmented-choice:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
    padding: "2px"
    height: "28px"
  segmented-choice-selected:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  switch-on:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "18px"
  switch-off:
    backgroundColor: "{colors.input}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "18px"
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "4px"
    size: "14px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "24px"
    padding: "0 10px"
  sidebar-panel:
    backgroundColor: "{colors.chrome-panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "44px 10px 10px"
    width: "232px"
  sidebar-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.row}"
    padding: "0 8px 0 10px"
    height: "{spacing.sidebar-row-height}"
  sidebar-row-hover:
    backgroundColor: "{colors.chrome-hover}"
  sidebar-row-selected:
    backgroundColor: "{colors.chrome-selection}"
  sidebar-badge:
    backgroundColor: "{colors.chrome-selection}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "0 7px"
    height: "18px"
  sidebar-well:
    backgroundColor: "{colors.chrome-well}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sidebar-well}"
    padding: "0 8px 0 10px"
    height: "48px"
  sidebar-well-hover:
    backgroundColor: "{colors.glass-hover}"
  sidebar-well-open:
    backgroundColor: "{colors.chrome-selection}"
  toolbar:
    height: "{spacing.toolbar-height}"
    padding: "0 {spacing.gutter}"
  toolbar-title:
    textColor: "{colors.foreground}"
    typography: "{typography.window-title}"
    rounded: "{rounded.md}"
  toolbar-capsule:
    backgroundColor: "{colors.chrome-capsule}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    padding: "0 14px 0 12px"
    height: "34px"
  toolbar-capsule-hover:
    backgroundColor: "{colors.chrome-capsule-hover}"
  toolbar-capsule-press:
    backgroundColor: "{colors.chrome-capsule-press}"
  toolbar-group:
    backgroundColor: "{colors.chrome-capsule}"
    rounded: "{rounded.full}"
    padding: "0 3px"
    height: "34px"
  toolbar-button:
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "28px"
  toolbar-button-hover:
    backgroundColor: "{colors.glass-hover}"
  toolbar-button-press:
    backgroundColor: "{colors.glass-press}"
  inspector-panel:
    backgroundColor: "{colors.chrome-panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
    width: "288px"
  keycap:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.key-legend}"
    rounded: "calc(var(--key) * 0.12)"
    size: "var(--key)"
---

# Design System: Macro Eleven

## Overview

**Creative North Star: "The Pad on the Desk"**

Macro Eleven is a dark Mac app whose one real object is the pad. The same drawing of it (keycaps on a chassis, sized from one length) appears in the designer, the overlay, Diagnostics, and the menu bar panel, and everything around it behaves like macOS: a menu bar extra, a Settings window with toolbar panes, grouped rows, native fades. The designer window is drawn the macOS 26 way: a glass sidebar and inspector inset from the window edge, toolbar controls as glass capsules floating over the content. The chrome stays quiet and neutral so the keys, and the moment one lights under your finger, carry the screen.

Two materials meet here. Floating functional layers (the menu bar panel, the overlay background) are native glass drawn by macOS, and the designer window's panels and capsules are the webview's own drawing of that glass; the pad and its keycaps are solid, lit-from-above objects that sit on it as content. Density is Mac-menu density: 13 px text, 26 px rows, hairline separators. Code map and window behavior live in [CLAUDE.md](CLAUDE.md#ui); product principles in [PRODUCT.md](PRODUCT.md).

**Key Characteristics:**
- Dark only (`dark` class on every window); neutral greys with zero chroma.
- One green accent, hue 162 to 163, that always means state.
- Native Liquid Glass for floating layers, drawn glass panels and capsules for the designer window's chrome, solid chassis everywhere else; Reduce Transparency turns glass solid.
- One pad look, scaled from `--key`.
- Springs for interruptible motion, short ease-out fades for everything else, native window fades on the host.

### Motion

Springs for anything the user can interrupt; short ease-out fades for everything that simply appears. The shared curve is a strong ease-out (`cubic-bezier(0.23, 1, 0.32, 1)`), the same on the web side and in AppKit. Exits are shorter than entrances. Exact values are in the sidecar; code in `shared/lib/motion.ts`, `App.css`, and `src-tauri/src/shell/`.

- **Default spring:** no bounce, 300 ms; selection indicators (Settings toolbar panes, segmented choice), sheets, sidebar sections collapsing and opening (height and opacity), a new layer row easing in from 6 px left. Momentum spring (0.2 bounce, 400 ms) only after a drag or throw.
- **The authored moment:** when the pad changes layer on its own, the green live dot glides from one layer row to the next on the default spring. It is the one thing in the sidebar that moves by itself; everything else in the chrome stays still or fades.
- **Sidebar selection:** instant, no animation, as in a Mac source list; it follows clicks and ⌘-number dozens of times a day.
- **Label swap:** a short status label that changes in place (connection, save, firmware percentage, the toolbar subtitle) crossfades through a 2 px blur so it reads as one label changing.
- **Pop:** small marks that come and go (the firmware badge, the live dot) scale from 60% with the crossfade; small things start further from full size than large ones.
- **Page switches:** the outgoing page fades out in 100 ms while the new one crossfades in over 150 ms.
- **Presses:** capsules give to 97%, the profile well to 98%, sidebar heading actions to 92%, all 150 ms ease-out. A dragged layer row lifts to 102% with a soft shadow.
- **Scroll edges:** a scroller's faded edge grows in over 180 ms as scrolling starts instead of snapping on.
- **Connect ring:** when the pad connects, its dot sends out one ring (to 3× and transparent, 700 ms); Reduce Motion keeps the dot and drops the ring.
- **Floating surfaces:** fade and scale from 96%, 160 ms in, 110 ms out, anchored at the trigger. Reduce Motion keeps the fade and drops the scale.
- **Content swaps:** opacity only, 150 ms; Settings panes fade in over 180 ms after 40 ms and out in 100 ms while the native window resizes over 240 ms with its top edge still.
- **Native windows:** the panel fades in over 120 ms and out over 100 ms while its content settles 6 px toward the icon (260 ms); the idle overlay fades to 35% over 600 ms and returns in 120 ms; Reset position and size glides the overlay home in 350 ms.

**The Interruptible Rule.** Anything the user can retarget mid-flight moves on a spring from its current value; nothing overshoots unless force preceded it.

## Colors

A zero-chroma dark neutral ramp with a single green for state and an amber for warnings.

### Primary
- **Signal Green** (primary): the only accent. It marks state: the connected dot, the lit keycap, the active profile's check, the live layer dot and pip, the Overlay capsule's icon while the overlay is up, a switch or checkbox that is on, the recorder while recording, the pad glyph in the first-close tip. The primary button uses it for the one committing action on a page. Dark text on green uses **Deep Green Ink** (primary-foreground).

### Secondary
- **Caution Amber** (warning): inline warnings only, such as the Accessibility notice icon in the panel. Never a fill for a whole surface.
- **Error Red** (destructive): failures (keymap could not load, rejected shortcut) and destructive buttons.

### Neutral
- **Night** (background): window background, the solid overlay chassis's lower stop, the switch thumb.
- **Graphite** (card, popover): keycap faces, settings groups (at 70% over Night), the solid panel under Reduce Transparency.
- **Paper White** (foreground): all primary text. On glass it stays at full strength; secondary text on glass steps down with foreground opacity (75%, 65%, 55%) rather than grey tokens.
- **Slate** (muted) and **Ash** (muted-foreground): segmented-control track; help text, shortcut glyphs, unselected tabs.
- **Zinc** (secondary): the secondary button fill ("Got it"). It carries a trace of hue 286 inherited from the shadcn base; treat it as neutral.
- **Hairline** (border, 10% white) and **Field Edge** (input, 15% white): row dividers, group outlines, unchecked switch track, checkbox edge.
- **Chrome tints** (designer window): chrome-panel is the fill of the inset sidebar and inspector panels, chrome-capsule (with its hover and press steps) the fill of toolbar capsules. chrome-highlight is the hairline of light along a panel's top, chrome-edge its 1 px outline, chrome-shadow the soft shadow beneath panels, capsules, and a lifted row. On a panel, chrome-well fills the profile well, chrome-hover highlights a row under the pointer, and chrome-selection marks the selected row, an open profile menu, and a badge.
- **Glass tints**: glass-tint darkens the panel's glass so white text holds over bright desktops; glass-well is the recessed fill for the pad module and the tip; glass-edge is the 1 px inner outline of a well and the panel's separator; glass-hover and glass-press are row highlights.

### Named Rules
**The Green Means State Rule.** Green appears only where something is on, live, connected, or pressed. Notices, tips, and decoration stay neutral; the first-close tip is a neutral well, green only on its pad glyph.

**The Tint, Not Glass Rule.** On a glass window or glass panel, wells and hover fills are tints (glass-well, glass-hover, glass-press, chrome-well, chrome-hover, chrome-selection). Never stack a second blurred layer on glass.

## Typography

**Body Font:** Inter Variable (with sans-serif). One family for everything, including shortcut glyphs.

**Character:** System-sized, Mac-menu Inter: 13 px for anything you read or click, 12 and 11 px for what explains it. Weight, not size, makes hierarchy.

### Hierarchy
- **Window Title** (600, 15 px, 19 px, -0.01em): the layer name in the designer toolbar, the one line that names the window's content.
- **Title** (600, 13 px, 18 px): the panel's name, window titles, the tip's heading.
- **Body** (400, 13 px, 18 px): panel rows, settings row labels.
- **Caption** (400, 12 px, 16 px): connection status, second lines of panel notices, the pad module footer (layer name at 500), the Follow the front app row.
- **Label** (600, 11 px): group headings over panel sections, settings groups, and sidebar sections ("Layers", sentence case, at 50% foreground), toolbar pane names (500), sidebar badges (500).
- **Footnote** (400, 11 px, 15 px): one line of help under a settings row or group; at 14 px line height, the toolbar subtitle and the second line of both sidebar wells.
- **Shortcut** (400, 12 px, 0.08em tracking): key glyphs at the right of a row, as macOS menus set them.
- **Key Legend** (500, 10 to 13 px following `--key`): labels printed on keycaps; the longest word shrinks the label to fit, down to 9 px, then it hyphenates.

### Named Rules
**The Mac Menu Case Rule.** Commands use Title Case, and a command that opens more UI ends in an ellipsis ("Settings…", "Update Firmware…", "Allow Accessibility Access…"). Headings, help, and option labels use sentence case. No uppercase tracked labels.

## Layout

The panel is 320 pt wide, 6 px inner inset, and sizes its height to its content. Order: title row (32 px), optional tip, the pad module full width (keys fill 4.3 key widths, capped at 60 px), notice rows, profile rows, a hairline, the overlay switch row, a hairline, then Open Designer, Settings…, Quit. Rows are 26 px with 10 px side padding; hairlines inset 10 px.

Settings is 560 pt wide. Header: a 28 px title bar showing the pane's name, then a centered toolbar of 72 × 48 px pane buttons (icon over label). Panes pad 24 px at the sides, 20 px top, 24 px bottom. Groups stack with a heading 6 px above and a footnote 6 px below. A row is label and help on the left, control on the right, 24 px gap, 10 px vertical padding; hairlines start at the text.

The designer window (overlay title bar) is a 232 px glass sidebar inset 8 px from the window edge and a content column with a 52 px toolbar floating over its top. The chrome geometry lives in three tokens in `App.css`: `--spacing-chrome` (8 px panel inset), `--spacing-toolbar` (52 px), and `--spacing-gutter` (24 px).

- **Window buttons** sit at 18, 28 in `tauri.conf.json`. Their left edge lines up with the sidebar's rows and wells (8 px inset plus 10 px padding). Their centre sits on the toolbar's centre line, level with the title and the capsules.
- **Sidebar:** its top strip holds the window buttons and drags the window. Its content starts where the toolbar ends: the 48 px profile well, a scrolling middle with the Layers and Device sections (28 px rows, 1 px apart, 16 px between sections), and the device well at the foot. Both wells are the same tile; their pad glyphs line up with the rows' icons.
- **Toolbar:** content-column gutter on both sides. Layer title and subtitle at the start, then save status, the undo and redo capsule, and the Overlay capsule, 8 px apart. Its empty space drags the window too.
- **Content** starts below the toolbar, so nothing sits under it at rest; scrolling pages fade out beneath it. Pages keep the same 24 px gutter, so page content ends under the capsules.
- **Inspector:** a 288 px glass panel that starts below the toolbar (level with the profile well) and sits 8 px in from the window's right and bottom. Its 16 px padding puts its content on the gutter, under the capsules; nothing floats over it. The pad and its footer centre on the panel.
- **Inspector sheet** (too little room for the panel): a glass panel 8 px in from the content column's sides and the window foot, so its content also sits on the gutter. It slides out of sight at that inset.

The pad is laid out from one length, `--key`: gaps 0.1 key, chassis inset 0.22 key, cap corners 0.12 key. Hosts only choose `--key` (the overlay fits it to its window, the panel to its width). Window sizes and the designer's breakpoints are in [CLAUDE.md](CLAUDE.md#ui).

**The Inset Chrome Rule.** Designer panels float 8 px in from the window edge and each other; they never run edge to edge or share a divider with the content. Nothing floats over a panel's edge: a control either sits inside a panel's padding or clear of it.

**The One Length Rule.** Every pad dimension derives from `--key`. Never size a keycap, gap, or legend in fixed pixels.

## Elevation & Depth

Depth comes from material first and shadow second. Native glass (Liquid Glass on macOS 26, HUD vibrancy before) floats the panel and overlay; the page on top of it paints only tints. In the designer window, the sidebar and inspector are drawn glass panels (chrome-panel fill, no blur) lifted by light and shadow, and toolbar capsules are the one blurred chrome (16 px blur, 160% saturate) because content scrolls beneath them. The inspector sheet uses `material-raised` (92% card, 30 px blur). Under Reduce Transparency, panels paint Graphite and capsules paint Zinc with no blur. Both fall back to opaque color under Reduce Transparency, and the host draws no glass then either: the panel paints popover with a 1 px border inset, the overlay paints the chassis gradient.

Shadows belong to physical objects. The keycap is lit from above with a bevel gradient edge; the chassis casts one long soft shadow. Chrome panels and capsules carry a lit edge rather than a divider: a 1 px top highlight, a 1 px outline, and one soft shadow below. Other chrome controls use only shadcn's hairline `shadow-xs`/`shadow-sm` (switch thumb, selected segment).

### Shadow Vocabulary
- **Keycap rest** (`0 1px 1px oklch(0 0 0 / 0.35), 0 6px 12px -4px oklch(0 0 0 / 0.45), inset 0 1px 0 oklch(1 0 0 / 0.07)`): every key at rest.
- **Keycap lit** (`0 0 0 1px primary at 60%, 0 2px 10px -2px primary at 45%`): a key that is physically held. The only glow in the system.
- **Chassis** (`0 24px 48px -24px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.05)`): the pad plate.
- **Well edge** (`inset 0 0 0 1px glass-edge`): recessed wells on glass, the pad glyph tile.
- **Glass panel** (`inset 0 1px 0 chrome-highlight, 0 0 0 1px chrome-edge, 0 16px 32px -16px chrome-shadow`): the sidebar and inspector panels.
- **Glass capsule** (`inset 0 1px 0 oklch(1 0 0 / 0.1), 0 0 0 1px oklch(1 0 0 / 0.07), 0 6px 16px -6px chrome-shadow`): toolbar capsules.
- **Row lift** (`0 10px 24px -10px chrome-shadow`): a layer row while it is dragged.

**The Lit Key Rule.** Only a pressed keycap glows. Status dots, pips, and switches are flat color; the connect ring is one fading pulse on arrival, never a resting glow.

**The Lit Edge Rule.** In the designer window, no divider lines: a panel's edge is a hairline of light on top and a soft shadow below.

## Shapes

Corners follow macOS: 18 px for the panel window, 16 px for the overlay window (the macOS 26 window corner), 14 px for the pad well, 12 px for the tip well, 11.2 px for the designer's glass panels, 10 px for settings groups and the sidebar wells, 7 px for menu and sidebar rows, full pills for toolbar capsules and sidebar badges, and the shadcn scale from `--radius` (0.45rem) for controls. Wells nest: each inner radius is smaller than its container. Keycap corners are 0.12 key, and the chassis corner is the cap corner plus the inset, so the curves stay concentric. Empty keys are a dashed Hairline outline with no fill. Status dots, the live layer dot, and layer pips are 6 px circles (4 px in the overlay).

## Components

### Buttons
Quiet and small; menus and rows do most of the clicking.
- **Shape:** gently rounded (5.2 px).
- **Primary:** Signal Green with Deep Green Ink, 36 px tall; for the committing action on a designer page.
- **Secondary:** Zinc fill, 24 px compact size for in-well actions ("Got it").
- **Hover / Focus:** fill steps to 80 to 90%; focus shows a 3 px ring at 50% ring.

### Panel rows
Menu items, not buttons.
- **Style:** 26 px, 7 px corners, 13 px text, optional shortcut glyphs right-aligned.
- **States:** highlight appears under the pointer at once (glass-hover), no transition; glass-press on mouse down; keyboard focus shows the same highlight. Arrow keys, Home, and End move between items.
- **Notice rows:** two lines, a 16 px drawn icon (warning icon in Caution Amber, update icon in foreground at 70%), Title Case command with an ellipsis, a 12 px explanation below.
- **Profile rows:** a 14 px check in Signal Green on the active profile; others keep the space empty so names align.

### Wells (pad module, first-close tip)
- **Corner Style:** 14 px (pad), 12 px (tip).
- **Background:** glass-well with a glass-edge inner outline.
- **Tip:** shown once; heading, one sentence, an Open at login checkbox, and a secondary "Got it". Expands and collapses in 220 ms height and opacity.

### Settings groups and rows
System Settings grouped forms.
- **Group:** Graphite at 70% with a Hairline border, 10 px corners, clipped.
- **Row:** label left, control right, one line of footnote help; disabled rows drop the text to 45% opacity.

### Toolbar panes
- **Style:** 20 px line icon (1.75 stroke) over an 11 px label, muted until selected.
- **Selected:** foreground text on an 8% foreground fill that slides between panes on the default spring. Pressing scales the icon to 95%.

### Segmented choice
- **Track:** Slate, 28 px, 2 px inset, 7.2 px corners.
- **Selected:** a raised segment (foreground at 16% with a small shadow) that slides on the default spring.

### Switch and checkbox
- **Switch:** 32 × 18 px pill, Signal Green on, Field Edge off; the 16 px Night thumb travels 14 px in 200 ms ease-out (no travel under Reduce Motion).
- **Checkbox:** 14 px, 4 px corners; checked is Signal Green with a heavy check. Used for inline opt-ins beside their label.

### Keycap and pad (signature)
- **Keycap:** Graphite face with a 3% highlight toward the top, a bevel edge from keycap-edge-top to keycap-edge-bottom, keycap rest shadow.
- **Pressed:** face mixes 24% Signal Green, the edge turns green, the key sinks 1 px and scales to 97%, keycap lit shadow. The panel and overlay light keys from live input with no delay.
- **Interactive:** scales to 97% on pointer down, 100 ms.
- **Legend:** app or shortcut top left in Ash, label bottom left, a kind glyph bottom right. A layer change cross-fades the legends in 150 ms.
- **Chassis:** Graphite to Night gradient, Hairline border, chassis shadow. In the overlay the window itself is the chassis.

### Sidebar (designer window)
A Mac source list on a glass panel.
- **Profile well:** 48 px, chrome-well fill, 10 px corners: the pad glyph tile (30 px, Night with a well edge), the profile's name (13 px semibold), "Profile · N layers" below (a lock and "Read-only" for built-in profiles), up-down chevrons. Opens the profile menu; open, it holds chrome-selection.
- **Sections:** a sentence-case heading at 50% foreground collapses its section; its chevron shows on hover or focus and stays while collapsed so the way back is visible. The state is remembered. A heading may end in a 20 px icon action (add a layer).
- **Rows:** 28 px, 7 px corners, a 16 px icon lane (icons 15 px at 75% foreground; a layer's trigger app icon at 18 px), the label, then trailing marks in fixed lanes so labels and shortcuts align. Hover is chrome-hover, selected is chrome-selection, both instant.
- **Layer rows:** trigger app icon (or a grid glyph), name, the green live dot lane, ⌘-number in shortcut type at 45%. Base layer first and fixed; drag or ⌥↑/⌥↓ reorders the rest. Right-click, double-click, or Return opens the layer's settings beside the row. Under the list, a "Follow the front app" switch row in caption type at 60%.
- **Badges:** an 18 px chrome-selection pill in 11 px medium, tabular figures ("Update", then the percentage while firmware installs).
- **Device well:** at the foot, the same well as the profile's (`SIDEBAR_WELL`): pad glyph tile, "Macro Eleven", and a status line with a 6 px dot (Signal Green connected, Ash not) and a label that swaps in place. It is the window's only connection status.

### Toolbar and capsules (designer window)
- **Title:** the layer name in window-title type with a small chevron; it opens the layer settings popover under the title block. Below, an 11 px subtitle in Ash saying how the pad reaches the layer, with a live dot and "Live on the pad" while it is there.
- **Capsules:** a labelled button is a 34 px glass capsule of its own (13 px medium, 16 px icon); related icon buttons share one capsule (undo and redo, 32 × 28 px buttons with glass-hover and glass-press fills). Disabled buttons stay focusable at 35% and keep their tooltip.
- **Overlay capsule:** its icon is Signal Green while the overlay is up.
- **Save status:** "Saved" with a check in Ash for 1.2 s after each save; a failure stays as "Not saved. Retry" in Error Red.

### Inspector panel
The inspector beside the pad is a 288 px glass panel below the toolbar. Narrow windows use the inset sheet instead.

### Shortcut recorder
A System Settings recorder field; "Click to record" in Ash, "Recording…" in Signal Green; rejected chords explain themselves in Error Red below.

## Do's and Don'ts

### Do:
- **Do** follow macOS first: menu bar extra, Settings… ⌘, in the app menu, toolbar panes, grouped rows, close hides and never quits.
- **Do** draw the pad with `MacropadGrid`, `Keycap`, and `pad.css`, sized by `--key` alone.
- **Do** keep text on glass at full strength and step secondary text down with foreground opacity.
- **Do** give every glass surface its solid fallback for Reduce Transparency, and every motion a Reduce Motion path (fade only or none).
- **Do** build designer chrome from the glass panel and capsule utilities and the sidebar and toolbar parts in `shared/ui/`, inset 8 px from the window.
- **Do** keep sidebar selection instant; save motion for the live dot and for things that appear.
- **Do** use 16 px drawn icons in notice rows, colored by meaning (Caution Amber for warnings, foreground at 70% for neutral news).

### Don't:
- **Don't** use green for anything that is not state: no green tips, banners, or decoration.
- **Don't** add a glow outside the pressed keycap; status dots stay flat (the connect ring plays once and is gone).
- **Don't** draw divider lines in the designer window's chrome; panels separate by inset, light edge, and shadow.
- **Don't** layer a blurred material on top of native glass; use the glass tints.
- **Don't** set labels in uppercase with wide tracking; headings are sentence case at 11 px semibold.
- **Don't** use raw colors; every color comes from the tokens in `src/app/App.css`.
