import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import type { Project } from "../../types/project";
import { cellKey } from "../../hooks/useJustifiedRows";
import { useIsMobile } from "../../hooks/useIsMobile";
import { InfoBlock } from "./InfoBlock";
import { GridImage } from "./GridImage";
import styles from "./GridItem.module.css";

interface GridItemProps {
  project: Project;
  // Justified-row widths keyed by cellKey(); null until every image has
  // reported its aspect ratio.
  cellWidths: Record<string, number> | null;
  onAspect: (key: string, aspect: number) => void;
  // False while the loading screen is up (see GridImage).
  playVideos: boolean;
}

export function GridItem({ project, cellWidths, onAspect, playVideos }: GridItemProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const go = () => {
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
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") go();
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
    const justify = width
      ? ({ "--cell-w": `${width}px` } as CSSProperties)
      : undefined;

    return (
      <div
        className={styles.cell}
        data-grid-cell
        data-justify={width ? "" : undefined}
        style={justify}
        key={img.src + i}
      >
        <GridImage
          src={img.thumb}
          original={img.src}
          poster={img.poster}
          play={playVideos}
          alt={img.alt || `${project.title} — ${i + 1}`}
          size={img.size}
          isVideo={img.isVideo}
          onActivate={go}
          onAspect={(aspect) => onAspect(key, aspect)}
        />
        {/* Reserved label band keeps every image on a shared baseline. */}
        {!isMobile && <div className={styles.label}>{isLead ? info : null}</div>}
      </div>
    );
  };

  return (
    <>
      {/* Mobile: the info heads the project, so its images read as one group. */}
      {isMobile && visibleImages.length > 0 && (
        <div className={styles.heading} data-grid-cell>
          {info}
        </div>
      )}
      {visibleImages.map((entry, idx) => renderCell(entry, idx === 0))}
    </>
  );
}
