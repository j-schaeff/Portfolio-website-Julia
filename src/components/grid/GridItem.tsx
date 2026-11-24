import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Project } from "../../types/project";
import { cellKey } from "../../hooks/useJustifiedRows";
import { prefetchProject } from "../../utils/prefetch";
import { InfoBlock } from "./InfoBlock";
import { GridImage } from "./GridImage";
import styles from "./GridItem.module.css";

interface GridItemProps {
  project: Project;
  // Justified-row widths keyed by cellKey(); null until every image has
  // reported its aspect ratio.
  cellWidths: Record<string, number> | null;
  // How far the label may run before the next project's
  // (useJustifiedRows); a longer name ends in an ellipsis.
  labelWidth?: number;
  onAspect: (key: string, aspect: number) => void;
  // False while the loading screen is up (see GridImage).
  playVideos: boolean;
}

export function GridItem({ project, cellWidths, labelWidth, onAspect, playVideos }: GridItemProps) {
  const navigate = useNavigate();
  // Hovering any of the project's images lifts all of them (see the hover
  // rule in GridItem.module.css). Leaving waits a beat, so crossing the gap
  // between two of the project's images doesn't drop and re-lift the set.
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<number>();
  const enter = () => {
    window.clearTimeout(leaveTimer.current);
    setHovered(true);
    prefetchProject(project);
  };
  const leave = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHovered(false), 80);
  };
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const href = `/project/${encodeURIComponent(project.slug)}`;
  const go = () => navigate(href);

  const visibleImages = project.images
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => !img.hideInGrid);

  const info = (
    // A real link, so crawlers can follow it from the prerendered index too.
    <Link
      to={href}
      className={styles.infoButton}
      // Stable hook for the reveal's label slide (GridView.module.css).
      data-grid-label
      style={labelWidth ? { width: "max-content", maxWidth: labelWidth } : undefined}
      onFocus={() => prefetchProject(project)}
      onTouchStart={() => prefetchProject(project)}
    >
      <InfoBlock title={project.title} type={project.type} />
    </Link>
  );

  const renderCell = (
    { img, i }: (typeof visibleImages)[number],
    isLead: boolean,
    rank: number,
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
        data-hover={hovered ? "" : undefined}
        onMouseEnter={enter}
        onMouseLeave={leave}
        style={justify}
        key={img.src + i}
      >
        <GridImage
          src={img.thumb}
          original={img.src}
          poster={img.poster}
          aspect={img.aspect}
          focus={img.focus}
          play={playVideos}
          alt={img.alt || `${project.title} — ${i + 1}`}
          rank={rank}
          isVideo={img.isVideo}
          start={img.start}
          onActivate={go}
          onAspect={(aspect) => onAspect(key, aspect)}
        />
        {/* Reserved label band keeps every image on a shared baseline. */}
        <div className={styles.label}>{isLead ? info : null}</div>
      </div>
    );
  };

  return <>{visibleImages.map((entry, idx) => renderCell(entry, idx === 0, idx))}</>;
}
