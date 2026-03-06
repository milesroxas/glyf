export interface LayerData {
  index: number;
  name: string;
  keys: string[];
}

export interface KeyAssignment {
  keycode: string;
  label: string;
}

export interface LayerChangeEvent {
  layer: number;
  triggerApp?: string | null;
}

export function getKeyForDisplay(keys: string[], index: number): string {
  return keys[index] ?? "KC_NO";
}
