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
