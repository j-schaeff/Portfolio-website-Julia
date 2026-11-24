import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PresenceContext } from "framer-motion";
import type { ImageSize, Project } from "../../types/project";
import { StripImage } from "./StripImage";
import styles from "./ScrollStrip.module.css";

interface ScrollStripProps {
  projects: Project[];
  activeIndex: number;
}

export function ScrollStrip({
  projects,
  activeIndex,
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
      {/* Keep strip images out of the route's AnimatePresence. The strip has
          no exit animation, and an image that unmounts on a project switch
          (the group is re-keyed) must never hold up the detail route's exit,
          or the Index button would leave this page stuck on screen. */}
      <PresenceContext.Provider value={null}>
      <div
        key={activeProject.slug}
        className={styles.group}
        data-project-slug={activeProject.slug}
      >
        {activeProject.images.map((img, i) => (
          <StripImage
            key={img.src + i}
            index={i}
            src={img.full}
            original={img.src}
            aspect={img.aspect}
            placeholder={img.isVideo ? img.poster : img.thumb}
            alt={img.alt || `${activeProject.title} — ${i + 1}`}
            size={img.size}
            largest={largest}
            isVideo={img.isVideo}
            hasAudio={img.hasAudio}
            start={img.start}
            rise={intro}
          />
        ))}
      </div>
      </PresenceContext.Provider>
    </div>
  );
}
