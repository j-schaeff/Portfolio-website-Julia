import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { Project } from "../types/project";
import { gridImageHeight, imageHeight } from "../utils/imageSize";
import { useIsLandscapePhone, useIsMobile } from "./useIsMobile";

// Index layout: justified rows, each scaled up or down so it exactly fills the
// grid's width. Rows fill across projects, so one row can hold several. On
// mobile every row holds 2–8 small images and every row is one height (see
// MOBILE_ROW_HEIGHT); wider screens let each row take up to 8,
// however many fill it closest to their authored size, and never split a
// project so that one of its images sits alone in a row. On wider screens the
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
const MOBILE_ROWS: RowLimits = { min: 2, max: 8 };
// A phone held sideways: the same rows, with room for more across.
const LANDSCAPE_PHONE_ROWS: RowLimits = { min: 2, max: 12 };
// On mobile every row is this tall, so the rows read as one even rhythm: the
// size cascade's largest step (a project's first image) fills it, and the
// smaller steps keep their proportions to it, sitting on the row's bottom
// line. Rows are still chosen to fill the width as closely as possible; what's
// left over is taken up by cropping each image a little (object-fit: cover on
// its crop focus, see GridItem.module.css), so the rows' edges stay straight.
// The first project's images (its poster) are never cropped: the other images
// in their row take up the slack, and a row of only those ends short instead.
const MOBILE_ROW_HEIGHT = 96;
// Scales the cascade's heights so its largest step equals the row height.
const MOBILE_SCALE = MOBILE_ROW_HEIGHT / imageHeight(5);
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
const LOGO_ASPECT = 806.18 / 380.08;
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
  // Mobile: kept at its natural width (never cropped), see MOBILE_ROW_HEIGHT.
  locked?: boolean;
}

function rowScale(row: Cell[], available: number, gap: number): number {
  const total = row.reduce((sum, cell) => sum + cell.width, 0);
  return (available - gap * (row.length - 1)) / total;
}

// How a row fills the width when some cells are locked: the locked ones keep
// their natural width and the rest scale to fill what's left. Without locked
// cells this is just rowScale for every cell. If the locked cells alone fill
// the row, everything scales together; if the row is all locked, it keeps its
// natural width (shrinking only to fit) and ends short.
function fitRow(row: Cell[], available: number, gap: number) {
  const space = available - gap * (row.length - 1);
  let locked = 0;
  let free = 0;
  for (const cell of row) {
    if (cell.locked) locked += cell.width;
    else free += cell.width;
  }
  if (!locked || (free && locked >= space)) {
    const s = space / (locked + free);
    return { locked: s, free: s, fills: true };
  }
  if (!free) return { locked: Math.min(1, space / locked), free: 1, fills: false };
  return { locked: 1, free: (space - locked) / free, fills: true };
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
    const row = cells.slice(i, j);
    if (row.some((cell) => cell.locked)) {
      // Locked rows: the free cells' stretch, or for an all-locked row how
      // short it ends.
      const fit = fitRow(row, available, gap);
      const d = Math.log(fit.fills ? fit.free : rowScale(row, available, gap));
      return d * d;
    }
    const d = Math.log(rowScale(row, available, gap));
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
  const isLandscapePhone = useIsLandscapePhone();
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

    // Every project shares one row fill, so projects follow each other along
    // a line.
    const groups: Cell[][] = [];
    for (const project of projects) {
      const cells: Cell[] = [];
      for (const [index, img] of project.images.entries()) {
        if (img.hideInGrid) continue;
        const key = cellKey(project.slug, index);
        // The build-time ratio wins, so a late load report can't reflow the
        // rows; measured ones only fill in for media without one.
        const aspect = img.aspect ?? aspects[key];
        // The row fill needs every width, so wait for any unknown media.
        if (!aspect) return null;
        const rank = cells.length;
        const height = gridImageHeight(rank) * (isMobile ? MOBILE_SCALE : 1);
        // Mobile: the first project's images are never cropped.
        const locked = isMobile && !groups.length;
        cells.push({ key, group: project.slug, width: height * aspect, locked });
      }
      if (!cells.length) continue;
      if (!groups.length) groups.push(cells);
      else groups[0].push(...cells);
    }
    // On mobile the logo gets a row of its own and fills the full width.
    const logo = { key: LOGO_KEY, group: LOGO_KEY, width: LOGO_WIDTH + LOGO_PAD_LEFT };
    if (isMobile || !groups.length) groups.push([logo]);
    else groups[0].push(logo);

    const available = box.width - ROUNDING_SLACK_PX;
    const widths: Record<string, number> = {};
    // How far each project's label (under its first image) may
    // run, the span of that project's images in the row, so a long name stops
    // short of the next project's label (GridItem). Keyed by project slug.
    const labelWidths: Record<string, number> = {};
    const limits = isLandscapePhone ? LANDSCAPE_PHONE_ROWS : isMobile ? MOBILE_ROWS : WIDE_ROWS;
    groups.forEach((group, g) => {
      const isLastGroup = g === groups.length - 1;
      const looseLast = isLastGroup && !isMobile;
      const rows = buildRows(group, available, box.gap, limits, looseLast);
      rows.forEach((row, r) => {
        const fill = rowScale(row, available, box.gap);
        // The grid's last row on wider screens, and a short last row (fewer
        // than the minimum, e.g. when only one image is left), aren't
        // justified: authored size, shrunk only to fit. The mobile logo row
        // always fills the width.
        const isLastRow = r === rows.length - 1;
        const loose =
          isLastRow && !(isMobile && isLastGroup) && (looseLast || row.length < limits.min);
        if (row.some((cell) => cell.locked)) {
          const fit = fitRow(row, available, box.gap);
          for (const cell of row) {
            widths[cell.key] = cell.width * (cell.locked ? fit.locked : fit.free);
          }
        } else {
          const scale = loose ? Math.min(1, fill) : fill;
          for (const cell of row) widths[cell.key] = cell.width * scale;
        }
        row.forEach((cell, k) => {
          if (cell.group === LOGO_KEY || cell.group in labelWidths) return;
          let span = widths[cell.key];
          for (let m = k + 1; m < row.length && row[m].group === cell.group; m++) {
            span += box.gap + widths[row[m].key];
          }
          labelWidths[cell.group] = span;
        });
      });
    });
    const mobile = isMobile ? { height: MOBILE_ROW_HEIGHT, scale: MOBILE_SCALE } : null;
    return { widths, labelWidths, mobile };
  }, [isMobile, isLandscapePhone, box, projects, aspects]);

  return {
    widths: layout?.widths ?? null,
    labelWidths: layout?.labelWidths ?? null,
    // Mobile: the height every row shares, and the factor applied to the
    // cascade's heights (--row-h and --row-scale on the grid).
    mobileRows: layout?.mobile ?? null,
    reportAspect,
  };
}
