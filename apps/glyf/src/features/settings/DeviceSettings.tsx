import { useEffect, useState } from "react";
import {
  getDisplayConfig,
  saveDisplayConfig,
  resetDisplayConfig,
} from "../../shared/lib/tauri";
import type { DisplayConfig, DisplayOrientation } from "../../entities/display";
import { DEFAULT_DISPLAY_CONFIG } from "../../entities/display";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import { RotateCcw, Save } from "lucide-react";

const ORIENTATIONS: { value: DisplayOrientation; label: string }[] = [
  { value: "landscape",      label: "Landscape (480×320)" },
  { value: "portrait",       label: "Portrait (320×480)" },
  { value: "landscape_flip", label: "Landscape Flipped" },
  { value: "portrait_flip",  label: "Portrait Flipped" },
];

export function DeviceSettings() {
  const [config, setConfig] = useState<DisplayConfig>(DEFAULT_DISPLAY_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDisplayConfig()
      .then(setConfig)
      .catch(() => {});
  }, []);

  async function handleSave() {
    await saveDisplayConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleReset() {
    await resetDisplayConfig();
    const fresh = await getDisplayConfig();
    setConfig(fresh);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Orientation</label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={config.orientation}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    orientation: e.target.value as DisplayOrientation,
                  }))
                }
              >
                {ORIENTATIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <label className="font-medium">Default Brightness</label>
                <span className="tabular-nums text-muted-foreground">
                  {config.brightness}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={config.brightness}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    brightness: Number(e.target.value),
                  }))
                }
                className="w-full accent-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Sleep After</label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={config.sleepAfterMs}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    sleepAfterMs: Number(e.target.value),
                  }))
                }
              >
                <option value={0}>Never</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} size="sm">
                <Save className="size-4 mr-1.5" />
                {saved ? "Saved!" : "Save"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="size-4 mr-1.5" />
                Reset Defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
