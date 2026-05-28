import { useCallback, useEffect, useState } from "react";

export interface LightboxState {
  slug: string;
  index: number;
  count: number;
}

export function useLightbox() {
  const [state, setState] = useState<LightboxState | null>(null);

  const open = useCallback((slug: string, index: number, count: number) => {
    setState({ slug, index, count });
  }, []);

  const close = useCallback(() => setState(null), []);

  const next = useCallback(() => {
    setState((s) => (s ? { ...s, index: (s.index + 1) % s.count } : s));
  }, []);

  const prev = useCallback(() => {
    setState((s) => (s ? { ...s, index: (s.index - 1 + s.count) % s.count } : s));
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close, next, prev]);

  return { state, open, close, next, prev };
}
