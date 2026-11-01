import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { about } from "../../data/about";
import { markIntroPlayed } from "../../utils/intro";
import { GRID_EXIT_TRANSITION } from "../../utils/motion";
import styles from "./AboutView.module.css";

export function AboutView() {
  const navigate = useNavigate();
  // Like landing on a project, landing here counts as entering the site.
  useEffect(markIntroPlayed, []);

  return (
    <motion.div
      className={styles.about}
      // Opaque and fixed like the detail page, so it crossfades over the grid.
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

      <div className={styles.content}>
        {about.paragraphs.map((paragraph, i) => (
          <p key={i} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}

        {about.links.length > 0 && (
          <ul className={styles.links}>
            {about.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
