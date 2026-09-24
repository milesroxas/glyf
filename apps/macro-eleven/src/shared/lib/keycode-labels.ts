// Map QMK keycodes to human-readable labels.
// Handles basic keycodes, modifiers, and common modifier combos.

const BASIC_KEYCODES: Record<string, string> = {
  KC_A: "A",
  KC_B: "B",
  KC_C: "C",
  KC_D: "D",
  KC_E: "E",
  KC_F: "F",
  KC_G: "G",
  KC_H: "H",
  KC_I: "I",
  KC_J: "J",
  KC_K: "K",
  KC_L: "L",
  KC_M: "M",
  KC_N: "N",
  KC_O: "O",
  KC_P: "P",
  KC_Q: "Q",
  KC_R: "R",
  KC_S: "S",
  KC_T: "T",
  KC_U: "U",
  KC_V: "V",
  KC_W: "W",
  KC_X: "X",
  KC_Y: "Y",
  KC_Z: "Z",
  KC_1: "1",
  KC_2: "2",
  KC_3: "3",
  KC_4: "4",
  KC_5: "5",
  KC_6: "6",
  KC_7: "7",
  KC_8: "8",
  KC_9: "9",
  KC_0: "0",
  KC_ENT: "Enter",
  KC_ESC: "Esc",
  KC_BSPC: "Bksp",
  KC_TAB: "Tab",
  KC_SPC: "Space",
  KC_MINS: "-",
  KC_EQL: "=",
  KC_LBRC: "[",
  KC_RBRC: "]",
  KC_BSLS: "\\",
  KC_SCLN: ";",
  KC_QUOT: "'",
  KC_GRV: "`",
  KC_COMM: ",",
  KC_DOT: ".",
  KC_SLSH: "/",
  KC_UP: "Up",
  KC_DOWN: "Down",
  KC_LEFT: "Left",
  KC_RIGHT: "Right",
  KC_MPRV: "Prev",
  KC_MNXT: "Next",
  KC_MPLY: "Play",
  KC_VOLU: "Vol+",
  KC_VOLD: "Vol-",
  KC_MUTE: "Mute",
  KC_NO: "---",
  KC_TRNS: "___",
};

const MOD_LABELS: Record<string, string> = {
  LGUI: "Cmd",
  RGUI: "Cmd",
  LSFT: "Shift",
  RSFT: "Shift",
  LCTL: "Ctrl",
  RCTL: "Ctrl",
  LALT: "Alt",
  RALT: "Alt",
};

/**
 * Convert a QMK keycode string to a human-readable label.
 * Handles patterns like:
 * - KC_A → "A"
 * - LGUI(KC_T) → "Cmd+T"
 * - LGUI(LSFT(KC_T)) → "Cmd+Shift+T"
 * - LGUI(LALT(KC_I)) → "Cmd+Alt+I"
 */
export function keycodeToLabel(keycode: string): string {
  const trimmed = keycode.trim();

  // Check basic keycodes
  if (BASIC_KEYCODES[trimmed]) {
    return BASIC_KEYCODES[trimmed];
  }

  // Check custom keycodes (APP_*, BACK_HOME, FIGMA_DEPTH, etc.)
  if (trimmed === "BACK_HOME") return "Home";
  if (trimmed === "FIGMA_DEPTH") return "Depth";
  if (trimmed.startsWith("APP_")) {
    return (
      trimmed.replace("APP_", "").charAt(0) +
      trimmed.replace("APP_", "").slice(1).toLowerCase()
    );
  }

  // Unwrap nested modifier calls
  const mods: string[] = [];
  let inner = trimmed;

  // Peel off modifier wrappers: MOD(...)
  const modPattern = /^(\w+)\((.+)\)$/;
  let match = modPattern.exec(inner);
  while (match) {
    const mod = match[1];
    if (MOD_LABELS[mod]) {
      mods.push(MOD_LABELS[mod]);
      inner = match[2];
      match = modPattern.exec(inner);
    } else {
      break;
    }
  }

  // Resolve the inner keycode
  const baseLabel = BASIC_KEYCODES[inner] || inner;

  if (mods.length > 0) {
    // Deduplicate mods (e.g., LGUI(LGUI(...)))
    const uniqueMods = [...new Set(mods)];
    return `${uniqueMods.join("+")}+${baseLabel}`;
  }

  return baseLabel;
}
