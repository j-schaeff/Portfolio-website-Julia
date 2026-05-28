import matter from "gray-matter";
import type { Project, ProjectImage } from "../types/project";
import { slugFromPath } from "../utils/slug";
import { clampImageSize } from "../utils/imageSize";

const files = import.meta.glob("/content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function toImage(entry: unknown): ProjectImage | null {
  // Legacy entries were plain path strings; current entries are objects.
  if (typeof entry === "string") {
    return { src: entry, size: clampImageSize(undefined), hideInGrid: false, alt: "" };
  }
  if (entry && typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    const src = e.image ?? e.src;
    if (!src) return null;
    return {
      src: String(src),
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
