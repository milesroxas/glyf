import defaultKeymap from "./macro-eleven.default.json";
import type { Keymap } from "./types";

/**
 * The bundled Macro Eleven keymap. The host embeds the same file, so the
 * app's read-only "Default" profile and this constant never drift.
 */
export const MACRO_ELEVEN_DEFAULT_KEYMAP = defaultKeymap as Keymap;
