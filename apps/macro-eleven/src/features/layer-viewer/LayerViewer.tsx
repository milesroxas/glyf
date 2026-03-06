import { useState } from "react";
import { MacropadGrid } from "../../shared/ui/MacropadGrid";
import { KeyLabel } from "./KeyLabel";
import { LayerSelector } from "./LayerSelector";
import { useLayerData } from "../../shared/lib/useLayerData";
import { openKeymapFile, reloadKeymap } from "../../shared/lib/tauri";

export function LayerViewer() {
    const { layers, loading, error, refresh } = useLayerData();
    const [selectedLayer, setSelectedLayer] = useState(0);
    const [isReloading, setIsReloading] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const [actionMessage, setActionMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const formatError = (err: unknown) =>
        err instanceof Error ? err.message : String(err);

    const handleReload = async () => {
        setIsReloading(true);
        setActionMessage(null);
        try {
            await reloadKeymap();
            await refresh();
            setActionMessage({
                type: "success",
                text: "Reloaded keymap from disk.",
            });
        } catch (err) {
            setActionMessage({
                type: "error",
                text: formatError(err),
            });
        } finally {
            setIsReloading(false);
        }
    };

    const handleEdit = async () => {
        setIsOpening(true);
        setActionMessage(null);
        try {
            await openKeymapFile();
            setActionMessage({
                type: "success",
                text: "Opening keymap JSON in your default editor.",
            });
        } catch (err) {
            setActionMessage({
                type: "error",
                text: formatError(err),
            });
        } finally {
            setIsOpening(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p>Loading layers...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
                <h3 className="font-semibold">Error loading layers</h3>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    if (layers.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No layers found on device.</p>
            </div>
        );
    }

    const currentLayer =
        layers.find((l) => l.index === selectedLayer) ?? layers[0];

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                    Layer Viewer
                </h2>
                <p className="text-sm text-muted-foreground">
                    Inspect key assignments for each layer.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        onClick={handleReload}
                        disabled={isReloading}
                    >
                        {isReloading ? "Reloading…" : "Reload Keymap"}
                    </button>
                    <button
                        className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                        onClick={handleEdit}
                        disabled={isOpening}
                    >
                        {isOpening ? "Opening…" : "Edit Keymap JSON"}
                    </button>
                </div>
                {actionMessage && (
                    <p
                        className={`text-sm ${
                            actionMessage.type === "error"
                                ? "text-destructive"
                                : "text-muted-foreground"
                        }`}
                    >
                        {actionMessage.text}
                    </p>
                )}
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="p-4 border-b bg-muted/30">
                    <LayerSelector
                        layers={layers}
                        selected={selectedLayer}
                        onSelect={setSelectedLayer}
                    />
                </div>
                <div className="p-10 flex justify-center bg-card">
                    <MacropadGrid
                        renderKey={(index) => (
                            <KeyLabel
                                keycode={currentLayer.keys[index] ?? "KC_NO"}
                            />
                        )}
                    />
                </div>
            </div>
        </div>
    );
}
