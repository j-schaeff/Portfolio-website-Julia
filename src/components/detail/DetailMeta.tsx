import { motion } from "framer-motion";
import type { Project } from "../../types/project";
import { ZOOM_TRANSITION } from "../../utils/motion";
import { JustifiedText } from "../JustifiedText";
import styles from "./DetailMeta.module.css";

interface DetailMetaProps {
  projects: Project[];
  active: Project;
}

// Height of the metadata block: tall enough for the title line plus the longest
// description so the layout doesn't jump between projects. On desktop and
// tablet the CSS overrides it: the strip takes two thirds of the screen and
// the metadata fills the rest (DetailMeta.module.css).
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

// Only the in-view project's info, in one row: description, title, then
// type+date at the right edge. Scrolling switches the project (see
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
      <MetaContent project={active} />
    </motion.div>
  );
}

// The three blocks of the metadata band: description, title, then type+date.
// Shared with the mobile pager on a phone held sideways (ProjectPager), which
// shows the same band on every project's page.
export function MetaContent({ project }: { project: Project }) {
  return (
    <>
      <div className={styles.intro} data-meta-scroll data-contrast>
        <JustifiedText className={styles.description} text={project.description} links={project.descriptionLinks} />
      </div>

      <div className={styles.titleCol} data-contrast>
        <h2 className={styles.title}>{project.title}</h2>
      </div>

      <div className={styles.specs} data-contrast>
        <span className={styles.type}>{project.type}</span>
        <span className={styles.date}>{project.year}</span>
      </div>
    </>
  );
}

// The band's class names, for the pager's sideways-phone pages.
export const metaClasses = { meta: styles.meta, paged: styles.paged };
