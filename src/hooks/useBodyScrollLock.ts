import { useEffect, useRef } from "react";

export function useBodyScrollLock(locked: boolean) {
  const previousOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const { body } = document;
    if (!body) return;

    if (previousOverflowRef.current === null) {
      previousOverflowRef.current = body.style.overflow;
    }

    body.style.overflow = "hidden";

    return () => {
      if (body.style.overflow === "hidden") {
        body.style.overflow = previousOverflowRef.current ?? "";
      }
      previousOverflowRef.current = null;
    };
  }, [locked]);
}
