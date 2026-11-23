import type { ImageSize } from "../types/project";

// Height scales with imageSize; width follows the image's natural aspect ratio.
export const BASE_HEIGHT = 69;

const MULTIPLIER: Record<ImageSize, number> = {
  1: 1,
  2: 1.54,
  3: 2.08,
  4: 2.71,
  5: 3.43,
};

export function clampImageSize(value: unknown): ImageSize {
  const n = Math.round(Number(value));
  if (n >= 1 && n <= 5) return n as ImageSize;
  // Middle height for an image scripts/assign-sizes.mjs hasn't filled yet.
  return 3;
}

// Index sizes cascade per project: its first grid image is the largest (5),
// each next one a size smaller, down to 1, and every project starts over at
// 5. `rank` is the image's position among the project's grid images. The
// authored `size` field only applies to the detail strip.
export function gridImageHeight(rank: number): number {
  return imageHeight(Math.max(1, 5 - rank) as ImageSize);
}

export function imageHeight(size: ImageSize): number {
  return Math.round(BASE_HEIGHT * MULTIPLIER[size]);
}

// Detail strip on tablet/desktop: heights are a share of the strip's height,
// so the project's largest image fills it from the top margin down to the
// metadata gap and the rest scale with it, keeping their relative sizes.
export function detailFillHeight(size: ImageSize, largest: ImageSize): string {
  return `${((MULTIPLIER[size] / MULTIPLIER[largest]) * 100).toFixed(2)}%`;
}

// Detail strip on mobile: size 5 is 78vh and the rest scale with it, keeping
// their relative proportions.
const DETAIL_MAX_VH_MOBILE = 78;

export function detailImageHeight(size: ImageSize): string {
  const vh = (DETAIL_MAX_VH_MOBILE / MULTIPLIER[5]) * MULTIPLIER[size];
  return `${vh.toFixed(2)}vh`;
}

// Mobile detail strip with an image tapped (ProjectPager's focused view):
// every image shares one height, so swiping sideways never changes it, with
// room below for the project's info. An image too wide for the screen at that
// height shrinks to fit the width (8px gutter either side) instead of being
// cut off. Without a known aspect ratio StripImage caps the width instead.
// The height itself is the --focus-h CSS variable (variables.css: 60svh, a
// little less on a phone held sideways), which the caption's max-height in
// ProjectPager.module.css also reads, so the two stay in step.
export const FOCUS_HEIGHT = "var(--focus-h)";
export const FOCUS_SIDE_GUTTER = 8;

export function detailFocusHeight(aspect?: number): string {
  if (!aspect) return FOCUS_HEIGHT;
  return `min(${FOCUS_HEIGHT}, calc((100vw - ${FOCUS_SIDE_GUTTER * 2}px) / ${aspect.toFixed(4)}))`;
}
