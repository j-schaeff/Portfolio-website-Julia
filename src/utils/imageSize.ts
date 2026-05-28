import type { ImageSize } from "../types/project";

// Fixed width for every image; height scales with imageSize.
export const IMAGE_WIDTH = 220;
export const BASE_HEIGHT = 90;

const MULTIPLIER: Record<ImageSize, number> = {
  1: 1,
  2: 1.6,
  3: 2.2,
  4: 2.9,
  5: 3.7,
};

export function clampImageSize(value: unknown): ImageSize {
  const n = Math.round(Number(value));
  if (n >= 1 && n <= 5) return n as ImageSize;
  return 1;
}

export function imageHeight(size: ImageSize): number {
  return Math.round(BASE_HEIGHT * MULTIPLIER[size]);
}
