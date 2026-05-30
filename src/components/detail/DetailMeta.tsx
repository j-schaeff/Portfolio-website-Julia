import { Fragment } from "react";
import type { Project } from "../../types/project";
import styles from "./DetailMeta.module.css";

interface DetailMetaProps {
  projects: Project[];
  active: Project;
}

// Three independent blocks — description, project names, and type+date — laid
// out in a row that wraps as whole units when the viewport narrows. While they
// sit side by side the name and type/date rows line up; once the type+date
// block wraps it drops beneath the names as a single column. The in-view
// project's name and its type/date slide right together.
export function DetailMeta({ projects, active }: DetailMetaProps) {
  return (
    <div className={styles.meta}>
      <p className={styles.description}>{active.description}</p>

      <div className={styles.namesCol}>
        <ul className={styles.names}>
          {projects.map((p) => (
            <li
              key={p.slug}
              className={p.slug === active.slug ? styles.active : undefined}
            >
              {p.title}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.specs}>
        {projects.map((p) => {
          const cls = p.slug === active.slug ? styles.active : "";
          return (
            <Fragment key={p.slug}>
              <span className={`${styles.type} ${cls}`}>{p.type}</span>
              <span className={`${styles.date} ${cls}`}>{p.year}</span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
