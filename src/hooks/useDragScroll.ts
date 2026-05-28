import { useEffect, useRef, useState } from "react";

/**
 * Mouse drag-to-scroll for a horizontal container. Touch swipe is left to the
 * browser's native overflow scrolling (the container should set
 * `overflow-x: auto`). `draggedRef.current` is true right after a drag, so click
 * handlers can ignore the click that follows a drag.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const draggedRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let down = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true;
      draggedRef.current = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!draggedRef.current && Math.abs(dx) > 4) {
        draggedRef.current = true;
        setIsDragging(true);
        el.setPointerCapture?.(e.pointerId);
      }
      if (draggedRef.current) {
        e.preventDefault();
        el.scrollLeft = startScroll - dx;
      }
    };

    const endDrag = () => {
      if (!down) return;
      down = false;
      setIsDragging(false);
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return { ref, isDragging, draggedRef };
}
