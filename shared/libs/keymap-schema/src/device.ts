import macroEleven from "./macro-eleven.device.json";
import type { DeviceDescriptor, MatrixPosition } from "./types";

/** Macro Eleven: 3 × 4 matrix, 11 keys ([0,3] holds the knob). */
export const MACRO_ELEVEN = macroEleven as DeviceDescriptor;

/** Physical keys of a device, in firmware bit order. */
export function deviceKeys(device: DeviceDescriptor): MatrixPosition[] {
  return device.keys.map(([row, col]) => ({ row, col }));
}

export function isDeviceKey(
  device: DeviceDescriptor,
  { row, col }: MatrixPosition,
): boolean {
  return device.keys.some(([r, c]) => r === row && c === col);
}
