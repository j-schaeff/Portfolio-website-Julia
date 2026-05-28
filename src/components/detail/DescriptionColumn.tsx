import type { Project } from "../../types/project";
import styles from "./DescriptionColumn.module.css";

export function DescriptionColumn({ project }: { project: Project }) {
  return (
    <div className={styles.column}>
      <p className={styles.description}>{project.description}</p>
    </div>
  );
}
