import { usePotValue } from "../../shared/lib/usePotValue";
import { PotGauge } from "./PotGauge";

const LAYER_POT_FUNCTIONS: Record<number, string> = {
  0: "Volume Control",
  2: "Figma Layer Navigation",
};

export function PotMonitor() {
  const { value, layer } = usePotValue();
  const functionLabel = LAYER_POT_FUNCTIONS[layer] ?? "No function assigned";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Potentiometer</h2>
        <p className="text-sm text-muted-foreground">
          Monitor analog input and check active function assignment.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">
              Real-time Value
            </h3>
            <p className="text-sm text-muted-foreground">
              Current analog reading (0-1023)
            </p>
          </div>
          <div className="p-6 pt-0 flex justify-center items-center min-h-[200px]">
            <PotGauge value={value} />
          </div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight">
              Function Assignment
            </h3>
            <p className="text-sm text-muted-foreground">
              Behavior for current layer
            </p>
          </div>
          <div className="p-6 pt-0">
            <div className="rounded-lg border bg-muted/40 p-6 flex flex-col items-center justify-center gap-2 text-center h-[200px]">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Layer {layer}
              </span>
              <p className="text-xl font-medium text-foreground">
                {functionLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
