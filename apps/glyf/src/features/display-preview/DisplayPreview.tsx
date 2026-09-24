import { Power, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useDevice } from "../../app/providers";
import { setDisplayBrightness, setDisplayPower } from "../../shared/lib/tauri";
import { useDisplayState } from "../../shared/lib/useDisplayState";
import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { DisplayCanvas } from "./DisplayCanvas";

export function DisplayPreview() {
  const deviceState = useDisplayState();
  const { status } = useDevice();
  const [state, setState] = useState(deviceState);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setState(deviceState);
  }, [deviceState]);

  async function handleTogglePower() {
    const nextOn = !state.on;
    setState((current) => ({ ...current, on: nextOn }));
    setPending(true);
    try {
      await setDisplayPower(nextOn);
    } catch (error) {
      console.error("Failed to toggle display power", error);
      setState(deviceState);
    } finally {
      setPending(false);
    }
  }

  async function handleBrightness(value: number) {
    setState((current) => ({ ...current, brightness: value }));
    try {
      await setDisplayBrightness(value);
    } catch (error) {
      console.error("Failed to update display brightness", error);
      setState(deviceState);
    }
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
                disabled={pending || status !== "connected"}
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
                disabled={status !== "connected"}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
