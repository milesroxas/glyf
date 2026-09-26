import { useLayoutEffect, useRef, useState } from "react";

/**
 * Reports the element's layout height (transforms ignored) whenever it
 * changes, so a window can size itself to its content. Returns the ref.
 */
export function useFitToContent<T extends HTMLElement>(
  fit: (height: number) => void,
) {
  const latest = useRef(fit);
  latest.current = fit;
  const [node, setNode] = useState<T | null>(null);

  useLayoutEffect(() => {
    if (!node) return;
    let last = 0;
    const report = () => {
      const height = node.offsetHeight;
      if (height > 0 && height !== last) {
        last = height;
        latest.current(height);
      }
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return setNode;
}
