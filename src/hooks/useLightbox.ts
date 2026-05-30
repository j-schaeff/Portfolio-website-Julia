import { useCallback, useEffect, useState } from "react";

// The lightbox tracks a single index into the flat list of every image across
// all projects, so next/prev can cross project boundaries.
export function useLightbox(total: number) {
  const [index, setIndex] = useState<number | null>(null);

  const open = useCallback((globalIndex: number) => setIndex(globalIndex), []);

  const close = useCallback(() => setIndex(null), []);

  const next = useCallback(
    () => setIndex((i) => (i === null || total === 0 ? i : (i + 1) % total)),
    [total],
  );

  const prev = useCallback(
    () => setIndex((i) => (i === null || total === 0 ? i : (i - 1 + total) % total)),
    [total],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, next, prev]);

  return { index, open, close, next, prev };
}
