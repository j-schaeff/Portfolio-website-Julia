import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PresenceContext } from "framer-motion";
import type { ImageSize, Project } from "../../types/project";
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
  // Only the images on screen when the page opens rise in. Switching projects
  // re-keys the group, and those images mount after this flips, so they
  // appear in place instead of replaying the entrance.
  const [intro, setIntro] = useState(true);
  useEffect(() => setIntro(false), []);

  useLayoutEffect(() => {
    if (!stripRef.current) return;

    // Reset the active project strip to its first image whenever the project
    // changes. This prevents any stale horizontal offset or smooth rewind from
    // the previous project from being carried into the next one.
    stripRef.current.scrollTo({ left: 0, behavior: "auto" });
  }, [activeIndex, activeProject?.slug]);

  if (!activeProject) return null;

  // The project's largest image fills the strip height; the rest scale to it.
  const largest = activeProject.images.reduce<ImageSize>(
    (max, img) => (img.size > max ? img.size : max),
    1,
  );

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
      >
        {activeProject.images.map((img, i) => (
          <StripImage
            key={img.src + i}
            slug={activeProject.slug}
            index={i}
            src={img.full}
            original={img.src}
            aspect={img.aspect}
            placeholder={img.isVideo ? img.poster : img.thumb}
            alt={img.alt || `${activeProject.title} — ${i + 1}`}
            size={img.size}
            largest={largest}
            isVideo={img.isVideo}
            rise={intro}
            onClick={(e) => onImageClick(activeProject, i, e)}
          />
        ))}
        {/* Phone landscape only (hidden otherwise, see the CSS): the info
            follows the last image instead of sitting below the strip.
            data-meta-scroll leaves vertical swipes here to the description
            instead of switching the project (DetailView). */}
        <div className={styles.endInfo} data-meta-scroll>
          <h2 className={styles.endTitle}>{activeProject.title}</h2>
          {activeProject.client && (
            <span className={styles.endLabel}>
              {activeProject.clientUrl ? (
                <a
                  href={activeProject.clientUrl}
                  target={activeProject.clientUrl.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer"
                >
                  {activeProject.client}
                </a>
              ) : (
                activeProject.client
              )}
            </span>
          )}
          <span className={styles.endLabel}>{activeProject.type}</span>
          <span className={styles.endLabel}>{activeProject.year}</span>
          <p className={styles.endDescription}>{activeProject.description}</p>
        </div>
      </div>
      </PresenceContext.Provider>
    </div>
  );
}
