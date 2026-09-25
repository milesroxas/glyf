import { Keycap } from "../../shared/ui/Keycap";

interface KeyCellProps {
  index: number;
  pressed: boolean;
}

export function KeyCell({ index, pressed }: KeyCellProps) {
  return (
    <Keycap
      pressed={pressed}
      className="flex h-full w-full items-center justify-center text-sm font-medium tabular-nums select-none"
    >
      {index}
    </Keycap>
  );
}
