import {
  AnimatePresence,
  motion,
  type PanInfo,
  useDragControls,
} from "motion/react";
import { useRef } from "react";
import {
  projectMomentum,
  SPRING,
  SPRING_MOMENTUM,
} from "../../../shared/lib/motion";
import { useDesigner } from "../model/KeymapProvider";
import { Inspector } from "./Inspector";

/**
 * The inspector as a bottom sheet, for windows too narrow for two columns.
 * The grabber tracks the pointer 1:1 and rubber-bands past the top. On
 * release the sheet goes where the gesture was heading: a flick down closes
 * it even above the midpoint; a slow drag back up keeps it open.
 */
export function InspectorSheet() {
  const { selected, select } = useDesigner();
  const controls = useDragControls();
  const sheet = useRef<HTMLDivElement>(null);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const height = sheet.current?.offsetHeight ?? 0;
    const landing = info.offset.y + projectMomentum(info.velocity.y);
    if (landing > height / 2) select(null);
  };

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          ref={sheet}
          key="inspector-sheet"
          role="dialog"
          aria-label="Key inspector"
          initial={{ y: "100%" }}
          animate={{ y: 0, transition: SPRING }}
          exit={{ y: "100%", transition: SPRING_MOMENTUM }}
          drag="y"
          dragListener={false}
          dragControls={controls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.08, bottom: 1 }}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 400, bounceDamping: 32 }}
          onDragEnd={onDragEnd}
          className="material-raised absolute inset-x-0 bottom-0 z-20 flex max-h-[55%] flex-col rounded-t-2xl border-t shadow-[0_-12px_32px_-12px_oklch(0_0_0/0.6)]"
        >
          <div
            onPointerDown={(event) => controls.start(event)}
            className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 select-none active:cursor-grabbing"
          >
            <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
          </div>
          <div className="min-h-0 flex-1">
            <Inspector />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
