import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { Project } from "../types/project";
import { imageHeight } from "../utils/imageSize";
import { useIsMobile } from "./useIsMobile";

// Index layout: justified rows, each scaled up or down so it exactly fills the
// grid's width. On mobile every row holds 2–4 images; wider screens let each
// row take up to 8, however many fill it closest to their authored size, and
// never split a project so that one of its images sits alone in a row. The
// last row isn't stretched: it keeps its authored size (shrinking only if it
// would overflow) and sits left-aligned. Every image in a row scales by the
// same factor, so aspect ratios and the size relationships within a row hold,
// and the CSS gaps and padding stay fixed.
//
// Flex-wrap can't enforce a per-row count, so the rows are chosen here and
// each cell gets an explicit width. The widths of a row sum to the content
// width, so the (still flat) flex stream wraps exactly where we decided —
// which keeps the row reveal's row detection and the cell order untouched.

interface RowLimits {
  min: number;
  max: number;
}
const MOBILE_ROWS: RowLimits = { min: 2, max: 4 };
// Capped so a row of many narrow images doesn't shrink them too far.
const WIDE_ROWS: RowLimits = { min: 1, max: 8 };
// Leave a pixel of slack per row so sub-pixel rounding can't push the last
// image onto the next line.
const ROUNDING_SLACK_PX = 1;

export const cellKey = (slug: string, index: number) => `${slug}:${index}`;

// The logo takes the grid's final slot. It joins the row fill like any image,
// so it always lands in the last row and that row's width accounts for it.
export const LOGO_KEY = "logo";
// The SVG viewBox, cropped to the lettering so its bottom edge is the
// baseline that lines up with the images.
const LOGO_ASPECT = 122 / 45.83;
// 55.2% of the smallest image height (size 1).
const LOGO_HEIGHT = imageHeight(1) * 0.552;
export const LOGO_WIDTH = LOGO_HEIGHT * LOGO_ASPECT;
// Extra space before the logo, on top of the grid gap. Counted in the cell's
// width so the row fill accounts for it and the mark keeps its size.
export const LOGO_PAD_LEFT = 8;

interface Cell {
  key: string;
  group: string; // the project it belongs to (the logo is its own)
  width: number; // natural width at the image's authored size
}

function rowScale(row: Cell[], available: number, gap: number): number {
  const total = row.reduce((sum, cell) => sum + cell.width, 0);
  return (available - gap * (row.length - 1)) / total;
}

// The rows are chosen together rather than greedily, so a break can be moved
// earlier when the natural one would strand a project: every stretch of a
// project within a row holds at least two images, so a project never starts
// on a row's last slot or leaves a single image to open the next row. (A
// single-image project may open a row or sit mid-row, and fills a row alone
// only when nothing else fits.) Among the allowed breaks, the rows that stay
// closest to their authored size win.
function buildRows(
  cells: Cell[],
  available: number,
  gap: number,
  { min, max }: RowLimits,
  looseLast: boolean,
): Cell[][] {
  const n = cells.length;
  if (n <= min) return n ? [cells] : [];

  // The [start, end) range of each cell's project.
  const runStart: number[] = [];
  const runEnd: number[] = [];
  for (let i = 0; i < n; i++) {
    runStart[i] = i > 0 && cells[i - 1].group === cells[i].group ? runStart[i - 1] : i;
  }
  for (let i = n - 1; i >= 0; i--) {
    runEnd[i] = i < n - 1 && cells[i + 1].group === cells[i].group ? runEnd[i + 1] : i + 1;
  }

  // Whether a row of cells [i, j) may end before cell j.
  const canBreak = (i: number, j: number) => {
    const tail = j - Math.max(i, runStart[j - 1]);
    if (runEnd[j - 1] > j) return tail >= 2 && runEnd[j - 1] - j >= 2;
    return tail >= 2 || tail === j - i;
  };

  // Squared log scale: how far the row is from its authored size, in either
  // direction. The grid's last row isn't stretched, so only overflow counts.
  const cost = (i: number, j: number) => {
    const d = Math.log(rowScale(cells.slice(i, j), available, gap));
    return looseLast && j === n && d > 0 ? 0 : d * d;
  };

  const solve = (strict: boolean) => {
    const best = new Array<number>(n + 1).fill(Infinity);
    const from = new Array<number>(n + 1).fill(-1);
    best[0] = 0;
    for (let j = 1; j <= n; j++) {
      for (let i = Math.max(0, j - max); i <= j - min; i++) {
        if (best[i] === Infinity) continue;
        if (strict && j < n && !canBreak(i, j)) continue;
        const total = best[i] + cost(i, j);
        if (total < best[j]) {
          best[j] = total;
          from[j] = i;
        }
      }
    }
    if (best[n] === Infinity) return null;
    const rows: Cell[][] = [];
    for (let j = n; j > 0; j = from[j]) rows.unshift(cells.slice(from[j], j));
    return rows;
  };

  // Drop the project rule only if no layout can satisfy it.
  return solve(true) ?? solve(false)!;
}

export function useJustifiedRows(
  ref: RefObject<HTMLElement | null>,
  projects: Project[],
) {
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();
  const [box, setBox] = useState<{ width: number; gap: number } | null>(null);

  // Track the grid's content width and gap (read from CSS, so the stylesheet
  // stays the source of truth for spacing).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      const width =
        el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const gap = parseFloat(style.columnGap) || 0;
      setBox((prev) =>
        prev && prev.width === width && prev.gap === gap ? prev : { width, gap },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  const reportAspect = useCallback((key: string, aspect: number) => {
    setAspects((prev) => (prev[key] === aspect ? prev : { ...prev, [key]: aspect }));
  }, []);

  const layout = useMemo(() => {
    if (!box) return null;

    // On mobile each project gets its own rows, so a project always starts at
    // the beginning of a line. Wider screens fill rows across projects.
    const groups: Cell[][] = [];
    for (const project of projects) {
      const cells: Cell[] = [];
      for (const [index, img] of project.images.entries()) {
        if (img.hideInGrid) continue;
        const key = cellKey(project.slug, index);
        const aspect = aspects[key];
        // The greedy row fill needs every width, so wait for all media.
        if (!aspect) return null;
        cells.push({ key, group: project.slug, width: imageHeight(img.size) * aspect });
      }
      if (!cells.length) continue;
      if (isMobile || !groups.length) groups.push(cells);
      else groups[0].push(...cells);
    }
    // On mobile the logo gets a row of its own and fills the full width.
    const logo = { key: LOGO_KEY, group: LOGO_KEY, width: LOGO_WIDTH + LOGO_PAD_LEFT };
    if (isMobile || !groups.length) groups.push([logo]);
    else groups[0].push(logo);

    const available = box.width - ROUNDING_SLACK_PX;
    const widths: Record<string, number> = {};
    const limits = isMobile ? MOBILE_ROWS : WIDE_ROWS;
    groups.forEach((group, g) => {
      const isLastGroup = g === groups.length - 1;
      const looseLast = isLastGroup && !isMobile;
      const rows = buildRows(group, available, box.gap, limits, looseLast);
      rows.forEach((row, r) => {
        const fill = rowScale(row, available, box.gap);
        // The grid's last row (except the mobile logo row, which fills the
        // width), and a project's lone short row (e.g. a single-image
        // project), aren't justified: authored size, shrunk only to fit.
        const isLastRow = r === rows.length - 1;
        const loose =
          isLastRow && !(isMobile && isLastGroup) && (isLastGroup || row.length < limits.min);
        const scale = loose ? Math.min(1, fill) : fill;
        for (const cell of row) widths[cell.key] = cell.width * scale;
      });
    });
    return widths;
  }, [isMobile, box, projects, aspects]);

  return { widths: layout, reportAspect };
}
