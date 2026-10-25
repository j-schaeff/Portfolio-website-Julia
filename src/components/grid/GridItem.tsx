import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../../types/project";
import { useAnimation } from "../../context/AnimationContext";
import { cellKey } from "../../hooks/useJustifiedRows";
import { InfoBlock } from "./InfoBlock";
import { GridImage } from "./GridImage";
import styles from "./GridItem.module.css";

interface GridItemProps {
  project: Project;
  // Mobile justified-row widths keyed by cellKey(); null on desktop.
  cellWidths: Record<string, number> | null;
  onAspect: (key: string, aspect: number) => void;
}

export function GridItem({ project, cellWidths, onAspect }: GridItemProps) {
  const navigate = useNavigate();
  const { setOrigin } = useAnimation();

  const go = (imageIndex: number) => {
    setOrigin({ slug: project.slug, imageIndex });
    navigate(`/project?project=${encodeURIComponent(project.slug)}`);
  };

  const visibleImages = project.images
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => !img.hideInGrid);

  const info = (
    <div
      className={styles.infoButton}
      role="link"
      tabIndex={0}
      onClick={() => go(0)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") go(0);
      }}
    >
      <InfoBlock title={project.title} type={project.type} />
    </div>
  );

  const renderCell = (
    { img, i }: (typeof visibleImages)[number],
    isLead: boolean,
  ) => {
    const key = cellKey(project.slug, i);
    const width = cellWidths?.[key];
    const justify = width ? ({ "--cell-w": `${width}px` } as CSSProperties) : undefined;

    return (
      <div
        className={styles.cell}
        data-grid-cell
        data-justify={width ? "" : undefined}
        style={justify}
        key={img.src + i}
      >
        <GridImage
          slug={project.slug}
          index={i}
          src={img.src}
          alt={img.alt || `${project.title} — ${i + 1}`}
          size={img.size}
          isVideo={img.isVideo}
          onActivate={() => go(i)}
          onAspect={(aspect) => onAspect(key, aspect)}
        />
        {/* Reserved label band keeps every image on a shared baseline. */}
        <div className={styles.label}>{isLead ? info : null}</div>
      </div>
    );
  };

  return <>{visibleImages.map((entry, idx) => renderCell(entry, idx === 0))}</>;
}
