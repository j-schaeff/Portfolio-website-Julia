import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { useAnimation } from "../../context/AnimationContext";
import { useSnakeReveal } from "../../hooks/useSnakeReveal";
import { useJustifiedRows } from "../../hooks/useJustifiedRows";
import { ZOOM_TRANSITION } from "../../utils/motion";
import { GridItem } from "./GridItem";
import styles from "./GridView.module.css";

export function GridView() {
  const { projects } = useProjects();
  const { origin, clearOrigin } = useAnimation();
  const gridRef = useRef<HTMLElement>(null);
  // Snake-reveal only on a true page load. Returning from a project always
  // carries an origin (it drives the shared-element zoom back), so capture
  // "no origin at mount" once and let the snake play just for fresh loads.
  const [freshLoad] = useState(() => origin === null);
  const snake = useSnakeReveal(gridRef, freshLoad);
  const { widths, reportAspect } = useJustifiedRows(gridRef, projects);

  return (
    <motion.main
      ref={gridRef}
      className={styles.grid}
      data-snake={snake ?? undefined}
      // While the snake plays, the per-cell reveal is the entrance, so the
      // container must be visible immediately instead of fading in as a block.
      initial={{ opacity: snake ? 1 : 0 }}
      animate={{ opacity: 1 }}
      // Fade out as we hand off to the detail page. The clicked image keeps its
      // shared layoutId and morphs into its detail strip slot on its own.
      exit={{ opacity: 0 }}
      onAnimationComplete={() => {
        if (origin) clearOrigin();
      }}
      transition={ZOOM_TRANSITION}
    >
      {projects.map((project) => (
        <GridItem
          key={project.slug}
          project={project}
          cellWidths={widths}
          onAspect={reportAspect}
        />
      ))}
    </motion.main>
  );
}
