import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GRID_EXIT_TRANSITION } from "../../utils/motion";
import { useProjects } from "../../hooks/useProjects";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { markIntroPlayed } from "../../utils/intro";
import { useIsMobile } from "../../hooks/useIsMobile";
import { ScrollStrip } from "./ScrollStrip";
import { ProjectPager } from "./ProjectPager";
import { DetailMeta, metaHeight } from "./DetailMeta";
import { ProjectHint } from "./ProjectHint";
import styles from "./DetailView.module.css";

export function DetailView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  // Landing straight on a project still counts as entering the site, so the
  // index's logo intro won't play when the visitor heads there next.
  useEffect(markIntroPlayed, []);
  useBodyScrollLock(true);

  const projectSlug = searchParams.get("project") ?? projects[0]?.slug ?? null;
  const activeIndex = projectSlug
    ? Math.max(projects.findIndex((project) => project.slug === projectSlug), 0)
    : 0;
  const active = projects[activeIndex] ?? projects[0];
  const isMobile = useIsMobile();
  const wheelDeltaRef = useRef(0);
  const lastTriggerRef = useRef(0);
  const lastWheelRef = useRef(0);

  useEffect(() => {
    // On mobile the projects are a real vertical scroller (ProjectPager), so
    // the wheel is left to it.
    if (isMobile) return;

    const onWheel = (event: WheelEvent) => {
      const deltaY = event.deltaY;
      const now = Date.now();

      // A pause ends the gesture, so stray vertical drift from earlier swipes
      // can't add up to a project switch.
      if (now - lastWheelRef.current > 200) wheelDeltaRef.current = 0;
      lastWheelRef.current = now;

      // Horizontal swipes belong to the media strip; trackpads add a little
      // vertical drift to them, which mustn't count toward switching projects.
      if (Math.abs(event.deltaX) > Math.abs(deltaY)) {
        wheelDeltaRef.current = 0;
        return;
      }

      if (Math.abs(deltaY) < 4) return;
      if (now - lastTriggerRef.current < 460) return;

      if (wheelDeltaRef.current !== 0 && Math.sign(wheelDeltaRef.current) !== Math.sign(deltaY)) {
        wheelDeltaRef.current = 0;
      }

      wheelDeltaRef.current += deltaY;
      const threshold = 150;

      if (Math.abs(wheelDeltaRef.current) < threshold) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      lastTriggerRef.current = now;

      const nextIndex = (activeIndex + direction + projects.length) % projects.length;
      const nextProject = projects[nextIndex];

      if (nextProject && nextProject.slug !== projectSlug) {
        setSearchParams({ project: nextProject.slug }, { replace: true });
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [activeIndex, projectSlug, projects, setSearchParams, isMobile]);

  useEffect(() => {
    // Touch screens on this layout (tablets, a phone turned sideways) have no
    // wheel, so a vertical swipe switches the project instead. Sideways swipes
    // stay with the strip, and swipes that start in the description are left
    // to it, since on a short screen it scrolls.
    if (isMobile) return;

    let start: { x: number; y: number } | null = null;

    const onTouchStart = (event: TouchEvent) => {
      const target = event.target as Element | null;
      start =
        event.touches.length === 1 && !target?.closest("[data-meta-scroll]")
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      start = null;

      if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) * 1.5) return;
      const now = Date.now();
      if (now - lastTriggerRef.current < 460) return;
      lastTriggerRef.current = now;

      // Swiping up (finger moves up) goes to the next project, like scrolling down.
      const direction = dy < 0 ? 1 : -1;
      const nextProject = projects[(activeIndex + direction + projects.length) % projects.length];
      if (nextProject && nextProject.slug !== projectSlug) {
        setSearchParams({ project: nextProject.slug }, { replace: true });
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [activeIndex, projectSlug, projects, setSearchParams, isMobile]);

  if (!active) return null;

  const handleProjectSelect = (slug: string) => {
    setSearchParams({ project: slug }, { replace: true });
  };

  const goToIndex = () => {
    // The router basename already supplies the deploy subpath.
    navigate("/", { replace: true });
  };

  return (
    <motion.div
      className={styles.detail}
      // Lets the strip CSS end its images just above the metadata block.
      style={{ "--meta-h": `${metaHeight(projects)}px` } as React.CSSProperties}
      // The page has an opaque background (see the CSS), so fade it in in step
      // with the grid's exit to keep the handoff a crossfade.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={GRID_EXIT_TRANSITION}
    >
      {/* Mobile: a still band behind the top controls (see the CSS). */}
      <div className={styles.safeTop} aria-hidden="true" />

      <button
        type="button"
        className={styles.back}
        onClick={goToIndex}
      >
        Index
      </button>

      {isMobile ? (
        <ProjectPager
          projects={projects}
          activeIndex={activeIndex}
          onActiveChange={handleProjectSelect}
          onSelectProject={handleProjectSelect}
        />
      ) : (
        <ScrollStrip
          projects={projects}
          activeIndex={activeIndex}
        />
      )}

      {/* On mobile the pager shows each project's text in its own strip. */}
      {!isMobile && (
        <DetailMeta
          projects={projects}
          active={active}
        />
      )}

      {/* Desktop/tablet: project rail + "scroll to switch" hint. */}
      {!isMobile && (
        <ProjectHint
          projects={projects}
          activeIndex={activeIndex}
          onSelect={handleProjectSelect}
        />
      )}
    </motion.div>
  );
}
