import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  // Mobile: cells after a project's first row, aligned to the top of their line.
  hangingCells: Set<string> | null;
  // Wider screens: how far the label may run before the next project's
  // (useJustifiedRows); a longer name ends in an ellipsis.
  labelWidth?: number;
  onAspect: (key: string, aspect: number) => void;
  // False while the loading screen is up (see GridImage).
  playVideos: boolean;
}

export function GridItem({ project, cellWidths, hangingCells, labelWidth, onAspect, playVideos }: GridItemProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Hovering any of the project's images lifts all of them (see the hover
  // rule in GridItem.module.css). Leaving waits a beat, so crossing the gap
  // between two of the project's images doesn't drop and re-lift the set.
  const [hovered, setHovered] = useState(false);
  const leaveTimer = useRef<number>();
  const enter = () => {
    window.clearTimeout(leaveTimer.current);
    setHovered(true);
  };
  const leave = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setHovered(false), 80);
  };
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  const go = () => {
    navigate(`/project?project=${encodeURIComponent(project.slug)}`);
  };

  const visibleImages = project.images
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => !img.hideInGrid);

  const info = (
    <div
      className={styles.infoButton}
      // Stable hook for the reveal's label slide (GridView.module.css).
      data-grid-label
      style={!isMobile && labelWidth ? { width: "max-content", maxWidth: labelWidth } : undefined}
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        // Space would otherwise also scroll the page.
        e.preventDefault();
        go();
      }}
    >
      <InfoBlock title={project.title} type={project.type} />
    </div>
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
        data-hang={hangingCells?.has(key) ? "" : undefined}
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
          play={playVideos}
          alt={img.alt || `${project.title} — ${i + 1}`}
          rank={rank}
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
      {visibleImages.map((entry, idx) => renderCell(entry, idx === 0, idx))}
      {/* Mobile: the info sits right under the project's images, with the
          space between projects below it, so it reads as that project's. */}
      {isMobile && visibleImages.length > 0 && (
        <div className={styles.heading} data-grid-cell>
          {info}
        </div>
      )}
    </>
  );
}
