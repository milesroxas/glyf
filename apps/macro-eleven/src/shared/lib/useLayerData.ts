import { useCallback, useEffect, useState } from "react";
import type { LayerData } from "../../entities/layer";
import { getLayerData } from "./tauri";

export function useLayerData() {
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLayerData();
      setLayers(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  return { layers, loading, error, refresh: loadLayers };
}
