import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { imageLayoutId } from "../../utils/layoutId";
import type { ProjectImage } from "../../types/project";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  slug: string;
  title: string;
  image: ProjectImage;
  indexInProject: number;
  total: number;
  /** Width / height of the clicked strip image, so the hero can be sized before it loads. */
  openAspect?: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Lightbox({
  slug,
  title,
  image,
  indexInProject,
  total,
  openAspect,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  useBodyScrollLock(true);

  // The image clicked to open morphs in from the strip via its shared layoutId.
  // Once that intro finishes we drop the layoutId, so paging between images is a
  // plain opacity crossfade with no layout animation to distort differing
  // aspect ratios.
  const openedKey = useRef(`${slug}-${indexInProject}`);
  const [introDone, setIntroDone] = useState(false);
  const key = `${slug}-${indexInProject}`;
  const isHero = !introDone && key === openedKey.current;

  // Size the element box to exactly the contain-fitted image, rather than a
  // full-screen box with object-fit. That keeps clicks on the bars closing the
  // lightbox and lets the layoutId morph scale without distorting the image.
  const [aspects, setAspects] = useState<Record<string, number>>(() =>
    openAspect ? { [openedKey.current]: openAspect } : {},
  );
  const [viewport, setViewport] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const recordAspect = (w: number, h: number) => {
    if (!w || !h) return;
    setAspects((prev) => (prev[key] ? prev : { ...prev, [key]: w / h }));
  };

  const aspect = aspects[key];
  const fitWidth = aspect ? Math.min(viewport.w, viewport.h * aspect) : undefined;
  const fitStyle =
    aspect && fitWidth ? { width: fitWidth, height: fitWidth / aspect } : undefined;

  const hasMultiple = total > 1;
  const stop = (e: React.MouseEvent<HTMLElement>) => e.stopPropagation();
  const caption = image.alt || `${title} — ${indexInProject + 1}`;

  const motionProps = {
    layoutId: isHero ? imageLayoutId(slug, indexInProject) : undefined,
    className: styles.image,
    style: fitStyle,
    onClick: stop,
    // The hero relies on the layout morph; everything else just crossfades.
    initial: isHero ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
    onLayoutAnimationComplete: isHero ? () => setIntroDone(true) : undefined,
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      className={styles.scrim}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence initial={false}>
        {image.isVideo ? (
          <motion.video
            key={key}
            {...motionProps}
            src={image.src}
            aria-label={caption}
            onLoadedMetadata={(e) =>
              recordAspect(e.currentTarget.videoWidth, e.currentTarget.videoHeight)
            }
            controls
            autoPlay
            loop
            playsInline
          />
        ) : (
          <motion.img
            key={key}
            {...motionProps}
            src={image.src}
            alt={caption}
            onLoad={(e) =>
              recordAspect(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
            }
            draggable={false}
          />
        )}
      </AnimatePresence>

      <button className={styles.close} onClick={onClose} aria-label="Close">
        <Icon d="M5 5l14 14M19 5L5 19" />
      </button>

      {hasMultiple && (
        <button
          className={`${styles.arrow} ${styles.left}`}
          onClick={(e) => {
            stop(e);
            onPrev();
          }}
          aria-label="Previous image"
        >
          <Icon d="M15 4l-8 8 8 8" />
        </button>
      )}

      {hasMultiple && (
        <button
          className={`${styles.arrow} ${styles.right}`}
          onClick={(e) => {
            stop(e);
            onNext();
          }}
          aria-label="Next image"
        >
          <Icon d="M9 4l8 8-8 8" />
        </button>
      )}
    </motion.div>,
    document.body,
  );
}

// Thin-stroke line icon used for the close and arrow buttons.
function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
