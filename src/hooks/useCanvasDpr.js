import { useEffect, useState } from 'react';

// Tracks devicePixelRatio and the element's CSS size, returning a canvas-ready
// `{ width, height, dpr }` whose width/height are in CSS pixels.
export default function useCanvasDpr(ref) {
  const [size, setSize] = useState({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      setSize((prev) => {
        if (
          Math.round(prev.width) === Math.round(rect.width) &&
          Math.round(prev.height) === Math.round(rect.height) &&
          prev.dpr === dpr
        ) {
          return prev;
        }
        return { width: rect.width, height: rect.height, dpr };
      });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [ref]);

  return size;
}
