import matter from "gray-matter";
import type { Project, ProjectImage } from "../types/project";
import { slugFromPath } from "../utils/slug";
import { clampImageSize } from "../utils/imageSize";
import { dropboxDirect, isVideo, optimizedSrc } from "../utils/media";

const files = import.meta.glob("/content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Vite serves everything under public/ from the base URL, so stored paths like
// "public/images/x.jpg" must be prefixed with BASE_URL ("/images/x.jpg" locally,
// "/Portfolio-website-Julia/images/x.jpg" on a GitHub Pages project subpath).
// Relative paths break on the detail route because the current path is a shared
// view (for example "/project?project=slug"), so the URL must resolve against
// the app base instead of the route segment. BASE_URL always ends with a
// trailing slash.
function normalizeSrc(src: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  return import.meta.env.BASE_URL + src.replace(/^\/+/, "").replace(/^public\//, "");
}

// Aspect ratios of the uploads, keyed by their path under public/images,
// written by scripts/optimize-media.mjs. Globbed rather than imported so a
// missing file (the script hasn't run) just means none are known.
const aspectFiles = import.meta.glob("../generated/media-aspects.json", {
  import: "default",
  eager: true,
}) as Record<string, Record<string, number>>;
const aspects = Object.values(aspectFiles)[0] ?? {};

// Videos with an audible soundtrack, from the same script.
const audioFiles = import.meta.glob("../generated/media-audio.json", {
  import: "default",
  eager: true,
}) as Record<string, string[]>;
const withSound = new Set(Object.values(audioFiles)[0] ?? []);

// Path under public/images, or undefined for an external source.
function uploadPath(src: string): string | undefined {
  const images = import.meta.env.BASE_URL + "images/";
  return src.startsWith(images) ? src.slice(images.length) : undefined;
}

function aspectOf(src: string): number | undefined {
  const rel = uploadPath(src);
  return rel ? aspects[rel] : undefined;
}

function hasAudio(src: string): boolean {
  const rel = uploadPath(src);
  return rel ? withSound.has(rel) : false;
}

// Point at the web-sized copies from scripts/optimize-media.mjs. External
// sources have none, so optimizedSrc() hands them back unchanged.
function withCopies(src: string, video: boolean) {
  const aspect = aspectOf(src);
  if (video) {
    const opt = optimizedSrc(src, "opt.mp4");
    const poster = optimizedSrc(src, "poster.webp");
    return {
      src,
      isVideo: true,
      hasAudio: hasAudio(src),
      thumb: opt,
      full: opt,
      poster: poster === src ? undefined : poster,
      aspect,
    };
  }
  return {
    src,
    isVideo: false,
    hasAudio: false,
    thumb: optimizedSrc(src, "thumb.webp"),
    full: optimizedSrc(src, "full.webp"),
    aspect,
  };
}

function toImage(entry: unknown): ProjectImage | null {
  // Legacy entries were plain path strings; current entries are objects.
  if (typeof entry === "string") {
    const src = normalizeSrc(entry);
    return { ...withCopies(src, isVideo(src)), size: clampImageSize(undefined), hideInGrid: false, alt: "" };
  }
  if (entry && typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    // A pasted video link (e.g. a Dropbox share URL) overrides the uploaded
    // file, so large videos can stream from external hosting instead of being
    // uploaded through the CMS. Such an entry is always treated as a video.
    const videoUrl = e.videoUrl ? dropboxDirect(String(e.videoUrl)) : "";
    // Uploaded videos live in their own `video` field because the CMS's image
    // field (which shows thumbnails) rejects video extensions. Older entries
    // may still hold a video path in `image`; isVideo() catches those.
    const fileSrc = e.video || e.image || e.src;
    const src = videoUrl || (fileSrc ? normalizeSrc(String(fileSrc)) : "");
    if (!src) return null;
    return {
      ...withCopies(src, Boolean(videoUrl) || isVideo(src)),
      size: clampImageSize(e.size),
      hideInGrid: Boolean(e.hideInGrid),
      alt: String(e.alt ?? ""),
    };
  }
  return null;
}

function toProject(path: string, raw: string): Project {
  const { data } = matter(raw);
  const fm = data as Record<string, unknown>;
  const slug = slugFromPath(path);

  return {
    slug,
    title: String(fm.title ?? "Untitled"),
    type: String(fm.type ?? "Uncategorized"),
    description: String(fm.description ?? ""),
    year: Number(fm.year ?? 0),
    client: String(fm.client ?? "").trim(),
    clientUrl: String(fm.clientUrl ?? "").trim(),
    images: Array.isArray(fm.images)
      ? fm.images.map(toImage).filter((img): img is ProjectImage => img !== null)
      : [],
  };
}

// The site's project order comes from the single "Project order" list in the
// CMS (content/order.md), where entries are dragged into place. Entries are
// project file paths; they're matched by slug so a bare filename works too.
// Globbed so a missing file just means no order. Filenames are NFC-normalised
// first because macOS can store "ä" decomposed, which would change the slug.
const orderFiles = import.meta.glob("/content/order.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const orderRaw = Object.values(orderFiles)[0];
const orderList = orderRaw ? (matter(orderRaw).data as Record<string, unknown>).projects : undefined;

const orderKey = (path: string) => slugFromPath(path.normalize("NFC"));
const position = new Map<string, number>();
(Array.isArray(orderList) ? orderList : []).forEach((entry, i) => {
  const key = orderKey(String(entry ?? ""));
  if (key && !position.has(key)) position.set(key, i);
});

// Listed projects first, in list order; anything not listed yet (e.g. a newly
// created project) follows, by year then title. Entries for deleted files are
// simply never matched.
export const projects: Project[] = Object.entries(files)
  .map(([path, raw]) => ({ project: toProject(path, raw), rank: position.get(orderKey(path)) ?? Infinity }))
  .sort(
    (a, b) =>
      (a.rank === b.rank ? 0 : a.rank - b.rank) ||
      a.project.year - b.project.year ||
      a.project.title.localeCompare(b.project.title),
  )
  .map(({ project }) => project);
