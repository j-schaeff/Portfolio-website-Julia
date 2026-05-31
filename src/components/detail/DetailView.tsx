import { useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { useDragScroll } from "../../hooks/useDragScroll";
import { useActiveProject } from "../../hooks/useActiveProject";
import { useLightbox } from "../../hooks/useLightbox";
import { useAnimation } from "../../context/AnimationContext";
import { ZOOM_TRANSITION } from "../../utils/motion";
import type { Project } from "../../types/project";
import { ScrollStrip } from "./ScrollStrip";
import { DetailMeta } from "./DetailMeta";
import { Lightbox } from "../lightbox/Lightbox";
import styles from "./DetailView.module.css";

export function DetailView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { projects, allImages, globalImageIndex, getProjectBySlug } = useProjects();
  const { clearOrigin } = useAnimation();

  const { ref: stripRef, isDragging, draggedRef } = useDragScroll<HTMLDivElement>();
  const activeSlug = useActiveProject(stripRef, slug ?? projects[0]?.slug ?? null);
  const lightbox = useLightbox(allImages.length);

  const active: Project | undefined =
    getProjectBySlug(activeSlug ?? "") ??
    getProjectBySlug(slug ?? "") ??
    projects[0];

  // Center the entered project in the strip before paint, so the shared image
  // settles at its final position before the zoom animation measures it.
  useLayoutEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-project-slug="${slug}"]`,
    );
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
  }, [slug, stripRef]);

  if (!active) return null;

  const handleImageClick = (
    project: Project,
    index: number,
    _event: React.MouseEvent<HTMLElement>,
  ) => {
    if (draggedRef.current) return; // ignore the click that ends a drag
    const globalIndex = globalImageIndex(project.slug, index);
    if (globalIndex >= 0) lightbox.open(globalIndex);
  };

  const lightboxEntry =
    lightbox.index !== null ? allImages[lightbox.index] : undefined;

  return (
    <motion.div
      className={styles.detail}
      // Don't scale the detail container: it holds the shared strip image, and a
      // parent transform fights that image's layout morph (dragging it toward the
      // bottom). Just fade the surrounding detail in and let the shared image
      // zoom straight to its final strip position on its own.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={ZOOM_TRANSITION}
      // Reset the shared-element origin once the entry settles so later
      // navigations (e.g. the Index button) start from a clean state.
      onAnimationComplete={clearOrigin}
    >
      <button className={styles.back} onClick={() => navigate("/")}>
        Index
      </button>

      <ScrollStrip
        projects={projects}
        containerRef={stripRef}
        isDragging={isDragging}
        onImageClick={handleImageClick}
      />

      <DetailMeta projects={projects} active={active} />

      <AnimatePresence>
        {lightboxEntry && (
          <Lightbox
            key="lightbox"
            slug={lightboxEntry.slug}
            title={lightboxEntry.title}
            image={lightboxEntry.image}
            indexInProject={lightboxEntry.indexInProject}
            total={allImages.length}
            onClose={lightbox.close}
            onNext={lightbox.next}
            onPrev={lightbox.prev}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
