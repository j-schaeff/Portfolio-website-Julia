import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "../../types/project";
import { EASE, NUDGE_DELAY, ZOOM_TRANSITION } from "../../utils/motion";
import { markScrollHintSeen, scrollHintPending } from "../../utils/intro";
import styles from "./ProjectHint.module.css";

interface ProjectHintProps {
  projects: Project[];
  activeIndex: number;
  onSelect: (slug: string) => void;
}

// Desktop/tablet only: scrolling up or down switches the project (DetailView),
// which nothing else on the page reveals. A vertical rail of ticks on the
// right edge — one per project, the active one longer — reads as "this goes
// up and down" without words, and the active tick sliding along it on each
// switch ties the scroll to the movement. Until the first switch, the active
// tick also nudges down and a small "Scroll" label sits beside the rail (the
// desktop take on the mobile strip's sideways nudge). Each tick also jumps
// straight to its project.
export function ProjectHint({ projects, activeIndex, onSelect }: ProjectHintProps) {
  const [showHint, setShowHint] = useState(scrollHintPending);
  const firstIndex = useRef(activeIndex);

  useEffect(() => {
    if (activeIndex === firstIndex.current) return;
    markScrollHintSeen();
    setShowHint(false);
  }, [activeIndex]);

  // Lands after the strip's rise and the metadata fade-in.
  const delay = NUDGE_DELAY + 0.2;

  return (
    <motion.nav
      className={styles.rail}
      aria-label="Projects"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...ZOOM_TRANSITION, delay }}
    >
      <AnimatePresence initial={false}>
        {showHint && (
          <motion.span
            className={styles.scroll}
            aria-hidden="true"
            exit={{ opacity: 0 }}
            transition={ZOOM_TRANSITION}
          >
            Scroll
          </motion.span>
        )}
      </AnimatePresence>

      {projects.map((project, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={project.slug}
            type="button"
            className={styles.item}
            aria-label={project.title}
            aria-current={active ? "true" : undefined}
            onClick={() => onSelect(project.slug)}
          >
            <span className={styles.label} aria-hidden="true">
              {project.title}
            </span>
            <motion.span
              className={styles.tick}
              initial={false}
              animate={{
                width: active ? 20 : 8,
                y: active && showHint ? [0, 4, 0] : 0,
              }}
              transition={{
                width: ZOOM_TRANSITION,
                y:
                  active && showHint
                    ? { duration: 0.8, ease: EASE, repeat: 1, delay: delay + ZOOM_TRANSITION.duration }
                    : ZOOM_TRANSITION,
              }}
            />
          </button>
        );
      })}
    </motion.nav>
  );
}
