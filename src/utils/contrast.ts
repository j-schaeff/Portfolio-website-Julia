// Text that floats over images (corner controls, the detail page's metadata,
// the mobile caption) turns plain black or white depending on what sits behind
// it, so it stays readable without inverting into odd colours the way
// mix-blend-mode: difference did. Mark an element with `data-contrast`; a
// low-rate loop samples the pixels under it and sets its colour inline. Over
// the bare page the same rule picks the theme's contrast (black on white,
// white on dark). The CSS colour (var(--fg)) shows until the first sample.

const SAMPLE_SIZE = 48; // long edge of the downscaled copy we read pixels from
const TICK_MS = 120;
const COLS = 6;
const ROWS = 2;
// Relative luminance above which black text reads better than white. Lower
// than 0.5 because white text over mid-tones is harder to read than black.
const THRESHOLD = 0.45;

interface Sample {
  key: string;
  data: Uint8ClampedArray;
  w: number;
  h: number;
}

// null = the media can't be read (cross-origin, e.g. a Dropbox video).
const cache = new WeakMap<HTMLImageElement | HTMLVideoElement, Sample | null>();
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function context(): CanvasRenderingContext2D | null {
  if (!canvas) {
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  return ctx;
}

function naturalSize(el: HTMLImageElement | HTMLVideoElement): [number, number] {
  return el instanceof HTMLImageElement
    ? [el.naturalWidth, el.naturalHeight]
    : [el.videoWidth, el.videoHeight];
}

function ready(el: HTMLImageElement | HTMLVideoElement): boolean {
  return el instanceof HTMLImageElement
    ? el.complete && el.naturalWidth > 0
    : el.readyState >= 2;
}

// Downscaled pixels of what the element currently shows. Images are cached
// per source; videos are redrawn each tick since the frame changes.
function sample(el: HTMLImageElement | HTMLVideoElement): Sample | null | undefined {
  if (!ready(el)) return undefined;
  const isVideo = el instanceof HTMLVideoElement;
  const key = el.currentSrc || (el as HTMLImageElement).src;
  const cached = cache.get(el);
  if (cached === null) return null;
  if (cached && cached.key === key && !isVideo) return cached;

  const c = context();
  if (!c || !canvas) return undefined;
  const [nw, nh] = naturalSize(el);
  const scale = SAMPLE_SIZE / Math.max(nw, nh);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  canvas.width = w;
  canvas.height = h;
  try {
    c.drawImage(el, 0, 0, w, h);
    const s = { key, data: c.getImageData(0, 0, w, h).data, w, h };
    cache.set(el, s);
    return s;
  } catch {
    cache.set(el, null);
    return null;
  }
}

// sRGB channel (0–255) → linear light.
function linear(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function pageLuminance(): number {
  const m = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g);
  if (!m) return 1;
  return luminance(+m[0], +m[1], +m[2]);
}

// Luminance at viewport point (x, y) of a media element, honouring
// object-fit: contain. undefined = not over the picture itself, or unreadable.
function mediaLuminance(
  el: HTMLImageElement | HTMLVideoElement,
  rect: DOMRect,
  x: number,
  y: number,
): number | undefined {
  const s = sample(el);
  if (!s) return undefined;
  const fit = Math.min(rect.width / s.w, rect.height / s.h);
  const cw = s.w * fit;
  const ch = s.h * fit;
  const left = rect.left + (rect.width - cw) / 2;
  const top = rect.top + (rect.height - ch) / 2;
  const px = Math.floor(((x - left) / cw) * s.w);
  const py = Math.floor(((y - top) / ch) * s.h);
  if (px < 0 || py < 0 || px >= s.w || py >= s.h) return undefined;
  const i = (py * s.w + px) * 4;
  return luminance(s.data[i], s.data[i + 1], s.data[i + 2]);
}

function visibleMedia(): { el: HTMLImageElement | HTMLVideoElement; rect: DOMRect }[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out: { el: HTMLImageElement | HTMLVideoElement; rect: DOMRect }[] = [];
  document.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.right < 0 || rect.bottom < 0 || rect.left > vw || rect.top > vh) return;
    out.push({ el, rect });
  });
  return out;
}

// Over a video the frames keep changing, so the colour follows a tally of
// every tick's verdict (light or dark) instead: whichever the video has mostly
// shown behind the text wins, and it doesn't flick with each cut. The tally
// restarts when a different video (or source) moves behind the text.
interface Tally {
  video: HTMLVideoElement;
  src: string;
  light: number;
  dark: number;
}
const tallies = new WeakMap<HTMLElement, Tally>();

function update() {
  const targets = document.querySelectorAll<HTMLElement>("[data-contrast]");
  if (targets.length === 0) return;
  const media = visibleMedia();
  const page = pageLuminance();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  targets.forEach((target) => {
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) return;

    let total = 0;
    let count = 0;
    let video: HTMLVideoElement | null = null;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = r.left + ((col + 0.5) / COLS) * r.width;
        const y = r.top + ((row + 0.5) / ROWS) * r.height;
        // The last match in document order is (roughly) the one on top.
        let lum: number | undefined = page;
        for (let i = media.length - 1; i >= 0; i--) {
          const m = media[i];
          if (x < m.rect.left || x > m.rect.right || y < m.rect.top || y > m.rect.bottom) continue;
          const l = mediaLuminance(m.el, m.rect, x, y);
          if (l !== undefined && !video && m.el instanceof HTMLVideoElement) video = m.el;
          // Over unreadable media we can't tell; leave the point out.
          lum = l ?? (sample(m.el) === null || !ready(m.el) ? undefined : page);
          break;
        }
        if (lum === undefined) continue;
        total += lum;
        count++;
      }
    }
    // Nothing readable behind it: keep the theme colour from the CSS.
    if (count === 0) {
      target.style.removeProperty("color");
      return;
    }
    const light = total / count > THRESHOLD;

    if (!video) {
      tallies.delete(target);
      target.style.color = light ? "#000" : "#fff";
      return;
    }

    let tally = tallies.get(target);
    const src = video.currentSrc;
    if (!tally || tally.video !== video || tally.src !== src) {
      tally = { video, src, light: 0, dark: 0 };
      tallies.set(target, tally);
    }
    if (light) tally.light++;
    else tally.dark++;
    target.style.color = tally.light >= tally.dark ? "#000" : "#fff";
  });
}

// Starts the loop; returns a function that stops it.
export function startContrast(): () => void {
  let last = 0;
  let frame = 0;
  const loop = (t: number) => {
    if (t - last >= TICK_MS && document.visibilityState === "visible") {
      last = t;
      update();
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
}
