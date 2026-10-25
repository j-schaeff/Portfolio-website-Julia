import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { useLightbox } from "../../hooks/useLightbox";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useAnimation } from "../../context/AnimationContext";
import type { Project } from "../../types/project";
import { ScrollStrip } from "./ScrollStrip";
import { DetailMeta, metaHeight } from "./DetailMeta";
import { Lightbox } from "../lightbox/Lightbox";
import styles from "./DetailView.module.css";

export function DetailView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearOrigin } = useAnimation();
  const { projects } = useProjects();
  // The lightbox only pages through the project whose image was clicked.
  const [lightboxSlug, setLightboxSlug] = useState<string | null>(null);
  const lightboxProject = projects.find((project) => project.slug === lightboxSlug);
  const lightbox = useLightbox(lightboxProject?.images.length ?? 0);
  const [openAspect, setOpenAspect] = useState<number | undefined>(undefined);
  useBodyScrollLock(true);

  const projectSlug = searchParams.get("project") ?? projects[0]?.slug ?? null;
  const activeIndex = projectSlug
    ? Math.max(projects.findIndex((project) => project.slug === projectSlug), 0)
    : 0;
  const active = projects[activeIndex] ?? projects[0];
  const wheelDeltaRef = useRef(0);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      const deltaY = event.deltaY;
      const now = Date.now();

      if (Math.abs(deltaY) < 4) return;
      if (now - lastTriggerRef.current < 460) return;

      if (wheelDeltaRef.current !== 0 && Math.sign(wheelDeltaRef.current) !== Math.sign(deltaY)) {
        wheelDeltaRef.current = 0;
      }

      wheelDeltaRef.current += deltaY;
      const threshold = 150;

      if (Math.abs(wheelDeltaRef.current) < threshold) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      lastTriggerRef.current = now;

      const nextIndex = (activeIndex + direction + projects.length) % projects.length;
      const nextProject = projects[nextIndex];

      if (nextProject && nextProject.slug !== projectSlug) {
        setSearchParams({ project: nextProject.slug }, { replace: true });
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [activeIndex, projectSlug, projects, setSearchParams]);

  if (!active) return null;

  const handleImageClick = (
    project: Project,
    index: number,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if (!project.images[index]) return;
    // Hand the clicked image's aspect ratio to the lightbox so the hero has its
    // final edge-to-edge size on mount and the morph doesn't jump at the end.
    setOpenAspect(aspectOf(event.currentTarget));
    setLightboxSlug(project.slug);
    lightbox.open(index);
  };

  const handleProjectSelect = (slug: string) => {
    setSearchParams({ project: slug }, { replace: true });
  };

  const lightboxImage =
    lightboxProject && lightbox.index !== null
      ? lightboxProject.images[lightbox.index]
      : undefined;

  const goToIndex = () => {
    clearOrigin();
    // The router basename already supplies the deploy subpath.
    navigate("/", { replace: true });
  };

  return (
    <div
      className={styles.detail}
      // Lets the strip CSS end its images just above the metadata block.
      style={{ "--meta-h": `${metaHeight(projects)}px` } as React.CSSProperties}
    >
      <button
        type="button"
        className={styles.back}
        onClick={goToIndex}
      >
        Index
      </button>

      <ScrollStrip
        projects={projects}
        activeIndex={activeIndex}
        onImageClick={handleImageClick}
      />

      <DetailMeta
        projects={projects}
        active={active}
        onSelectProject={handleProjectSelect}
      />

      <AnimatePresence>
        {lightboxProject && lightboxImage && lightbox.index !== null && (
          <Lightbox
            key="lightbox"
            slug={lightboxProject.slug}
            title={lightboxProject.title}
            image={lightboxImage}
            indexInProject={lightbox.index}
            total={lightboxProject.images.length}
            openAspect={openAspect}
            onClose={lightbox.close}
            onNext={lightbox.next}
            onPrev={lightbox.prev}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function aspectOf(el: HTMLElement): number | undefined {
  if (el instanceof HTMLImageElement && el.naturalWidth && el.naturalHeight) {
    return el.naturalWidth / el.naturalHeight;
  }
  if (el instanceof HTMLVideoElement && el.videoWidth && el.videoHeight) {
    return el.videoWidth / el.videoHeight;
  }
  // Strip width already follows the natural aspect ratio.
  const rect = el.getBoundingClientRect();
  return rect.width && rect.height ? rect.width / rect.height : undefined;
}
