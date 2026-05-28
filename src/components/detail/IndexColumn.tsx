import type { Project } from "../../types/project";
import styles from "./IndexColumn.module.css";

interface IndexColumnProps {
  projects: Project[];
  activeSlug: string;
}

export function IndexColumn({ projects, activeSlug }: IndexColumnProps) {
  return (
    <div className={styles.column}>
      <ul className={styles.list}>
        {projects.map((p) => {
          const isActive = p.slug === activeSlug;
          return (
            <li
              key={p.slug}
              className={`${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.title}>{p.title}</span>
              <span className={styles.year}>{p.year}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
