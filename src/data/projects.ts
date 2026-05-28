import matter from "gray-matter";
import type { Project } from "../types/project";
import { slugFromPath } from "../utils/slug";
import { clampImageSize } from "../utils/imageSize";

const files = import.meta.glob("/content/projects/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

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
    imageSize: clampImageSize(fm.imageSize),
    images: Array.isArray(fm.images) ? fm.images.map(String) : [],
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
