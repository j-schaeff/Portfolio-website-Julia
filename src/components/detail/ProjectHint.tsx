import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
// which nothing else on the page reveals. A small up arrow stacked over a down
// arrow in the bottom-left corner says "this goes up and down" without words,
// and each one steps to the previous or next project, wrapping around like the
// scroll does. Until the first switch, the down arrow nudges down once (the
// desktop take on the mobile strip's sideways nudge).
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

  const step = (direction: 1 | -1) => {
    const next = projects[(activeIndex + direction + projects.length) % projects.length];
    if (next) onSelect(next.slug);
  };

  const prev = projects[(activeIndex - 1 + projects.length) % projects.length];
  const next = projects[(activeIndex + 1) % projects.length];

  return (
    <motion.nav
      className={styles.arrows}
      aria-label="Projects"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...ZOOM_TRANSITION, delay }}
    >
      <button
        type="button"
        className={styles.arrow}
        aria-label={prev ? `Previous project: ${prev.title}` : "Previous project"}
        onClick={() => step(-1)}
      >
        <Chevron up />
      </button>
      <motion.button
        type="button"
        className={styles.arrow}
        aria-label={next ? `Next project: ${next.title}` : "Next project"}
        onClick={() => step(1)}
        initial={false}
        animate={{ y: showHint ? [0, 4, 0] : 0 }}
        transition={
          showHint
            ? { duration: 0.8, ease: EASE, repeat: 1, delay: delay + ZOOM_TRANSITION.duration }
            : ZOOM_TRANSITION
        }
      >
        <Chevron />
      </motion.button>
    </motion.nav>
  );
}

function Chevron({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
      <path
        d={up ? "M1 7l5-5 5 5" : "M1 1l5 5 5-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
