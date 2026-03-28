import { useTouchEvents } from "../../shared/lib/useTouchEvents";
import { TouchPointDot } from "./TouchPoint";
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from "../../entities/display";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Button } from "../../shared/ui/button";
import { Trash2 } from "lucide-react";

const SCALE = 0.5;
const CANVAS_W = DISPLAY_WIDTH * SCALE;
const CANVAS_H = DISPLAY_HEIGHT * SCALE;

export function TouchMonitor() {
  const { lastTouch, history, clearHistory } = useTouchEvents();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Touch Monitor</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              <Trash2 className="size-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3">
            <svg
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                background: "#000",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                display: "block",
              }}
            >
              {history.map((pt, i) => (
                <TouchPointDot key={i} event={pt} scale={SCALE} />
              ))}
              {lastTouch?.pressed && (
                <circle
                  cx={lastTouch.x * SCALE}
                  cy={lastTouch.y * SCALE}
                  r={8}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                />
              )}
            </svg>
            <p className="text-xs text-muted-foreground">
              {history.length} point{history.length !== 1 ? "s" : ""} recorded
            </p>
          </div>
        </CardContent>
      </Card>

      {lastTouch && (
        <Card>
          <CardHeader>
            <CardTitle>Last Touch</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">X</dt>
              <dd className="tabular-nums">{lastTouch.x} px</dd>
              <dt className="text-muted-foreground">Y</dt>
              <dd className="tabular-nums">{lastTouch.y} px</dd>
              <dt className="text-muted-foreground">Pressure</dt>
              <dd className="tabular-nums">
                {(lastTouch.pressure * 100).toFixed(1)}%
              </dd>
              <dt className="text-muted-foreground">Pressed</dt>
              <dd>{lastTouch.pressed ? "Yes" : "No"}</dd>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
