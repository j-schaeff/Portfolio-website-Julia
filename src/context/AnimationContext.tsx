import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface AnimationOrigin {
  slug: string;
  imageIndex: number;
  rect: DOMRect;
}

interface AnimationContextValue {
  origin: AnimationOrigin | null;
  setOrigin: (origin: AnimationOrigin) => void;
  clearOrigin: () => void;
}

export const AnimationContext = createContext<AnimationContextValue | null>(null);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [origin, setOriginState] = useState<AnimationOrigin | null>(null);

  const setOrigin = useCallback((next: AnimationOrigin) => setOriginState(next), []);
  const clearOrigin = useCallback(() => setOriginState(null), []);

  const value = useMemo<AnimationContextValue>(
    () => ({ origin, setOrigin, clearOrigin }),
    [origin, setOrigin, clearOrigin],
  );

  return <AnimationContext.Provider value={value}>{children}</AnimationContext.Provider>;
}

export function useAnimation(): AnimationContextValue {
  const ctx = useContext(AnimationContext);
  if (!ctx) throw new Error("useAnimation must be used within an AnimationProvider");
  return ctx;
}
