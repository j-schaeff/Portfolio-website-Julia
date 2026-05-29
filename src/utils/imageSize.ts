import type { ImageSize } from "../types/project";

// Height scales with imageSize; width follows the image's natural aspect ratio.
export const BASE_HEIGHT = 81;

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
