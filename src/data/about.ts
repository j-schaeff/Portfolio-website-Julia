import matter from "gray-matter";
import raw from "/content/about.md?raw";

export interface AboutLink {
  label: string;
  url: string;
}

export interface About {
  // Always three columns, each a list of paragraphs (blank-line separated in
  // the CMS text field). A blank column stays empty to hold its place.
  columns: string[][];
  links: AboutLink[];
}

function toParagraphs(text: unknown): string[] {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// A bare email address entered in the CMS would otherwise become a relative
// link to a page that doesn't exist; give it the mailto: it was meant to have.
function toHref(url: string): string {
  return /^[^\s@:/]+@[^\s@/]+\.[^\s@/]+$/.test(url) ? `mailto:${url}` : url;
}

function toAbout(source: string): About {
  const fm = matter(source).data as Record<string, unknown>;
  const links = Array.isArray(fm.links) ? fm.links : [];

  return {
    columns: [fm.bio, fm.column2, fm.column3].map(toParagraphs),
    links: links
      .map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return { label: String(e.label ?? ""), url: toHref(String(e.url ?? "").trim()) };
      })
      .filter((link) => link.label && link.url),
  };
}

export const about: About = toAbout(raw);
