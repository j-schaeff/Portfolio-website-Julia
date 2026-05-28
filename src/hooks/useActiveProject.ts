import { useEffect, useState, type RefObject } from "react";

/**
 * Tracks which project section is under the horizontal center of the scroll
 * container. Sections must carry a `data-project-slug` attribute.
 */
export function useActiveProject(
  containerRef: RefObject<HTMLElement | null>,
  initialSlug: string | null,
): string | null {
  const [active, setActive] = useState<string | null>(initialSlug);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLElement>("[data-project-slug]"),
    );
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const slug = (entry.target as HTMLElement).dataset.projectSlug;
            if (slug) setActive(slug);
          }
        }
      },
      // Collapse the root to a vertical line at the horizontal center, so the
      // element crossing the center is reported as active.
      { root: container, rootMargin: "0px -50% 0px -50%", threshold: 0 },
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef]);

  return active;
}
