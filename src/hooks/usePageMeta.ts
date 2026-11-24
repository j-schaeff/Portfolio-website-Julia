import { useEffect } from "react";

const SITE = "julia schäffler";
// Keep in step with index.html and vite/content.ts.
export const SITE_DESCRIPTION =
  "julia schäffler — creative culinary concepts, art direction, graphic and web design.";

// Keeps the tab title and description in step with the page as the app
// moves between routes. The prerendered HTML (vite/content.ts) starts each
// page with the same values, so crawlers and share previews see them too.
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : SITE;
    if (description === undefined) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (meta) meta.content = description.length > 160 ? description.slice(0, 159) + "…" : description;
  }, [title, description]);
}
