import { useState } from "react";
import { DisplayCanvas } from "./DisplayCanvas";
import { useDisplayState } from "../../shared/lib/useDisplayState";
import { setDisplayBrightness, setDisplayPower } from "../../shared/lib/tauri";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import { Sun, Power } from "lucide-react";

export function DisplayPreview() {
  const state = useDisplayState();
  const [pending, setPending] = useState(false);

  async function handleTogglePower() {
    setPending(true);
    try {
      await setDisplayPower(!state.on);
    } finally {
      setPending(false);
    }
  }

  async function handleBrightness(value: number) {
    await setDisplayBrightness(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Display Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <DisplayCanvas scale={0.5} />
            <p className="text-xs text-muted-foreground">
              480 × 320 px · RGB565 · ST7796S
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Power className="size-4 text-muted-foreground" />
                <span>Power</span>
              </div>
              <Button
                variant={state.on ? "outline" : "default"}
                size="sm"
                onClick={handleTogglePower}
                disabled={pending}
              >
                {state.on ? "Turn Off" : "Turn On"}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Sun className="size-4 text-muted-foreground" />
                <span>Brightness</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {state.brightness}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={state.brightness}
                onChange={(e) => handleBrightness(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
