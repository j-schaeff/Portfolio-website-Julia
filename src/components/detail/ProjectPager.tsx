import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, PresenceContext } from "framer-motion";
import type { ImageSize, Project } from "../../types/project";
import { ZOOM_TRANSITION } from "../../utils/motion";
import { StripImage } from "./StripImage";
import styles from "./ProjectPager.module.css";

interface ProjectPagerProps {
  projects: Project[];
  activeIndex: number;
  // Called when native scrolling settles a different project into view.
  onActiveChange: (slug: string) => void;
  onImageClick: (
    project: Project,
    index: number,
    event: React.MouseEvent<HTMLElement>,
  ) => void;
}

// Mobile detail view: every project is a full-screen page in one vertical,
// snapping scroller, each holding its own horizontal image strip. Moving
// between projects is ordinary scrolling, so the finger drives it directly;
// selecting a project elsewhere (the "Next" link) smooth-scrolls to its page,
// the same motion a swipe makes.
export function ProjectPager({
  projects,
  activeIndex,
  onActiveChange,
  onImageClick,
}: ProjectPagerProps) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const active = projects[activeIndex] ?? projects[0];
  // Only the images on screen when the page opens rise in.
  const [intro, setIntro] = useState(true);
  useEffect(() => setIntro(false), []);
  // Which image sits under the active strip's center, and how far through
  // the strip the visitor has scrolled (0–1).
  const [position, setPosition] = useState({ index: 0, progress: 0 });

  const activeSlugRef = useRef(active?.slug);
  activeSlugRef.current = active?.slug;
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  // The project the pager last reported as in view. An activeIndex that
  // matches it came from scrolling, so there's nothing to scroll to.
  const inViewRef = useRef<string | null>(null);
  // Set while smooth-scrolling to a selected project, so the pages passed on
  // the way don't get reported (and flash their descriptions).
  const targetRef = useRef<string | null>(null);

  const pageFor = (slug: string) =>
    pagerRef.current?.querySelector<HTMLElement>(
      `[data-project-slug="${CSS.escape(slug)}"]`,
    ) ?? null;

  const measure = () => {
    const strip = activeSlugRef.current
      ? pageFor(activeSlugRef.current)?.firstElementChild
      : null;
    if (!(strip instanceof HTMLElement)) return;
    const group = strip.firstElementChild;
    const center = strip.scrollLeft + strip.clientWidth / 2;
    let index = 0;
    Array.from(group?.children ?? []).forEach((child, i) => {
      if ((child as HTMLElement).offsetLeft <= center) index = i;
    });
    const range = strip.scrollWidth - strip.clientWidth;
    const progress = range > 0 ? strip.scrollLeft / range : 0;
    setPosition({ index, progress });
  };

  // A page counts as in view once it covers half the screen.
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const slug = (entry.target as HTMLElement).dataset.projectSlug;
          if (!slug) continue;
          if (targetRef.current) {
            if (slug !== targetRef.current) continue;
            targetRef.current = null;
          }
          inViewRef.current = slug;
          if (slug !== activeSlugRef.current) onActiveChangeRef.current(slug);
        }
      },
      { root: pager, threshold: 0.5 },
    );

    pager
      .querySelectorAll("[data-project-slug]")
      .forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [projects]);

  // Bring the active project into view when it was chosen some other way than
  // scrolling: instantly on first render (landing on a project's URL), with a
  // smooth scroll afterwards.
  const mountedRef = useRef(false);
  useLayoutEffect(() => {
    const pager = pagerRef.current;
    const slug = active?.slug;
    const first = !mountedRef.current;
    mountedRef.current = true;
    if (!pager || !slug || slug === inViewRef.current) return;
    const page = pageFor(slug);
    if (!page) return;
    targetRef.current = slug;
    pager.scrollTo({ top: page.offsetTop, behavior: first ? "auto" : "smooth" });
  }, [active?.slug]);

  // Scroll events don't bubble, but a capturing listener on the pager hears
  // every strip's. rAF-throttled.
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };
    pager.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      pager.removeEventListener("scroll", onScroll, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(measure, [active?.slug]);

  if (!active) return null;

  const imageCount = active.images.length;

  return (
    <>
      <div
        ref={pagerRef}
        className={styles.pager}
        // A touch takes over from a smooth scroll in progress, so stop
        // waiting for its target.
        onTouchStart={() => {
          targetRef.current = null;
        }}
      >
        {/* Keep strip images out of the route's AnimatePresence: their
            layoutId makes each one register for presence, which can block the
            detail route's exit (see ScrollStrip). */}
        <PresenceContext.Provider value={null}>
          {projects.map((project) => {
            // The project's largest image sets the scale for the rest.
            const largest = project.images.reduce<ImageSize>(
              (max, img) => (img.size > max ? img.size : max),
              1,
            );
            return (
              <section
                key={project.slug}
                className={styles.page}
                data-project-slug={project.slug}
              >
                <div className={styles.strip}>
                  <div className={styles.group}>
                    {project.images.map((img, i) => (
                      <StripImage
                        key={img.src + i}
                        slug={project.slug}
                        index={i}
                        src={img.src}
                        alt={img.alt || `${project.title} — ${i + 1}`}
                        size={img.size}
                        largest={largest}
                        isVideo={img.isVideo}
                        rise={intro && project.slug === active.slug}
                        onClick={(e) => onImageClick(project, i, e)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}
        </PresenceContext.Provider>
      </div>

      {/* The first image fills the screen, so a cropped edge alone doesn't
          say there's more to the right. A counter and a thin progress bar
          spell it out. Both arrive with the metadata, after the rise. */}
      {imageCount > 1 && (
        <motion.div
          className={styles.position}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...ZOOM_TRANSITION, delay: 0.35 }}
          aria-hidden="true"
        >
          <span className={styles.counter}>
            {position.index + 1} / {imageCount}
          </span>
          <span
            className={styles.progress}
            style={{ transform: `scaleX(${position.progress})` }}
          />
        </motion.div>
      )}
    </>
  );
}
