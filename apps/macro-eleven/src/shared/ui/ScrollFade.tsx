import { type HTMLMotionProps, motion } from "motion/react";
import { useState } from "react";
import { useScrollEdges } from "../lib/useScrollEdges";
import { cn } from "../lib/utils";

/**
 * A vertical scroller whose edges fade where more content is hidden
 * (`.scroll-fade` in App.css). Set `--fade-size` to change the depth.
 * Layout animations inside it account for its scroll (`layoutScroll`).
 */
export function ScrollFade({ className, ...props }: HTMLMotionProps<"div">) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const edges = useScrollEdges(element);
  return (
    <motion.div
      ref={setElement}
      layoutScroll
      data-top={edges.top || undefined}
      data-bottom={edges.bottom || undefined}
      className={cn("scroll-fade overflow-y-auto", className)}
      {...props}
    />
  );
}
