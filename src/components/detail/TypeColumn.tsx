import type { Project } from "../../types/project";
import styles from "./TypeColumn.module.css";

interface TypeColumnProps {
  type: string;
  projectsOfType: Project[];
  activeSlug: string;
}

export function TypeColumn({ type, projectsOfType, activeSlug }: TypeColumnProps) {
  return (
    <div className={styles.column}>
      <span className={styles.label}>{type}</span>
      <ul className={styles.list}>
        {projectsOfType.map((p) => (
          <li
            key={p.slug}
            className={p.slug === activeSlug ? styles.active : undefined}
          >
            {p.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
