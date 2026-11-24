import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { animate, motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { usePageMeta } from "../../hooks/usePageMeta";
import { prefetchProject } from "../../utils/prefetch";
import {
  listIntroPending,
  markIntroPlayed,
  markListIntroPlayed,
} from "../../utils/intro";
import {
  GRID_EXIT_TRANSITION,
  LIST_EDGE_DELAY,
  LIST_EDGE_TRANSITION,
  LIST_ROW_DELAY,
  LIST_ROW_RISE,
  LIST_ROW_STAGGER,
  LIST_ROW_STAGGER_CAP,
  LIST_ROW_TRANSITION,
} from "../../utils/motion";
import styles from "./ListView.module.css";

// Every project as one line, in the same order and type styles as the index.
export function ListView() {
  const { projects } = useProjects();
  const navigate = useNavigate();
  usePageMeta("List", `All projects: ${projects.map((p) => p.title).join(", ")}.`);
  // Like About, landing here counts as entering the site.
  useEffect(markIntroPlayed, []);
  // The row cascade plays on the first visit per page load; read in the
  // initializer, mark in an effect (see intro.ts).
  const [cascade] = useState(listIntroPending);
  useEffect(markListIntroPlayed, []);

  // Bottom up: the last line starts first.
  const rowDelay = (i: number) =>
    LIST_ROW_DELAY +
    Math.min(projects.length - 1 - i, LIST_ROW_STAGGER_CAP) * LIST_ROW_STAGGER;

  // Year and type start right beside their title and slide out to the row's
  // edges. Their start offsets depend on each title's width, so they're
  // measured before paint and played with animate() rather than declared.
  const rowsRef = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    if (!cascade || !rowsRef.current) return;
    const controls = Array.from(
      rowsRef.current.querySelectorAll<HTMLElement>("[data-row]"),
    ).flatMap((row, i) => {
      const [year, title, type] = Array.from(row.children) as HTMLElement[];
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const t = title.getBoundingClientRect();
      const transition = { ...LIST_EDGE_TRANSITION, delay: rowDelay(i) + LIST_EDGE_DELAY };
      // Measured with the spans at rest (transform-free), so the offsets
      // are exact; the year is hidden on phones, so it has no box and stays put.
      const fromYear = t.left - gap - year.getBoundingClientRect().right;
      const fromType = t.right + gap - type.getBoundingClientRect().left;
      return [
        animate(year, { x: [Math.max(0, fromYear), 0], opacity: [0, 1] }, transition),
        animate(type, { x: [Math.min(0, fromType), 0], opacity: [0, 1] }, transition),
      ];
    });
    return () => controls.forEach((c) => c.stop());
    // Runs once, on the cascading first render.
  }, []);

  return (
    <motion.div
      className={styles.list}
      // Opaque and fixed like About, so it crossfades over the grid.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={GRID_EXIT_TRANSITION}
    >
      <button
        type="button"
        className={styles.back}
        // The router basename already supplies the deploy subpath.
        onClick={() => navigate("/", { replace: true })}
      >
        Index
      </button>

      <ul className={styles.rows} ref={rowsRef}>
        {projects.map((project, i) => (
          <li key={project.slug}>
            <Link
              to={`/project/${encodeURIComponent(project.slug)}`}
              className={styles.row}
              onPointerEnter={() => prefetchProject(project)}
              onTouchStart={() => prefetchProject(project)}
              data-row
            >
              {/* Hidden until animate() picks them up, so they don't flash at
                  their resting place first. Motion moves them with transform;
                  the hover indents use translate, so the two don't clash. */}
              <span
                className={`${styles.type} ${styles.year}`}
                style={cascade ? { opacity: 0 } : undefined}
              >
                {project.year || ""}
              </span>
              <motion.span
                className={styles.title}
                initial={cascade ? { opacity: 0, y: LIST_ROW_RISE } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...LIST_ROW_TRANSITION, delay: rowDelay(i) }}
              >
                {project.title}
              </motion.span>
              <span
                className={styles.type}
                style={cascade ? { opacity: 0 } : undefined}
              >
                {project.type}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
