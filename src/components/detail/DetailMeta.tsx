import { Fragment, useState } from "react";
import type { Project } from "../../types/project";
import styles from "./DetailMeta.module.css";

interface DetailMetaProps {
  projects: Project[];
  active: Project;
  onSelectProject: (slug: string) => void;
}

// Three independent blocks — description, project names, and type+date — laid
// out in a row that wraps as whole units when the viewport narrows. While they
// sit side by side the name and type/date rows line up; once the type+date
// block wraps it drops beneath the names as a single column. The in-view
// project's name and its type/date slide right together.
export function DetailMeta({ projects, active, onSelectProject }: DetailMetaProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const longestDescription = projects.reduce(
    (max, project) =>
      project.description.length > max.length ? project.description : max,
    projects[0]?.description ?? "",
  );

  const longestDescriptionLines = Math.max(
    1,
    Math.ceil((longestDescription.replace(/\s+/g, " ").trim().length || 1) / 32),
  );

  const infoHeight = Math.max(112, longestDescriptionLines * 20 + 18);

  return (
    <div className={styles.meta} style={{ height: `${infoHeight}px` }}>
      <p className={styles.description}>{active.description}</p>

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
    </div>
  );
}
