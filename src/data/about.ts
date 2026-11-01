import matter from "gray-matter";
import raw from "/content/about.md?raw";

export interface AboutLink {
  label: string;
  url: string;
}

export interface About {
  // One entry per paragraph (blank-line separated in the CMS text field).
  paragraphs: string[];
  links: AboutLink[];
}

function toAbout(source: string): About {
  const fm = matter(source).data as Record<string, unknown>;
  const links = Array.isArray(fm.links) ? fm.links : [];

  return {
    paragraphs: String(fm.bio ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    links: links
      .map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return { label: String(e.label ?? ""), url: String(e.url ?? "") };
      })
      .filter((link) => link.label && link.url),
  };
}

export const about: About = toAbout(raw);
