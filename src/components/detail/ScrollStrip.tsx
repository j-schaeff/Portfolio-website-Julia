import { useLayoutEffect, useRef } from "react";
import { PresenceContext } from "framer-motion";
import type { Project } from "../../types/project";
import { StripImage } from "./StripImage";
import styles from "./ScrollStrip.module.css";

interface ScrollStripProps {
  projects: Project[];
  activeIndex: number;
  onImageClick: (
    project: Project,
    index: number,
    event: React.MouseEvent<HTMLElement>,
  ) => void;
}

export function ScrollStrip({
  projects,
  activeIndex,
  onImageClick,
}: ScrollStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeProject = projects[activeIndex] ?? projects[0];

  useLayoutEffect(() => {
    if (!stripRef.current) return;

    // Reset the active project strip to its first image whenever the project
    // changes. This prevents any stale horizontal offset or smooth rewind from
    // the previous project from being carried into the next one.
    stripRef.current.scrollTo({ left: 0, behavior: "auto" });
  }, [activeIndex, activeProject?.slug]);

  if (!activeProject) return null;

  return (
    <div ref={stripRef} className={styles.strip}>
      {/* Keep strip images out of the route's AnimatePresence. Their layoutId
          makes each one register for presence, and in framer-motion 11 an image
          that unmounts (every project switch re-keys the group) never
          unregisters — so its stale id would block the detail route's exit
          forever and the Index button would leave this page stuck on screen.
          The strip has no exit animation, and layoutId morphs don't rely on
          presence, so nothing visible changes. */}
      <PresenceContext.Provider value={null}>
      <div
        key={activeProject.slug}
        className={styles.group}
        data-project-slug={activeProject.slug}
        style={{
          opacity: 1,
          visibility: "visible",
          transform: "none",
          pointerEvents: "auto",
        }}
      >
        {activeProject.images.map((img, i) => (
          <StripImage
            key={img.src + i}
            slug={activeProject.slug}
            index={i}
            src={img.src}
            alt={img.alt || `${activeProject.title} — ${i + 1}`}
            size={img.size}
            isVideo={img.isVideo}
            onClick={(e) => onImageClick(activeProject, i, e)}
          />
        ))}
      </div>
      </PresenceContext.Provider>
    </div>
  );
}
