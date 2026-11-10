import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, PresenceContext } from "framer-motion";
import type { ImageSize, Project } from "../../types/project";
import { RISE_STAGGER, RISE_TRANSITION, ZOOM_TRANSITION } from "../../utils/motion";
import { StripImage } from "./StripImage";
import styles from "./ProjectPager.module.css";

interface ProjectPagerProps {
  projects: Project[];
  activeIndex: number;
  // Called when native scrolling settles a different project into view.
  onActiveChange: (slug: string) => void;
  // The "Next" link at the bottom of a project's page.
  onSelectProject: (slug: string) => void;
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
//
// The project's title and a "Next" hint sit at the bottom of its page: they
// stay put while the strip scrolls sideways and move with the page between
// projects. The description is the strip's second item, a card right after
// the full-screen first image, so swiping on reads it before the rest of the
// images.
//
// The list loops: a copy of the last project sits above the first and a copy
// of the first below the last. Scrolling onto a copy looks like wrapping
// around, and once the scroll settles the pager jumps, invisibly, to the real
// page it copies.
//
// Which project is active is only reported once a scroll has fully settled
// (finger up, momentum and snapping done), so nothing re-renders while a page
// is still moving.
export function ProjectPager({
  projects,
  activeIndex,
  onActiveChange,
  onSelectProject,
  onImageClick,
}: ProjectPagerProps) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const active = projects[activeIndex] ?? projects[0];
  // Only the images on screen when the page opens rise in.
  const [intro, setIntro] = useState(true);
  useEffect(() => setIntro(false), []);
  // Which image sits under the active strip's center.
  const [position, setPosition] = useState(0);
  // Projects whose first item has loaded enough to know its size. Until then
  // a first item without a build-time aspect ratio is 0px wide, which would
  // leave the description card showing in its place.
  const [sized, setSized] = useState<ReadonlySet<string>>(() => new Set());
  const markSized = (slug: string) =>
    setSized((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));

  const activeSlugRef = useRef(active?.slug);
  activeSlugRef.current = active?.slug;
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;
  // The project the pager rests on, or is scrolling to. An activeIndex that
  // matches it came from scrolling, so there's nothing to scroll to.
  const inViewRef = useRef<string | null>(null);

  const pageFor = (slug: string, copy?: "head" | "tail") =>
    pagerRef.current?.querySelector<HTMLElement>(
      `[data-project-slug="${CSS.escape(slug)}"]` +
        (copy ? `[data-copy="${copy}"]` : ":not([data-copy])"),
    ) ?? null;

  const measure = () => {
    const strip = activeSlugRef.current
      ? pageFor(activeSlugRef.current)?.firstElementChild
      : null;
    if (!(strip instanceof HTMLElement)) return;
    const group = strip.firstElementChild;
    const center = strip.scrollLeft + strip.clientWidth / 2;
    // The description card isn't an image, so it doesn't count; while it's
    // centered the counter stays on the first image.
    let index = 0;
    Array.from(group?.children ?? [])
      .filter((child) => !(child as HTMLElement).dataset.info)
      .forEach((child, i) => {
        if ((child as HTMLElement).offsetLeft <= center) index = i;
      });
    setPosition(index);
  };

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
    // "Next" on the last project carries on down into the copy of the first,
    // so it reads as continuing the scroll rather than rewinding to the top.
    const wraps =
      !first &&
      projects.length > 1 &&
      inViewRef.current === projects[projects.length - 1]?.slug &&
      slug === projects[0]?.slug;
    const page = pageFor(slug, wraps ? "tail" : undefined);
    if (!page) return;
    // Arriving there won't need reporting; a touch that interrupts the scroll
    // reports wherever it does land.
    inViewRef.current = slug;
    pager.scrollTo({ top: page.offsetTop, behavior: first ? "auto" : "smooth" });
  }, [active?.slug]);

  // Scroll events don't bubble, but a capturing listener on the pager hears
  // every strip's. rAF-throttled.
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    let frame = 0;
    let settleTimer = 0;
    let touching = false;

    // The scroll has come to rest: find the page it rests on. A loop copy is
    // swapped for the real page at the same spot (its horizontal position
    // carried over, so nothing visibly moves). Then report the project, if
    // it's a new one.
    const settle = () => {
      if (touching) return;
      const page = Array.from(
        pager.querySelectorAll<HTMLElement>("[data-project-slug]"),
      ).find((el) => Math.abs(el.offsetTop - pager.scrollTop) < 2);
      const slug = page?.dataset.projectSlug;
      if (!page || !slug) return;
      if (page.dataset.copy) {
        const real = pageFor(slug);
        if (!real) return;
        const copyStrip = page.firstElementChild as HTMLElement | null;
        const realStrip = real.firstElementChild as HTMLElement | null;
        if (copyStrip && realStrip) realStrip.scrollLeft = copyStrip.scrollLeft;
        pager.scrollTo({ top: real.offsetTop, behavior: "auto" });
      }
      inViewRef.current = slug;
      if (slug !== activeSlugRef.current) onActiveChangeRef.current(slug);
    };

    // Native scrollend fires once momentum and snapping are done. Where it's
    // missing, a pause in scroll events stands in for it. Either way, never
    // while a finger is down: that's a drag paused, not a scroll ended.
    const hasScrollEnd = "onscrollend" in window;

    const onScroll = (event: Event) => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
      if (!hasScrollEnd && event.target === pager) {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(settle, 150);
      }
    };
    const onScrollEnd = (event: Event) => {
      if (event.target === pager) settle();
    };
    const onTouchStart = () => {
      touching = true;
      window.clearTimeout(settleTimer);
    };
    // A finger lifted without moving the pager fires no scrollend, so check
    // here too; if it's still moving, settle finds no page edge and waits.
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length) return;
      touching = false;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 150);
    };

    pager.addEventListener("scroll", onScroll, { capture: true, passive: true });
    pager.addEventListener("scrollend", onScrollEnd);
    pager.addEventListener("touchstart", onTouchStart, { passive: true });
    pager.addEventListener("touchend", onTouchEnd, { passive: true });
    pager.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      pager.removeEventListener("scroll", onScroll, { capture: true });
      pager.removeEventListener("scrollend", onScrollEnd);
      pager.removeEventListener("touchstart", onTouchStart);
      pager.removeEventListener("touchend", onTouchEnd);
      pager.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, []);

  useEffect(measure, [active?.slug]);

  if (!active) return null;

  const imageCount = active.images.length;

  const first = projects[0];
  const last = projects[projects.length - 1];
  const pages: { project: Project; copy?: "head" | "tail" }[] = [
    ...(projects.length > 1 && last ? [{ project: last, copy: "head" as const }] : []),
    ...projects.map((project) => ({ project })),
    ...(projects.length > 1 && first ? [{ project: first, copy: "tail" as const }] : []),
  ];

  return (
    <>
      <div ref={pagerRef} className={styles.pager}>
        {/* Keep strip images out of the route's AnimatePresence: their
            layoutId makes each one register for presence, which can block the
            detail route's exit (see ScrollStrip). */}
        <PresenceContext.Provider value={null}>
          {pages.map(({ project, copy }) => {
            // The project's largest image sets the scale for the rest.
            const largest = project.images.reduce<ImageSize>(
              (max, img) => (img.size > max ? img.size : max),
              1,
            );
            const rise = intro && !copy && project.slug === active.slug;
            const firstSized = !!project.images[0]?.aspect || sized.has(project.slug);
            // The next project, wrapping to the first: the hint says swiping
            // down moves on, and a tap does the same.
            const next = projects.length > 1
              ? projects[(projects.indexOf(project) + 1) % projects.length]
              : undefined;
            return (
              <section
                key={copy ? `${copy}-${project.slug}` : project.slug}
                className={styles.page}
                data-project-slug={project.slug}
                data-copy={copy}
                aria-hidden={copy ? true : undefined}
              >
                <div className={styles.strip}>
                  <div className={styles.group}>
                    {project.images.map((img, i) => (
                      <Fragment key={img.src + i}>
                        <StripImage
                          slug={project.slug}
                          index={i}
                          src={img.full}
                          original={img.src}
                          aspect={img.aspect}
                          placeholder={img.isVideo ? img.poster : img.thumb}
                          alt={img.alt || `${project.title} — ${i + 1}`}
                          size={img.size}
                          largest={largest}
                          isVideo={img.isVideo}
                          rise={rise}
                          shared={!copy}
                          onClick={(e) => onImageClick(project, i, e)}
                          onReady={i === 0 ? () => markSized(project.slug) : undefined}
                        />
                        {i === 0 && (
                          // Rises in step with the image slot it takes.
                          <motion.div
                            className={styles.info}
                            data-info="true"
                            initial={rise ? { y: window.innerHeight } : false}
                            animate={{ y: 0 }}
                            transition={{ ...RISE_TRANSITION, delay: RISE_STAGGER }}
                            style={firstSized ? undefined : { visibility: "hidden" }}
                          >
                            <p className={styles.description}>{project.description}</p>
                          </motion.div>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>
                {/* Outside the strip, so it doesn't scroll sideways. Fades in
                    behind the rise, like the counter. */}
                <motion.div
                  className={styles.caption}
                  initial={rise ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ ...ZOOM_TRANSITION, delay: 0.35 }}
                >
                  <h2 className={styles.title}>{project.title}</h2>
                  {next && (
                    <button
                      type="button"
                      className={styles.next}
                      onClick={() => onSelectProject(next.slug)}
                      aria-label={`View ${next.title}`}
                      tabIndex={copy ? -1 : undefined}
                    >
                      Next ↓
                    </button>
                  )}
                </motion.div>
              </section>
            );
          })}
        </PresenceContext.Provider>
      </div>

      {/* The first image fills the screen, so a cropped edge alone doesn't
          say there's more to the right. A counter spells it out, arriving
          with the caption, after the rise. */}
      {imageCount > 1 && (
        <motion.div
          className={styles.position}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...ZOOM_TRANSITION, delay: 0.35 }}
          aria-hidden="true"
        >
          <span className={styles.counter}>
            {position + 1} / {imageCount}
          </span>
        </motion.div>
      )}
    </>
  );
}
