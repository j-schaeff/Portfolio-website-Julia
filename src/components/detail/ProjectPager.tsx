import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, PresenceContext } from "framer-motion";
import type { ImageSize, Project } from "../../types/project";
import {
  NUDGE_DELAY,
  NUDGE_PEEK,
  NUDGE_TRANSITION,
  ZOOM_TRANSITION,
} from "../../utils/motion";
import { StripImage } from "./StripImage";
import { JustifiedText } from "../JustifiedText";
import styles from "./ProjectPager.module.css";

interface ProjectPagerProps {
  projects: Project[];
  activeIndex: number;
  // Called when native scrolling settles a different project into view.
  onActiveChange: (slug: string) => void;
  // The "Next" link at the bottom of a project's page.
  onSelectProject: (slug: string) => void;
}

// Mobile detail view: every project is a full-screen page in one vertical,
// snapping scroller, each holding its own horizontal image strip. Moving
// between projects is ordinary scrolling, so the finger drives it directly;
// selecting a project elsewhere (the "Next" link) smooth-scrolls to its page,
// the same motion a swipe makes.
//
// The project's title and a "Next" hint sit at the bottom of its page: they
// stay put while the strip scrolls sideways and move with the page between
// projects.
//
// Tapping an image opens the project's focused view: every image glides up to
// one shared height (detailFocusHeight), so the tapped one is seen whole and
// swiping sideways never changes the height, and the description with client,
// type and year rises in below. Tapping an image again, or moving to another
// project, closes it.
//
// The first image fills the screen, so a cropped edge alone doesn't say
// there's more to the right. Once the entrance rise is done, the strip nudges:
// it slides a little to the left, so the next image's edge peeks in, and eases
// back. It moves the real scroll position, so it shows the actual
// gesture. It plays once per opening of the detail view, not on project
// switches, and a touch stops it where it is.
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
}: ProjectPagerProps) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const active = projects[activeIndex] ?? projects[0];
  // Only the images on screen when the page opens rise in.
  const [intro, setIntro] = useState(true);
  useEffect(() => setIntro(false), []);
  // The tapped image, while its project's focused view is open.
  const [focus, setFocus] = useState<{ slug: string; index: number } | null>(null);
  const toggleFocus = (slug: string, index: number) =>
    setFocus((prev) => (prev ? null : { slug, index }));

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

  // The nudge, once the rise has finished (see the header comment).
  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    let controls: ReturnType<typeof animate> | undefined;
    let touched = false;
    const onTouch = () => {
      touched = true;
      controls?.stop();
    };
    const timer = window.setTimeout(() => {
      if (touched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const slug = activeSlugRef.current;
      const strip = slug ? pageFor(slug)?.firstElementChild : null;
      if (!(strip instanceof HTMLElement) || strip.scrollLeft > 0) return;
      // A lone image has nothing after it to hint at.
      if ((strip.firstElementChild?.childElementCount ?? 0) < 2) return;
      // Far enough to bring the first image's right edge on screen with a
      // little of what follows it: a landscape image at full height runs well
      // past the screen, and a fixed nudge would only slide its picture.
      const firstItem = strip.firstElementChild?.firstElementChild;
      const firstRight = firstItem
        ? firstItem.getBoundingClientRect().right - strip.getBoundingClientRect().left
        : 0;
      const distance = Math.min(
        Math.max(firstRight - strip.clientWidth + NUDGE_PEEK, NUDGE_PEEK),
        strip.scrollWidth - strip.clientWidth,
      );
      if (distance <= 0) return;
      controls = animate(0, [0, distance, 0], {
        ...NUDGE_TRANSITION,
        // Longer swings take a little longer, so they don't whip.
        duration: NUDGE_TRANSITION.duration + Math.min(distance / 1000, 0.6),
        onUpdate: (value: number) => {
          strip.scrollLeft = value;
        },
      });
    }, NUDGE_DELAY * 1000);
    pager.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.clearTimeout(timer);
      controls?.stop();
      pager.removeEventListener("touchstart", onTouch);
    };
  }, []);

  useEffect(() => {
    const pager = pagerRef.current;
    if (!pager) return;
    let settleTimer = 0;
    let touching = false;

    // The scroll has come to rest: find the page it rests on. A loop copy is
    // swapped for the real page at the same spot (its horizontal position
    // carried over, so nothing visibly moves). Every other page's strip is
    // rewound to its first image — they're all off screen by now — so a
    // project scrolled back to starts from the beginning, not where it was
    // left. Then report the project, if it's a new one.
    const settle = () => {
      if (touching) return;
      const pages = Array.from(pager.querySelectorAll<HTMLElement>("[data-project-slug]"));
      let page = pages.find((el) => Math.abs(el.offsetTop - pager.scrollTop) < 2);
      const slug = page?.dataset.projectSlug;
      if (!page || !slug) return;
      if (page.dataset.copy) {
        const real = pageFor(slug);
        if (!real) return;
        const copyStrip = page.firstElementChild as HTMLElement | null;
        const realStrip = real.firstElementChild as HTMLElement | null;
        if (copyStrip && realStrip) realStrip.scrollLeft = copyStrip.scrollLeft;
        pager.scrollTo({ top: real.offsetTop, behavior: "auto" });
        page = real;
      }
      for (const other of pages) {
        if (other === page) continue;
        const strip = other.firstElementChild as HTMLElement | null;
        if (strip && strip.scrollLeft !== 0) strip.scrollLeft = 0;
      }
      inViewRef.current = slug;
      // Another project's page: its focused view closes (its strip has just
      // been rewound with the rest).
      setFocus((prev) => (prev && prev.slug !== slug ? null : prev));
      if (slug !== activeSlugRef.current) onActiveChangeRef.current(slug);
    };

    // Native scrollend fires once momentum and snapping are done. Where it's
    // missing, a pause in scroll events stands in for it. Either way, never
    // while a finger is down: that's a drag paused, not a scroll ended.
    const hasScrollEnd = "onscrollend" in window;

    const onScroll = () => {
      if (hasScrollEnd) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 150);
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

    pager.addEventListener("scroll", onScroll, { passive: true });
    pager.addEventListener("scrollend", onScrollEnd);
    pager.addEventListener("touchstart", onTouchStart, { passive: true });
    pager.addEventListener("touchend", onTouchEnd, { passive: true });
    pager.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      pager.removeEventListener("scroll", onScroll);
      pager.removeEventListener("scrollend", onScrollEnd);
      pager.removeEventListener("touchstart", onTouchStart);
      pager.removeEventListener("touchend", onTouchEnd);
      pager.removeEventListener("touchcancel", onTouchEnd);
      window.clearTimeout(settleTimer);
    };
  }, []);

  // Keep the tapped image in view while the sizes ease (a CSS height
  // transition on each image, see StripImage): every frame the strip scrolls
  // so the image glides, on the same curve and timing, from where it was on
  // screen to its end spot: centred when the focused view opens, its left
  // edge at the screen's when it closes. Snapping is off until it's done, so
  // it can't pull the strip mid-glide, and a touch hands control back.
  const lastFocusRef = useRef(focus);
  useLayoutEffect(() => {
    const target = focus ?? lastFocusRef.current;
    lastFocusRef.current = focus;
    if (!target) return;
    const strip = pageFor(target.slug)?.firstElementChild;
    const item = strip?.firstElementChild?.children[target.index];
    if (!(strip instanceof HTMLElement) || !(item instanceof HTMLElement)) return;
    // Opening anchors the image's centre, closing its left edge.
    const anchor = () => item.offsetLeft + (focus ? item.offsetWidth / 2 : 0);
    // The transitions start from the old sizes, so this is where it is now.
    const from = anchor() - strip.scrollLeft;
    const to = focus ? strip.clientWidth / 2 : 0;
    strip.style.scrollSnapType = "none";
    const controls = animate(0, 1, {
      ...ZOOM_TRANSITION,
      onUpdate: (p: number) => {
        strip.scrollLeft = anchor() - (from + (to - from) * p);
      },
      onComplete: () => {
        strip.style.scrollSnapType = "";
      },
    });
    const stop = () => {
      controls.stop();
      strip.style.scrollSnapType = "";
    };
    strip.addEventListener("touchstart", stop, { passive: true });
    return () => {
      stop();
      strip.removeEventListener("touchstart", stop);
    };
  }, [focus]);

  if (!active) return null;

  const first = projects[0];
  const last = projects[projects.length - 1];
  const pages: { project: Project; copy?: "head" | "tail" }[] = [
    ...(projects.length > 1 && last ? [{ project: last, copy: "head" as const }] : []),
    ...projects.map((project) => ({ project })),
    ...(projects.length > 1 && first ? [{ project: first, copy: "tail" as const }] : []),
  ];

  return (
    // layoutScroll (here and on each strip): the layout animation measures
    // through both scroll offsets.
    <motion.div ref={pagerRef} className={styles.pager} layoutScroll>
      {/* Keep strip images out of the route's AnimatePresence, so they can't
          block the detail route's exit (see ScrollStrip). */}
      <PresenceContext.Provider value={null}>
        {pages.map(({ project, copy }) => {
          // The project's largest image sets the scale for the rest.
          const largest = project.images.reduce<ImageSize>(
            (max, img) => (img.size > max ? img.size : max),
            1,
          );
          const rise = intro && !copy && project.slug === active.slug;
          // Loop copies never open: they're swapped for the real page as soon
          // as a scroll settles on one.
          const focused = !copy && focus?.slug === project.slug;
          // The next project, wrapping to the first: the hint says swiping
          // down moves on, and a tap does the same.
          const next = projects.length > 1
            ? projects[(projects.indexOf(project) + 1) % projects.length]
            : undefined;
          return (
            <section
              key={copy ? `${copy}-${project.slug}` : project.slug}
              className={`${styles.page} ${focused ? styles.focused : ""}`}
              data-project-slug={project.slug}
              data-copy={copy}
              aria-hidden={copy ? true : undefined}
            >
              <motion.div className={styles.strip} layoutScroll>
                <div className={styles.group}>
                  {project.images.map((img, i) => (
                    <StripImage
                      key={img.src + i}
                      index={i}
                      src={img.full}
                      original={img.src}
                      aspect={img.aspect}
                      placeholder={img.isVideo ? img.poster : img.thumb}
                      alt={img.alt || `${project.title} — ${i + 1}`}
                      size={img.size}
                      largest={largest}
                      isVideo={img.isVideo}
                      hasAudio={img.hasAudio}
                      rise={rise}
                      focused={focused}
                      onTap={copy ? undefined : () => toggleFocus(project.slug, i)}
                    />
                  ))}
                </div>
              </motion.div>
              {/* Outside the strip, so it doesn't scroll sideways. Fades in
                  behind the rise. In the focused view it also holds the
                  project's info, between the title and "Next". */}
              <motion.div
                className={styles.caption}
                initial={rise ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ ...ZOOM_TRANSITION, delay: 0.35 }}
              >
                <h2 className={styles.title}>{project.title}</h2>
                  {/* The focused view's info, right under the title. It grows
                      from no height, in step with the images, so the title
                      rises with it, and fades in a beat behind; closing runs
                      the other way. */}
                  <AnimatePresence>
                    {focused && (
                      <motion.div
                        key="info"
                        className={styles.info}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                          transition: {
                            height: ZOOM_TRANSITION,
                            opacity: { ...ZOOM_TRANSITION, delay: 0.15 },
                          },
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                          transition: {
                            height: ZOOM_TRANSITION,
                            opacity: { duration: 0.25, ease: ZOOM_TRANSITION.ease },
                          },
                        }}
                      >
                        <div className={styles.infoInner}>
                        <JustifiedText className={styles.description} text={project.description} links={project.descriptionLinks} />
                        {/* The desktop metadata row (DetailMeta): client, type and
                            year, below the text. */}
                        <div className={styles.meta}>
                          {project.client && (
                            <span className={styles.label}>
                              {project.clientUrl ? (
                                <a
                                  href={project.clientUrl}
                                  target={project.clientUrl.startsWith("mailto:") ? undefined : "_blank"}
                                  rel="noreferrer"
                                  className={styles.clientLink}
                                >
                                  {project.client}
                                </a>
                              ) : (
                                project.client
                              )}
                            </span>
                          )}
                          <span className={styles.label}>{project.type}</span>
                          <span className={`${styles.label} ${styles.year}`}>{project.year}</span>
                        </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                {next && (
                  <button
                    type="button"
                    className={styles.next}
                    onClick={() => onSelectProject(next.slug)}
                    aria-label={`View ${next.title}`}
                    tabIndex={copy ? -1 : undefined}
                  >
                    {/* Just the arrow: the cue that swiping down (or a tap)
                        moves on. The label says where. */}
                    <span aria-hidden="true">↓</span>
                  </button>
                )}
              </motion.div>
            </section>
          );
        })}
      </PresenceContext.Provider>
    </motion.div>
  );
}
