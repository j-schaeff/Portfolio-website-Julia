import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { useAnimation } from "../../context/AnimationContext";
import { useSnakeReveal } from "../../hooks/useSnakeReveal";
import { focalOrigin } from "../../utils/layoutId";
import { GRID_EXIT_SCALE, ZOOM_TRANSITION } from "../../utils/motion";
import { GridItem } from "./GridItem";
import styles from "./GridView.module.css";

export function GridView() {
  const { projects } = useProjects();
  const { origin } = useAnimation();
  const gridRef = useRef<HTMLElement>(null);
  // Snake-reveal only on a true page load. Returning from a project always
  // carries an origin (it drives the shared-element zoom back), so capture
  // "no origin at mount" once and let the snake play just for fresh loads.
  const [freshLoad] = useState(() => origin === null);
  const snake = useSnakeReveal(gridRef, freshLoad);

  return (
    <motion.main
      ref={gridRef}
      className={styles.grid}
      data-snake={snake ?? undefined}
      style={{ transformOrigin: focalOrigin(origin?.rect) }}
      // While the snake plays, the per-cell reveal is the entrance, so the
      // container must be visible immediately instead of fading in as a block.
      initial={{ opacity: snake ? 1 : 0 }}
      animate={{ opacity: 1, scale: 1 }}
      // Dive into the clicked tile: scale up hard around it and fade so the
      // surrounding tiles sweep past the camera as we hand off to the detail page.
      exit={{ opacity: 0, scale: GRID_EXIT_SCALE }}
      transition={ZOOM_TRANSITION}
    >
      {projects.map((project) => (
        <GridItem key={project.slug} project={project} />
      ))}
    </motion.main>
  );
}
