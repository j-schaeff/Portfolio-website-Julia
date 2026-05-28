import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { useDragScroll } from "../../hooks/useDragScroll";
import { useActiveProject } from "../../hooks/useActiveProject";
import { useLightbox } from "../../hooks/useLightbox";
import type { Project } from "../../types/project";
import { ScrollStrip } from "./ScrollStrip";
import { DescriptionColumn } from "./DescriptionColumn";
import { TypeColumn } from "./TypeColumn";
import { IndexColumn } from "./IndexColumn";
import { Lightbox } from "../lightbox/Lightbox";
import styles from "./DetailView.module.css";

export function DetailView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { projects, getProjectBySlug, getProjectsByType } = useProjects();

  const { ref: stripRef, isDragging, draggedRef } = useDragScroll<HTMLDivElement>();
  const activeSlug = useActiveProject(stripRef, slug ?? projects[0]?.slug ?? null);
  const lightbox = useLightbox();

  const active: Project | undefined =
    getProjectBySlug(activeSlug ?? "") ??
    getProjectBySlug(slug ?? "") ??
    projects[0];

  // Center the entered project in the strip on mount.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(
      `[data-project-slug="${slug}"]`,
    );
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [slug, stripRef]);

  if (!active) return null;

  const handleImageClick = (
    project: Project,
    index: number,
    _event: React.MouseEvent<HTMLElement>,
  ) => {
    if (draggedRef.current) return; // ignore the click that ends a drag
    lightbox.open(project.slug, index, project.images.length);
  };

  const lightboxProject = lightbox.state
    ? getProjectBySlug(lightbox.state.slug)
    : undefined;

  return (
    <motion.div
      className={styles.detail}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
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

      <div className={styles.columns}>
        <DescriptionColumn project={active} />
        <TypeColumn
          type={active.type}
          projectsOfType={getProjectsByType(active.type)}
          activeSlug={active.slug}
        />
        <IndexColumn projects={projects} activeSlug={active.slug} />
      </div>

      <AnimatePresence>
        {lightbox.state && lightboxProject && (
          <Lightbox
            key="lightbox"
            slug={lightboxProject.slug}
            title={lightboxProject.title}
            images={lightboxProject.images}
            index={lightbox.state.index}
            onClose={lightbox.close}
            onNext={lightbox.next}
            onPrev={lightbox.prev}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
