import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { introPending, markIntroPlayed } from "../../utils/intro";
import { useSnakeReveal } from "../../hooks/useSnakeReveal";
import { LOGO_KEY, useJustifiedRows } from "../../hooks/useJustifiedRows";
import { GRID_EXIT_TRANSITION, ZOOM_TRANSITION } from "../../utils/motion";
import { GridItem } from "./GridItem";
import { LogoCell, LogoOverlay } from "./Logo";
import styles from "./GridView.module.css";

export function GridView() {
  const { projects } = useProjects();
  const gridRef = useRef<HTMLElement>(null);
  // Logo + snake reveal only when the visitor first enters the site (or
  // refreshes); coming back from a project just fades the grid in.
  const [freshLoad] = useState(introPending);
  useEffect(markIntroPlayed, []);
  const { widths, reportAspect } = useJustifiedRows(gridRef, projects);
  const { state: snake, logo, logoGone } = useSnakeReveal(gridRef, freshLoad, widths !== null);

  return (
    <motion.main
      ref={gridRef}
      className={styles.grid}
      data-snake={snake ?? undefined}
      // While the snake plays, the per-cell reveal is the entrance, so the
      // container must be visible immediately instead of fading in as a block.
      initial={{ opacity: snake ? 1 : 0 }}
      animate={{ opacity: 1 }}
      // Fade out quickly as we hand off to the detail page, whose strip images
      // rise in from the bottom over the fading grid.
      exit={{ opacity: 0, transition: GRID_EXIT_TRANSITION }}
      transition={ZOOM_TRANSITION}
    >
      {/* Loading screen: stays over the grid while the snake plays beneath
          it, then slides down out of view; the grid's copy appears after. */}
      <AnimatePresence onExitComplete={logoGone}>
        {logo === "overlay" && <LogoOverlay key="logo-overlay" />}
      </AnimatePresence>
      {projects.map((project) => (
        <GridItem
          key={project.slug}
          project={project}
          cellWidths={widths}
          onAspect={reportAspect}
        />
      ))}
      <LogoCell width={widths?.[LOGO_KEY]} showMark={logo === "gone"} />
    </motion.main>
  );
}
