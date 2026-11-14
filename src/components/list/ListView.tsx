import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { markIntroPlayed } from "../../utils/intro";
import { GRID_EXIT_TRANSITION } from "../../utils/motion";
import styles from "./ListView.module.css";

// Every project as one line, in the same order and type styles as the index.
export function ListView() {
  const { projects } = useProjects();
  const navigate = useNavigate();
  // Like About, landing here counts as entering the site.
  useEffect(markIntroPlayed, []);

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

      <ul className={styles.rows}>
        {projects.map((project) => (
          <li key={project.slug}>
            <Link
              to={`/project?project=${encodeURIComponent(project.slug)}`}
              className={styles.row}
            >
              <span className={styles.title}>{project.title}</span>
              <span className={styles.type}>{project.type}</span>
              <span className={styles.type}>{project.client}</span>
              <span className={`${styles.type} ${styles.year}`}>
                {project.year || ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
