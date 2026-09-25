import { useLayoutEffect, useState } from "react";

/** Whether a horizontal scroller has more content to the left or right. */
export function useScrollEdges(element: HTMLElement | null) {
  const [edges, setEdges] = useState({ left: false, right: false });

  useLayoutEffect(() => {
    if (!element) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const left = scrollLeft > 1;
      const right = scrollLeft + clientWidth < scrollWidth - 1;
      setEdges((current) =>
        current.left === left && current.right === right
          ? current
          : { left, right },
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
