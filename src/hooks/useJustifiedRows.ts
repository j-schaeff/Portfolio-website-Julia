import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import type { Project } from "../types/project";
import { imageHeight } from "../utils/imageSize";

// Index layout: justified rows, each scaled up or down so it exactly fills the
// grid's width. On mobile every row holds 2–4 images; wider screens let each
// row take up to 8, however many fill it closest to their authored size. The
// last row isn't stretched: it keeps its authored size (shrinking only if it
// would overflow) and sits left-aligned. Every image in a row scales by the
// same factor, so aspect ratios and the size relationships within a row hold,
// and the CSS gaps and padding stay fixed.
//
// Flex-wrap can't enforce a per-row count, so the rows are chosen here and
// each cell gets an explicit width. The widths of a row sum to the content
// width, so the (still flat) flex stream wraps exactly where we decided —
// which keeps the snake reveal's row detection and the cell order untouched.

const MOBILE_QUERY = "(max-width: 560px)";
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
// 80% of the smallest image height (size 1).
const LOGO_HEIGHT = imageHeight(1) * 0.8;
export const LOGO_WIDTH = LOGO_HEIGHT * LOGO_ASPECT;

interface Cell {
  key: string;
  width: number; // natural width at the image's authored size
}

function rowScale(row: Cell[], available: number, gap: number): number {
  const total = row.reduce((sum, cell) => sum + cell.width, 0);
  return (available - gap * (row.length - 1)) / total;
}

// How far a row is from its authored size, in either direction.
function distortion(row: Cell[], available: number, gap: number): number {
  return Math.abs(Math.log(rowScale(row, available, gap)));
}

function buildRows(
  cells: Cell[],
  available: number,
  gap: number,
  { min, max }: RowLimits,
): Cell[][] {
  const rows: Cell[][] = [];
  let row: Cell[] = [];

  for (const cell of cells) {
    if (row.length < min) {
      row.push(cell);
      continue;
    }
    // Take the next image only if it brings the row closer to its authored
    // size (scale nearer 1); otherwise it starts the next row.
    const without = distortion(row, available, gap);
    const withIt = distortion([...row, cell], available, gap);
    if (row.length < max && withIt < without) {
      row.push(cell);
    } else {
      rows.push(row);
      row = [cell];
    }
  }
  if (row.length) rows.push(row);

  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  if (!last || !prev) return rows;

  // A last row short of the minimum joins the previous row, or borrows from it
  // when that row is already full.
  if (last.length < min) {
    if (prev.length + last.length <= max) {
      prev.push(...rows.pop()!);
    } else {
      while (last.length < min && prev.length > min) last.unshift(prev.pop()!);
    }
  }

  return rows;
}

export function useJustifiedRows(
  ref: RefObject<HTMLElement | null>,
  projects: Project[],
) {
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches,
  );
  const [box, setBox] = useState<{ width: number; gap: number } | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

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

  const widths = useMemo(() => {
    if (!box) return null;

    const cells: Cell[] = [];
    for (const project of projects) {
      for (const [index, img] of project.images.entries()) {
        if (img.hideInGrid) continue;
        const key = cellKey(project.slug, index);
        const aspect = aspects[key];
        // The greedy row fill needs every width, so wait for all media.
        if (!aspect) return null;
        cells.push({ key, width: imageHeight(img.size) * aspect });
      }
    }
    cells.push({ key: LOGO_KEY, width: LOGO_WIDTH });

    const available = box.width - ROUNDING_SLACK_PX;
    const result: Record<string, number> = {};
    const limits = isMobile ? MOBILE_ROWS : WIDE_ROWS;
    const rows = buildRows(cells, available, box.gap, limits);
    rows.forEach((row, r) => {
      const fill = rowScale(row, available, box.gap);
      // The last row isn't justified: authored size, shrunk only to fit.
      const scale = r === rows.length - 1 ? Math.min(1, fill) : fill;
      for (const cell of row) result[cell.key] = cell.width * scale;
    });
    return result;
  }, [isMobile, box, projects, aspects]);

  return { widths, reportAspect };
}
