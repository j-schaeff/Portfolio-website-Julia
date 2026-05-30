import matter from "gray-matter";
import type { Project, ProjectImage } from "../types/project";
import { slugFromPath } from "../utils/slug";
import { clampImageSize } from "../utils/imageSize";

const files = import.meta.glob("/content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Vite serves everything under public/ from the site root, so stored paths like
// "public/images/x.jpg" must become root-absolute ("/images/x.jpg"). Relative
// paths break on the detail route, where they resolve against "/project/:slug".
function normalizeSrc(src: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  return "/" + src.replace(/^\/+/, "").replace(/^public\//, "");
}

function toImage(entry: unknown): ProjectImage | null {
  // Legacy entries were plain path strings; current entries are objects.
  if (typeof entry === "string") {
    return { src: normalizeSrc(entry), size: clampImageSize(undefined), hideInGrid: false, alt: "" };
  }
  if (entry && typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    const src = e.image ?? e.src;
    if (!src) return null;
    return {
      src: normalizeSrc(String(src)),
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

  return {
    slug: slugFromPath(path),
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

// Flat sequence of every image across all projects, in project order. The
// lightbox walks this list so navigation can cross project boundaries.
export interface FlatImage {
  slug: string;
  title: string;
  image: ProjectImage;
  indexInProject: number;
}

export const allImages: FlatImage[] = projects.flatMap((p) =>
  p.images.map((image, indexInProject) => ({
    slug: p.slug,
    title: p.title,
    image,
    indexInProject,
  })),
);

export function globalImageIndex(slug: string, indexInProject: number): number {
  return allImages.findIndex(
    (e) => e.slug === slug && e.indexInProject === indexInProject,
  );
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectsByType(type: string): Project[] {
  return projects.filter((p) => p.type === type);
}

export function getTypes(): string[] {
  const seen = new Set<string>();
  const types: string[] = [];
  for (const p of projects) {
    if (!seen.has(p.type)) {
      seen.add(p.type);
      types.push(p.type);
    }
  }
  return types;
}
