import matter from "gray-matter";
import type { Project, ProjectImage } from "../types/project";
import { slugFromPath } from "../utils/slug";
import { clampImageSize } from "../utils/imageSize";
import { dropboxDirect, isVideo } from "../utils/media";

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

function toImage(entry: unknown): ProjectImage | null {
  // Legacy entries were plain path strings; current entries are objects.
  if (typeof entry === "string") {
    const src = normalizeSrc(entry);
    return { src, size: clampImageSize(undefined), hideInGrid: false, alt: "", isVideo: isVideo(src) };
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
      src,
      size: clampImageSize(e.size),
      hideInGrid: Boolean(e.hideInGrid),
      alt: String(e.alt ?? ""),
      isVideo: Boolean(videoUrl) || isVideo(src),
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
    order: Number(fm.order ?? 0),
    images: Array.isArray(fm.images)
      ? fm.images.map(toImage).filter((img): img is ProjectImage => img !== null)
      : [],
  };
}

export const projects: Project[] = Object.entries(files)
  .map(([path, raw]) => toProject(path, raw))
  .sort((a, b) => a.order - b.order || a.year - b.year || a.title.localeCompare(b.title));
