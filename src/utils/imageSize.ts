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

// A frontmatter size of 1–5 is a manual choice; "auto" (the CMS default),
// a missing value or anything invalid is left for resolveRhythm() to fill.
export function parseImageSize(value: unknown): ImageSize | null {
  const n = Number(value);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n as ImageSize;
  return null;
}

// Heights auto sizes are drawn from: the range the rest of the index uses.
const RHYTHM_POOL: ImageSize[] = [2, 3, 4, 5];

// Fills auto (null) sizes with a varied rhythm where no two neighbours share a
// height. The PRNG is seeded by the project slug rather than Math.random() so
// the same content always builds the same layout instead of reshuffling on
// every deploy.
export function resolveRhythm(seed: string, sizes: (ImageSize | null)[]): ImageSize[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const random = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const out: ImageSize[] = [];
  sizes.forEach((size, i) => {
    if (size !== null) {
      out.push(size);
      return;
    }
    const prev = out[i - 1];
    const next = sizes[i + 1];
    const options = RHYTHM_POOL.filter((s) => s !== prev && s !== next);
    out.push(options[Math.floor(random() * options.length)]);
  });
  return out;
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
