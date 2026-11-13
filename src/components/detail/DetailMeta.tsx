import { motion } from "framer-motion";
import type { Project } from "../../types/project";
import { ZOOM_TRANSITION } from "../../utils/motion";
import styles from "./DetailMeta.module.css";

interface DetailMetaProps {
  projects: Project[];
  active: Project;
}

// Height of the metadata block: tall enough for the title line plus the longest
// description so the layout doesn't jump between projects. The detail strip
// also uses it to sit its images just above the metadata.
export function metaHeight(projects: Project[]): number {
  const longestDescription = projects.reduce(
    (max, project) =>
      project.description.length > max.length ? project.description : max,
    projects[0]?.description ?? "",
  );

  const longestDescriptionLines = Math.max(
    1,
    Math.ceil((longestDescription.replace(/\s+/g, " ").trim().length || 1) / 32),
  );

  return Math.max(112, (longestDescriptionLines + 1) * 20 + 18);
}

// Only the in-view project's info, in one row: description, title, client
// (when set; a link when it has a URL), then type+date at the right edge. Scrolling switches the project (see
// DetailView), and this text follows it. Once the viewport narrows, the other
// columns wrap beneath the description (on tablets, 561–880px, they sit
// above it, directly under the strip). `projects` is still needed so metaHeight() can size the block
// for the longest description. Tablet/desktop only: on mobile ProjectPager
// shows the text inside each project's strip.
export function DetailMeta({ projects, active }: DetailMetaProps) {
  const infoHeight = metaHeight(projects);

  return (
    // Fades in just behind the strip's rise so the images lead the entrance.
    // This block doesn't remount on project switches, so it plays only once.
    <motion.div
      className={styles.meta}
      style={{ height: `${infoHeight}px` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...ZOOM_TRANSITION, delay: 0.35 }}
    >
      <div className={styles.intro} data-meta-scroll>
        <p className={styles.description}>{active.description}</p>
      </div>

      <div className={styles.titleCol}>
        <h2 className={styles.title}>{active.title}</h2>
      </div>

      {active.client && (
        <div className={styles.client}>
          {active.clientUrl ? (
            <a
              href={active.clientUrl}
              target={active.clientUrl.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              className={styles.clientLink}
            >
              {active.client}
            </a>
          ) : (
            active.client
          )}
        </div>
      )}

      <div className={styles.specs}>
        <span className={styles.type}>{active.type}</span>
        <span className={styles.date}>{active.year}</span>
      </div>
    </motion.div>
  );
}
