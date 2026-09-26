---
version: 1
slug: "src-features-menu-bar-panel-panelview-tsx"
primary_target: "src/features/menu-bar-panel/PanelView.tsx"
related_targets: ["src/features/settings/SettingsView.tsx","src/features/overlay/OverlayView.tsx"]
---

# Surface brief: menu bar panel, Settings window, overlay glass

Scope: the macOS shell around the engine. The menu bar panel (`#/panel`), the Settings window (`#/settings`), and the overlay's glass background (`#/overlay`). Mode: Operate. An extension inside the established world (dark UI, green primary, Inter, one pad look).

Audience and job: people new to the pad. They close the window and expect the keys to keep working; they come back through the menu bar icon to check the pad, switch a profile, show the overlay, or change a setting. Frequency: the panel a few times a day, Settings rarely.

Constraints: macOS conventions win (menu bar extra, ⌘, Settings, close keeps running, Quit from the icon). Reduce Motion, Reduce Transparency, and keyboard use must work. Never stop the engine by accident.

## Direction contract

THESIS: The menu bar panel is the pad at a glance: a Liquid Glass sheet that drops from its icon and leads with the live pad, lit as you press. It refuses the default popover that is a list of text rows. Settings is a native toolbar-pane window, not a web settings page.

OWN-WORLD: Liquid Glass for the floating functional layer only (panel, overlay background); solid keycaps from `Keycap` sit on it as content. Neutral dark tint, one green accent for state (connected, active profile, switches on). System-Settings grouped forms: rounded groups, hairline row dividers, label left, control right, one line of help below.

STORY: The user sees the pad and its state first (connected, layer, what each key does), then acts in one click (profile, overlay), then leaves (Open Designer, Settings, Quit). A first close teaches once where the app went and offers Open at Login.

FIRST VIEWPORT: Panel 320 pt wide under the icon. Title row (name, status). The pad module, full width, keys about 56 pt, layer name and pips below. Profile rows with a check. Overlay switch row. Hairline. Open Designer, Settings…, Quit.

FORM: Control Center-style menu for the panel; SwiftUI-style Settings with toolbar panes and animated window height. No concept roll: the request and macOS conventions specify the structure. seed: waived (Operate-mode extension of an established world; HIG sets the form; waiver recorded at the 2026-09-26 finish review).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: the panel materializes from the icon (window fade with a small settle toward the icon), the key you press lights in the panel at once, and a layer change cross-fades the legends. Settings panes resize the window natively, anchored at the top, while content cross-fades.

Unresolved: none.
