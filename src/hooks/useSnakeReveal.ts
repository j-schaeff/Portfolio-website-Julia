import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

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

// Fresh loads double as the loading screen: the logo covers the page while
// every image and video loads ("loading"), the snake then plays behind it
// ("run"), and once the snake has finished and a short pause has passed the
// logo slides down out of the viewport, leaving its small copy in the grid's
// last slot. null skips all of it (returning from a project, or reduced
// motion).
export type SnakeState = "loading" | "run" | null;

// The loading logo: over the page, sliding out of view, or gone (only the
// grid's copy remains, and only shows once the big one is out of sight).
export type LogoPhase = "overlay" | "leaving" | "gone";

// Milliseconds between each image lighting up as the snake travels.
const STEP_MS = 120;
// Each cell's own fade/rise. Keep in sync with the transition in
// GridView.module.css.
const REVEAL_MS = 900;
// Rows are detected by a shared bottom edge; allow for sub-pixel rounding.
const ROW_TOLERANCE_PX = 10;
// Everything should be loaded before the reveal, so this is only a safety net
// for a dead asset — long enough that normal loads always finish first.
const MAX_WAIT_MS = 15000;
// Pause between the snake finishing and the logo leaving.
const LOGO_DELAY_MS = 200;

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

// Resolve once every <img>/<video> in the container has loaded — images fully,
// videos up to their first frame — or after MAX_WAIT_MS, so a stalled asset
// can't freeze the loading screen.
function whenMediaReady(container: HTMLElement, done: () => void): () => void {
  const media = Array.from(
    container.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video"),
  );

  const isReady = (el: HTMLImageElement | HTMLVideoElement) =>
    el instanceof HTMLImageElement
      ? el.complete && el.naturalWidth > 0
      : el.readyState >= 2; // HAVE_CURRENT_DATA → first frame is ready

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
    el.removeEventListener("loadeddata", onReady);
    el.removeEventListener("error", onReady);
    pending -= 1;
    if (pending <= 0) finish();
  };

  const cleanup = () => {
    window.clearTimeout(timer);
    for (const el of media) {
      el.removeEventListener("load", onReady);
      el.removeEventListener("loadeddata", onReady);
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
    el.addEventListener("loadeddata", onReady);
    el.addEventListener("error", onReady);
  }
  const timer = window.setTimeout(finish, MAX_WAIT_MS);
  return cleanup;
}

export function useSnakeReveal(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  // Justified widths are applied, so measured positions are final.
  layoutReady: boolean,
) {
  // Decide once, at mount: a fresh load with motion allowed starts hidden so
  // there's no flash of fully-laid-out images before the snake runs.
  const [state, setState] = useState<SnakeState>(() =>
    enabled && !prefersReducedMotion() ? "loading" : null,
  );
  const [logo, setLogo] = useState<LogoPhase>(() =>
    state === "loading" ? "overlay" : "gone",
  );
  const [mediaReady, setMediaReady] = useState(false);
  // How long the snake takes, measured when it starts.
  const snakeMs = useRef(0);

  useLayoutEffect(() => {
    if (state !== "loading") return;
    const container = ref.current;
    if (!container) {
      setState(null);
      setLogo("gone");
      return;
    }
    return whenMediaReady(container, () => setMediaReady(true));
    // Runs once: state only ever moves forward, never back to "loading".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (state !== "loading" || !mediaReady || !layoutReady) return;
    const container = ref.current;
    if (!container) return;

    // One more frame so flex-wrap has settled before we read positions.
    const raf = requestAnimationFrame(() => {
      const cells = snakeOrder(
        Array.from(container.querySelectorAll<HTMLElement>("[data-grid-cell]")),
      );
      cells.forEach((cell, i) => {
        cell.style.setProperty("--reveal-delay", `${i * STEP_MS}ms`);
      });
      snakeMs.current = Math.max(0, cells.length - 1) * STEP_MS + REVEAL_MS;
      setState("run");
    });
    return () => cancelAnimationFrame(raf);
  }, [state, mediaReady, layoutReady, ref]);

  // Once the last cell has finished revealing, pause, then send the logo off.
  useEffect(() => {
    if (state !== "run" || logo !== "overlay") return;
    const timer = window.setTimeout(() => setLogo("leaving"), snakeMs.current + LOGO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, logo]);

  // Called once the big logo has left the viewport.
  const logoGone = useCallback(() => setLogo("gone"), []);

  return { state, logo, logoGone };
}
