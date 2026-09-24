import type { LayerData } from "../../entities/layer";
import { cn } from "../../shared/lib/utils";

interface LayerSelectorProps {
  layers: LayerData[];
  selected: number;
  onSelect: (index: number) => void;
}

export function LayerSelector({
  layers,
  selected,
  onSelect,
}: LayerSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {layers.map((layer) => (
        <button
          type="button"
          key={layer.index}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            selected === layer.index
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
          onClick={() => onSelect(layer.index)}
        >
          <span className="mr-2 text-xs font-mono opacity-50">
            L{layer.index}
          </span>
          {layer.name}
        </button>
      ))}
    </div>
  );
}
