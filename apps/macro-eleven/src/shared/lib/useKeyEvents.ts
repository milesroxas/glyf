import { useEffect, useState } from "react";
import { unlistenAll } from "./listeners";
import {
  getEngineSnapshot,
  onKeyEvent,
  onLayerChange,
  onTestModeChange,
} from "./tauri";

interface LayerState {
  keys: boolean[];
  firmwareLayer: number;
  /** The host's layer; null while the firmware runs its own keymap. */
  hostLayer: number | null;
  /** Host control: the host runs actions and picks the layer. */
  passthrough: boolean;
}

const initialState: LayerState = {
  keys: [],
  firmwareLayer: 0,
  hostLayer: null,
  passthrough: true,
};

function sameKeys(a: boolean[], b: boolean[]) {
  return a.length === b.length && a.every((pressed, i) => pressed === b[i]);
}

/**
 * Key state and the active layer. Seeds the host layer and host control from
 * the engine on mount (events only report changes); an event that lands
 * first is at least as new, so it wins.
 */
export function useKeyEvents() {
  const [state, setState] = useState<LayerState>(initialState);

  useEffect(() => {
    let active = true;
    let heardLayer = false;
    let heardMode = false;

    const listeners = [
      onKeyEvent((event) => {
        setState((current) =>
          sameKeys(current.keys, event.keys) &&
          current.firmwareLayer === event.layer
            ? current
            : { ...current, keys: event.keys, firmwareLayer: event.layer },
        );
      }),
      onLayerChange((event) => {
        heardLayer = true;
        setState((current) =>
          current.hostLayer === event.layer
            ? current
            : { ...current, hostLayer: event.layer },
        );
      }),
      onTestModeChange((enabled) => {
        heardMode = true;
        setState((current) => ({
          ...current,
          passthrough: enabled,
          hostLayer: enabled ? current.hostLayer : null,
        }));
      }),
    ];

    Promise.all(listeners)
      .then(() => getEngineSnapshot())
      .then((snapshot) => {
        if (!active) return;
        setState((current) => {
          const passthrough = heardMode
            ? current.passthrough
            : snapshot.hostControl;
          const hostLayer = heardLayer ? current.hostLayer : snapshot.layer;
          return {
            ...current,
            passthrough,
            hostLayer: passthrough ? hostLayer : null,
          };
        });
      })
      .catch(() => {});

    return () => {
      active = false;
      unlistenAll(listeners);
    };
  }, []);

  const layer =
    state.passthrough && state.hostLayer !== null
      ? state.hostLayer
      : state.firmwareLayer;

  return {
    keys: state.keys,
    layer,
    hostLayer: state.hostLayer,
    firmwareLayer: state.firmwareLayer,
    passthrough: state.passthrough,
  };
}
