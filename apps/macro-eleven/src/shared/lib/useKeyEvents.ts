import { useEffect, useState } from "react";
import { onKeyEvent, onLayerChange, onTestModeChange } from "./tauri";

type LayerState = {
  keys: boolean[];
  firmwareLayer: number;
  hostLayer: number | null;
  passthrough: boolean;
};

const initialState: LayerState = {
  keys: Array(11).fill(false),
  firmwareLayer: 0,
  hostLayer: null,
  passthrough: true,
};

export function useKeyEvents() {
  const [state, setState] = useState<LayerState>(initialState);

  useEffect(() => {
    const keyPromise = onKeyEvent((event) => {
      setState((current) => ({
        ...current,
        keys: event.keys,
        firmwareLayer: event.layer,
        hostLayer: current.passthrough ? current.hostLayer : null,
      }));
    });

    const layerPromise = onLayerChange((event) => {
      setState((current) => ({
        ...current,
        hostLayer: event.layer,
      }));
    });

    const modePromise = onTestModeChange((enabled) => {
      setState((current) => ({
        ...current,
        passthrough: enabled,
        hostLayer: enabled ? current.hostLayer : null,
      }));
    });

    return () => {
      keyPromise.then((fn) => fn());
      layerPromise.then((fn) => fn());
      modePromise.then((fn) => fn());
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
