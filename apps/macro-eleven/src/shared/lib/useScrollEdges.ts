import { useLayoutEffect, useState } from "react";

/** Whether a vertical scroller has more content above or below. */
export function useScrollEdges(element: HTMLElement | null) {
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useLayoutEffect(() => {
    if (!element) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const top = scrollTop > 1;
      const bottom = scrollTop + clientHeight < scrollHeight - 1;
      setEdges((current) =>
        current.top === top && current.bottom === bottom
          ? current
          : { top, bottom },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, [element]);

  return edges;
}
