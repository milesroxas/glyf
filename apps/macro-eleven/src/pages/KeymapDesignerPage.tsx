import { useLaunchBindings } from "../shared/lib/useLaunchBindings";
import { cn } from "../shared/lib/utils";

export function KeymapDesignerPage() {
  const { bindings, loading, error, refresh } = useLaunchBindings();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Keymap Designer</h2>
            <p className="text-sm text-muted-foreground">
              Select a launch pad slot to configure apps, shortcuts, or macro actions.
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span>Loading launch bindings…</span>
          </div>
        </div>
      ) : bindings.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <p>No launch actions defined in your keymap yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bindings.map((binding) => (
            <div
              key={`${binding.layer}:${binding.row},${binding.col}`}
              className="rounded-xl border bg-card text-card-foreground shadow-sm p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Layer {binding.layer} · {binding.layerName}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  [{binding.row},{binding.col}]
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{binding.app}</h3>
                <p className="text-sm text-muted-foreground">
                  {binding.label ?? "App Launcher"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className={cn(
                    "inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                >
                  Edit Actions
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-md border border-muted bg-muted/40 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm"
                  disabled
                >
                  Map Plugin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
