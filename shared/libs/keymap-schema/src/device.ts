import macroEleven from "./macro-eleven.device.json";
import type { DeviceDescriptor, MatrixPosition } from "./types";

/** Macro Eleven: 3 × 4 matrix, 11 keys ([0,3] holds the knob). */
export const MACRO_ELEVEN = macroEleven as DeviceDescriptor;

/** Physical keys of a device, in firmware bit order. */
export function deviceKeys(device: DeviceDescriptor): MatrixPosition[] {
  return device.keys.map(([row, col]) => ({ row, col }));
}

/**
 * Whether a position is inside the device's matrix. Cells without a switch
 * (Macro Eleven's [0,3]) are inside: a key there never fires, but keeping it
 * is harmless, so older keymaps that set one still load.
 */
export function isInMatrix(
  { matrix }: DeviceDescriptor,
  { row, col }: MatrixPosition,
): boolean {
  return row < matrix.rows && col < matrix.cols;
}
