import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

// Plays a row-by-row reveal across the grid on first page load: each row lights
// up left→right, top row first, so the images appear in the same reading order
// as the projects themselves.
//
// The grid is a flex-wrap of variable-width images whose rows sit on their
// line's bottom (or, on mobile, hang from its top), so which image lands on
// which row is only known once the browser has laid everything out — and that
// depends on each image's aspect ratio (known from the build, or measured once
// it loads). So we wait for the layout, measure the cells, group them into
// rows by their vertical overlap, order each row left→right, and stamp a
// staggered transition delay onto every cell. The actual fade/rise is done in
// CSS off the data-reveal attribute.

// Fresh loads double as the loading screen: the logo covers the page while
// the images and videos on screen load ("loading"), the reveal then plays
// behind it ("run"), and once the on-screen cells have revealed and a short
// pause has passed the logo slides down out of the viewport, leaving its small
// copy in the grid's last slot. Media below the fold keeps loading after that;
// waiting for it would hold the logo up for things the visitor can't see.
// null skips all of it (returning from a project, or reduced motion).
export type RevealState = "loading" | "run" | null;

// The loading logo: over the page, sliding out of view, or gone (only the
// grid's copy remains, and only shows once the big one is out of sight).
export type LogoPhase = "overlay" | "leaving" | "gone";

// Milliseconds between each image lighting up.
const STEP_MS = 120;
// Each cell's own fade/rise. Keep in sync with the transition in
// GridView.module.css.
const REVEAL_MS = 900;
// Rows are detected by vertical overlap; allow for sub-pixel rounding.
const ROW_TOLERANCE_PX = 10;
// The on-screen media should be loaded before the reveal, so this is only a
// safety net for a dead asset — long enough that normal loads always finish
// first.
const MAX_WAIT_MS = 15000;
// Pause between the reveal finishing and the logo leaving.
const LOGO_DELAY_MS = 200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// Order cells in reading order: rows top to bottom, each row left→right.
// Measures layout boxes (offset*), not client rects: the cells are scaled down
// while the loading screen is up, which would shift their tops. A cell joins
// the current row while it overlaps it vertically; a row's cells needn't share
// a top or a bottom edge.
function readingOrder(cells: HTMLElement[]): HTMLElement[] {
  const measured = cells
    .map((el) => ({
      el,
      top: el.offsetTop,
      bottom: el.offsetTop + el.offsetHeight,
      left: el.offsetLeft,
    }))
    .sort((a, b) => a.top - b.top || a.left - b.left);

  const rows: { bottom: number; items: typeof measured }[] = [];
  for (const item of measured) {
    const row = rows[rows.length - 1];
    if (row && item.top < row.bottom - ROW_TOLERANCE_PX) {
      row.items.push(item);
      row.bottom = Math.max(row.bottom, item.bottom);
    } else {
      rows.push({ bottom: item.bottom, items: [item] });
    }
  }

  return rows.flatMap((row) => {
    row.items.sort((a, b) => a.left - b.left);
    return row.items.map((i) => i.el);
  });
}

// The cell's layout box in viewport coordinates. Built from offsets rather
// than its client rect, which the loading screen's scale-down would skew.
function layoutBox(el: HTMLElement): { top: number; bottom: number } {
  const parent = el.offsetParent as HTMLElement | null;
  // Offsets against <body> (or none) are measured from the document's top.
  const origin =
    parent && parent !== document.body
      ? parent.getBoundingClientRect().top + parent.clientTop
      : -window.scrollY;
  const top = origin + el.offsetTop;
  return { top, bottom: top + el.offsetHeight };
}

// Whether any of the cell shows in the viewport (a refresh may restore a
// scrolled position, so it needn't be the top of the page).
function onScreen(el: HTMLElement): boolean {
  const { top, bottom } = layoutBox(el);
  return bottom > 0 && top < window.innerHeight;
}

// Resolve once every <img> among the given media has loaded, plus each
// video's poster (the video itself only starts loading once the reveal begins)
// — or after MAX_WAIT_MS, so a stalled asset can't freeze the loading screen.
// A video without a poster is waited on up to its first frame.
function whenMediaReady(
  elements: (HTMLImageElement | HTMLVideoElement)[],
  done: () => void,
): () => void {
  const media = elements.map((el) => {
    if (!(el instanceof HTMLVideoElement) || !el.poster) return el;
    const poster = new Image();
    poster.src = el.poster;
    return poster;
  });

  const isReady = (el: HTMLImageElement | HTMLVideoElement) =>
    el instanceof HTMLImageElement
      ? el.complete && el.naturalWidth > 0
      : el.readyState >= 2; // HAVE_CURRENT_DATA → first frame is ready

  let pending = media.filter((el) => !isReady(el)).length;
  let settled = false;
  // Declared up front: when everything is already cached, finish() (and so
  // cleanup) runs before the timeout below is ever set.
  let timer = 0;
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
  timer = window.setTimeout(finish, MAX_WAIT_MS);
  return cleanup;
}

export function useRowReveal(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  // Justified widths are applied, so measured positions are final.
  layoutReady: boolean,
) {
  // Decide once, at mount: a fresh load with motion allowed starts hidden so
  // there's no flash of fully-laid-out images before the reveal runs.
  const [state, setState] = useState<RevealState>(() =>
    enabled && !prefersReducedMotion() ? "loading" : null,
  );
  const [logo, setLogo] = useState<LogoPhase>(() =>
    state === "loading" ? "overlay" : "gone",
  );
  // How long the on-screen part of the reveal takes, measured when it starts.
  const revealMs = useRef(0);

  useLayoutEffect(() => {
    if (state !== "loading") return;
    const container = ref.current;
    if (!container) {
      setState(null);
      setLogo("gone");
      return;
    }
    if (!layoutReady) return;

    // One more frame so flex-wrap has settled before we read positions.
    let cancelWait = () => {};
    const raf = requestAnimationFrame(() => {
      const cells = readingOrder(
        Array.from(container.querySelectorAll<HTMLElement>("[data-grid-cell]")),
      );
      // Reading order runs top to bottom, so the visible cells are one stretch.
      const visible = cells.filter(onScreen);
      const lastVisible = visible.length ? cells.indexOf(visible[visible.length - 1]) : 0;
      // Cells below the fold reveal together with the last visible one, so
      // none is still hidden when the visitor scrolls down.
      cells.forEach((cell, i) => {
        cell.style.setProperty("--reveal-delay", `${Math.min(i, lastVisible) * STEP_MS}ms`);
      });
      revealMs.current = lastVisible * STEP_MS + REVEAL_MS;

      const media = visible.flatMap((cell) =>
        Array.from(cell.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video")),
      );
      cancelWait = whenMediaReady(media, () => setState("run"));
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelWait();
    };
  }, [state, layoutReady, ref]);

  // Once the on-screen cells have finished revealing, pause, then send the
  // logo off.
  useEffect(() => {
    if (state !== "run" || logo !== "overlay") return;
    const timer = window.setTimeout(() => setLogo("leaving"), revealMs.current + LOGO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state, logo]);

  // Called once the big logo has left the viewport.
  const logoGone = useCallback(() => setLogo("gone"), []);

  return { state, logo, logoGone };
}
