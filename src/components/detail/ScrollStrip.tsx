import type { RefObject } from "react";
import type { Project } from "../../types/project";
import { StripImage } from "./StripImage";
import styles from "./ScrollStrip.module.css";

interface ScrollStripProps {
  projects: Project[];
  containerRef: RefObject<HTMLDivElement>;
  isDragging: boolean;
  onImageClick: (
    project: Project,
    index: number,
    event: React.MouseEvent<HTMLElement>,
  ) => void;
}

export function ScrollStrip({
  projects,
  containerRef,
  isDragging,
  onImageClick,
}: ScrollStripProps) {
  return (
    <div
      ref={containerRef}
      className={`${styles.strip} ${isDragging ? styles.dragging : ""}`}
    >
      {projects.map((project) => (
        <div key={project.slug} className={styles.group} data-project-slug={project.slug}>
          {project.images.map((img, i) => (
            <StripImage
              key={img.src + i}
              slug={project.slug}
              index={i}
              src={img.src}
              alt={img.alt || `${project.title} — ${i + 1}`}
              size={img.size}
              onClick={(e) => onImageClick(project, i, e)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
