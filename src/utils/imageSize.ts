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
  return 1;
}

export function imageHeight(size: ImageSize): number {
  return Math.round(BASE_HEIGHT * MULTIPLIER[size]);
}

// Detail view: desktop keeps the original 50vh cap, while mobile scales the
// entire size spectrum upward without changing the relative proportions.
const DETAIL_MAX_VH = 50;
const DETAIL_MAX_VH_MOBILE = 78;

export function detailImageHeight(
  size: ImageSize,
  isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 560px)").matches,
): string {
  const maxVh = isMobile ? DETAIL_MAX_VH_MOBILE : DETAIL_MAX_VH;
  const vh = (maxVh / MULTIPLIER[5]) * MULTIPLIER[size];
  return `${vh.toFixed(2)}vh`;
}
