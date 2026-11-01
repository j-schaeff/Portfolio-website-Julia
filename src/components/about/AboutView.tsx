import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { about } from "../../data/about";
import { markIntroPlayed } from "../../utils/intro";
import { GRID_EXIT_TRANSITION } from "../../utils/motion";
import styles from "./AboutView.module.css";

// Sets a leading clause number ("1. Geltungsbereich") in the display face.
function withNumber(text: string) {
  const number = text.match(/^\d+\./)?.[0];
  if (!number) return text;
  return (
    <>
      <span className={styles.number}>{number}</span>
      {text.slice(number.length)}
    </>
  );
}

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

      {about.columns.map((paragraphs, column) => (
        <div key={column} className={styles.column}>
          {paragraphs.length > 0 && (
            // The legal text is German; hyphenation follows this language.
            <div className={styles.text} lang={column === 1 ? "de" : undefined}>
              {paragraphs.map((paragraph, i) =>
                // In the CMS text field, "# Title" marks a heading and "> "
                // a paragraph indented on every line.
                paragraph.startsWith("# ") ? (
                  <h2 key={i} className={styles.heading}>
                    {paragraph.slice(2)}
                  </h2>
                ) : paragraph.startsWith("> ") ? (
                  <p key={i} className={`${styles.paragraph} ${styles.block}`}>
                    {paragraph.slice(2)}
                  </p>
                ) : (
                  <p key={i} className={styles.paragraph}>
                    {withNumber(paragraph)}
                  </p>
                ),
              )}
            </div>
          )}

          {column === 0 && about.links.length > 0 && (
            <ul className={styles.links}>
              {about.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target={
                      link.url.startsWith("mailto:") ? undefined : "_blank"
                    }
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </motion.div>
  );
}
