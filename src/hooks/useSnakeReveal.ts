import { useLayoutEffect, useState, type RefObject } from "react";

// Plays a serpentine ("snake") reveal across the grid on first page load: the
// top row lights up left→right, the next row right→left, and so on, so the
// images appear to fill the page by snaking back and forth.
//
// The grid is a flex-wrap of variable-width images that share a bottom baseline
// (align-items: flex-end), so which image lands on which row is only known once
// the browser has laid everything out — and that depends on each image's
// natural width, i.e. on the images having loaded. So we wait for the images,
// measure the cells, group them into rows by their (shared) bottom edge, order
// each row in the snake direction, and stamp a staggered transition delay onto
// every cell. The actual fade/rise is done in CSS off the data-snake attribute.

export type SnakeState = "pending" | "run" | null;

// Milliseconds between each image lighting up as the snake travels.
const STEP_MS = 90;
// Rows are detected by a shared bottom edge; allow for sub-pixel rounding.
const ROW_TOLERANCE_PX = 10;
// Don't let one slow-loading image hold the whole reveal hostage.
const MAX_WAIT_MS = 2000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// Order cells along a boustrophedon path: row 0 left→right, row 1 right→left, …
function snakeOrder(cells: HTMLElement[]): HTMLElement[] {
  const measured = cells
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .sort((a, b) => a.rect.bottom - b.rect.bottom || a.rect.left - b.rect.left);

  const rows: { bottom: number; items: typeof measured }[] = [];
  for (const item of measured) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(item.rect.bottom - row.bottom) <= ROW_TOLERANCE_PX) {
      row.items.push(item);
    } else {
      rows.push({ bottom: item.rect.bottom, items: [item] });
    }
  }

  return rows.flatMap((row, r) => {
    row.items.sort((a, b) => a.rect.left - b.rect.left);
    if (r % 2 === 1) row.items.reverse();
    return row.items.map((i) => i.el);
  });
}

// Resolve once every <img>/<video> in the container has the dimensions we need
// to lay out (or after MAX_WAIT_MS, so a stalled asset can't freeze the reveal).
function whenMediaReady(container: HTMLElement, done: () => void): () => void {
  const media = Array.from(
    container.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video"),
  );

  const isReady = (el: HTMLImageElement | HTMLVideoElement) =>
    el instanceof HTMLImageElement
      ? el.complete && el.naturalWidth > 0
      : el.readyState >= 1; // HAVE_METADATA → intrinsic size is known

  let pending = media.filter((el) => !isReady(el)).length;
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    cleanup();
    done();
  };

  const onReady = (event: Event) => {
    const el = event.currentTarget as HTMLImageElement | HTMLVideoElement;
    el.removeEventListener("load", onReady);
    el.removeEventListener("loadedmetadata", onReady);
    el.removeEventListener("error", onReady);
    pending -= 1;
    if (pending <= 0) finish();
  };

  const cleanup = () => {
    window.clearTimeout(timer);
    for (const el of media) {
      el.removeEventListener("load", onReady);
      el.removeEventListener("loadedmetadata", onReady);
      el.removeEventListener("error", onReady);
    }
  };

  if (pending === 0) {
    // Already cached: hand back a no-op cleanup but still resolve async so the
    // caller can wire up state before we flip it.
    queueMicrotask(finish);
    return cleanup;
  }

  for (const el of media) {
    if (isReady(el)) continue;
    el.addEventListener("load", onReady);
    el.addEventListener("loadedmetadata", onReady);
    el.addEventListener("error", onReady);
  }
  const timer = window.setTimeout(finish, MAX_WAIT_MS);
  return cleanup;
}

export function useSnakeReveal(ref: RefObject<HTMLElement | null>, enabled: boolean): SnakeState {
  // Decide once, at mount: a fresh load with motion allowed starts hidden so
  // there's no flash of fully-laid-out images before the snake runs.
  const [state, setState] = useState<SnakeState>(() =>
    enabled && !prefersReducedMotion() ? "pending" : null,
  );

  useLayoutEffect(() => {
    if (state !== "pending") return;
    const container = ref.current;
    if (!container) {
      setState(null);
      return;
    }

    let raf = 0;
    const cleanupMedia = whenMediaReady(container, () => {
      // One more frame so flex-wrap has settled before we read positions.
      raf = requestAnimationFrame(() => {
        const cells = Array.from(
          container.querySelectorAll<HTMLElement>("[data-grid-cell]"),
        );
        snakeOrder(cells).forEach((cell, i) => {
          cell.style.setProperty("--reveal-delay", `${i * STEP_MS}ms`);
        });
        setState("run");
      });
    });

    return () => {
      cleanupMedia();
      cancelAnimationFrame(raf);
    };
    // Runs once: state only ever moves pending → run | null, never back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
