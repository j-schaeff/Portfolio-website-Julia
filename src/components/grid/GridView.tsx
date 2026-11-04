import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { introPending, markIntroPlayed } from "../../utils/intro";
import { useRowReveal } from "../../hooks/useRowReveal";
import { LOGO_KEY, useJustifiedRows } from "../../hooks/useJustifiedRows";
import { GRID_EXIT_TRANSITION, ZOOM_TRANSITION } from "../../utils/motion";
import { GridItem } from "./GridItem";
import { LogoCell, LogoOverlay } from "./Logo";
import styles from "./GridView.module.css";

export function GridView() {
  const { projects } = useProjects();
  const gridRef = useRef<HTMLElement>(null);
  // Logo + row reveal only when the visitor first enters the site (or
  // refreshes); coming back from a project just fades the grid in.
  const [freshLoad] = useState(introPending);
  useEffect(markIntroPlayed, []);
  const { widths, hanging, reportAspect } = useJustifiedRows(gridRef, projects);
  const { state: reveal, logo, logoGone } = useRowReveal(gridRef, freshLoad, widths !== null);

  return (
    <motion.main
      ref={gridRef}
      className={styles.grid}
      data-reveal={reveal ?? undefined}
      // While the reveal plays, the per-cell reveal is the entrance, so the
      // container must be visible immediately instead of fading in as a block.
      initial={{ opacity: reveal ? 1 : 0 }}
      animate={{ opacity: 1 }}
      // Fade out quickly as we hand off to the detail page, whose strip images
      // rise in from the bottom over the fading grid.
      exit={{ opacity: 0, transition: GRID_EXIT_TRANSITION }}
      transition={ZOOM_TRANSITION}
    >
      {/* Loading screen: stays over the grid while the reveal plays beneath
          it, then slides down out of view; the grid's copy appears after. */}
      <AnimatePresence onExitComplete={logoGone}>
        {logo === "overlay" && <LogoOverlay key="logo-overlay" />}
      </AnimatePresence>
      {projects.map((project) => (
        <GridItem
          key={project.slug}
          project={project}
          cellWidths={widths}
          hangingCells={hanging}
          onAspect={reportAspect}
          playVideos={reveal !== "loading"}
        />
      ))}
      <LogoCell width={widths?.[LOGO_KEY]} showMark={logo === "gone"} />
    </motion.main>
  );
}
