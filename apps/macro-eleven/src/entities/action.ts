/**
 * Action entity - Re-exports action types from shared schema
 */

export type {
  Action,
  ActionType,
  BaseAction,
  CycleLayerAction,
  SwitchLayerAction,
  LaunchAppAction,
  ShortcutAction,
  MacroAction,
  PluginAction,
  NoopAction,
  MacroStep,
  KeyModifier,
} from '@embedded/keymap-schema';

import type { Action, MatrixPosition } from '@embedded/keymap-schema';

export interface ActionErrorEvent {
  position: MatrixPosition;
  layer: number;
  error: string;
}

export interface ActionExecutedEvent {
  position: MatrixPosition;
  layer: number;
  action: Action;
}

/**
 * Get a human-readable label for an action
 */
export function getActionLabel(action: Action): string {
  if (action.label) {
    return action.label;
  }

  switch (action.action) {
    case 'cycle_layer':
      return 'Cycle Layer';

    case 'switch_layer':
      return `Layer ${action.layer}`;

    case 'launch_app':
      return action.app;

    case 'shortcut':
      return action.keys.join(' + ');

    case 'macro':
      return 'Macro';

    case 'plugin':
      return `${action.pluginId}:${action.actionId}`;

    case 'noop':
      return '—';

    default:
      return 'Unknown';
  }
}

/**
 * Get icon name for an action (for lucide-react)
 */
export function getActionIcon(action: Action): string {
  switch (action.action) {
    case 'cycle_layer':
    case 'switch_layer':
      return 'layers';

    case 'launch_app':
      return 'rocket';

    case 'shortcut':
      return 'keyboard';

    case 'macro':
      return 'list-ordered';

    case 'plugin':
      return 'puzzle';

    case 'noop':
      return 'circle-off';

    default:
      return 'help-circle';
  }
}
