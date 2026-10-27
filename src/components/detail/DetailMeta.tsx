import { Fragment, useState } from "react";
import { motion } from "framer-motion";
import type { Project } from "../../types/project";
import { ZOOM_TRANSITION } from "../../utils/motion";
import styles from "./DetailMeta.module.css";

interface DetailMetaProps {
  projects: Project[];
  active: Project;
  onSelectProject: (slug: string) => void;
}

// Height of the metadata block: tall enough for the longest description so the
// layout doesn't jump between projects. The detail strip also uses it to sit
// its images just above the metadata.
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

  return Math.max(112, longestDescriptionLines * 20 + 18);
}

// Three independent blocks — description, project names, and type+date — laid
// out in a row that wraps as whole units when the viewport narrows. While they
// sit side by side the name and type/date rows line up; once the type+date
// block wraps it drops beneath the names as a single column. The in-view
// project's name and its type/date slide right together.
export function DetailMeta({ projects, active, onSelectProject }: DetailMetaProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const infoHeight = metaHeight(projects);
  // Mobile has no project list, so the next project (wrapping to the first)
  // is named under the description: it hints that swiping moves on, and a tap
  // does the same.
  const activeIdx = projects.findIndex((p) => p.slug === active.slug);
  const next = projects.length > 1
    ? projects[(activeIdx + 1) % projects.length]
    : undefined;

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
      <p className={styles.description}>{active.description}</p>

      {next && (
        <button
          type="button"
          className={[styles.next, styles.linkButton].join(" ")}
          onClick={() => onSelectProject(next.slug)}
          aria-label={`View ${next.title}`}
        >
          Next — {next.title} ↓
        </button>
      )}

      <div className={styles.namesCol}>
        <ul className={styles.names}>
          {projects.map((p) => {
            const isActive = p.slug === active.slug;
            const isHovered = p.slug === hoveredSlug;
            return (
              <li
                key={p.slug}
                className={[
                  isActive ? styles.active : "",
                  isHovered ? styles.hovered : "",
                ].join(" ").trim() || undefined}
              >
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => onSelectProject(p.slug)}
                  onMouseEnter={() => setHoveredSlug(p.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  aria-label={`View ${p.title}`}
                >
                  {p.title}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.specs}>
        {projects.map((p) => {
          const isActive = p.slug === active.slug;
          const isHovered = p.slug === hoveredSlug;
          return (
            <Fragment key={p.slug}>
              <button
                type="button"
                className={[
                  styles.type,
                  isActive ? styles.active : "",
                  isHovered ? styles.hovered : "",
                  styles.linkButton,
                ].join(" ")}
                onClick={() => onSelectProject(p.slug)}
                onMouseEnter={() => setHoveredSlug(p.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                aria-label={`View ${p.title} project type`}
              >
                {p.type}
              </button>
              <button
                type="button"
                className={[
                  styles.date,
                  isActive ? styles.active : "",
                  isHovered ? styles.hovered : "",
                  styles.linkButton,
                ].join(" ")}
                onClick={() => onSelectProject(p.slug)}
                onMouseEnter={() => setHoveredSlug(p.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                aria-label={`View ${p.title} project year`}
              >
                {p.year}
              </button>
            </Fragment>
          );
        })}
      </div>

      <div className={styles.mobileProjectList} aria-label="Project metadata list">
        {projects.map((p) => {
          const isActive = p.slug === active.slug;
          const isHovered = p.slug === hoveredSlug;
          return (
            <button
              key={p.slug}
              type="button"
              className={[
                styles.mobileProjectRow,
                isActive ? styles.active : "",
                isHovered ? styles.hovered : "",
                styles.linkButton,
              ].join(" ")}
              onClick={() => onSelectProject(p.slug)}
              onMouseEnter={() => setHoveredSlug(p.slug)}
              onMouseLeave={() => setHoveredSlug(null)}
              aria-label={`View ${p.title}`}
            >
              <span className={styles.mobileTitle}>{p.title}</span>
              <span className={styles.mobileSpecs}>
                <span className={styles.mobileType}>{p.type}</span>
                <span className={styles.mobileDate}>{p.year}</span>
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
