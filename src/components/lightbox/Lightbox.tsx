import { createPortal } from "react-dom";
import { useRef, useState } from "react";
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

  const hasMultiple = total > 1;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const caption = image.alt || `${title} — ${indexInProject + 1}`;

  const motionProps = {
    layoutId: isHero ? imageLayoutId(slug, indexInProject) : undefined,
    className: styles.image,
    onClick: stop,
    // The hero relies on the layout morph; everything else just crossfades.
    initial: isHero ? false : { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
    onLayoutAnimationComplete: isHero ? () => setIntroDone(true) : undefined,
  };

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
            draggable={false}
          />
        )}
      </AnimatePresence>

      <button className={styles.close} onClick={onClose} aria-label="Close">
        &times;
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
          &#8249;
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
          &#8250;
        </button>
      )}
    </motion.div>,
    document.body,
  );
}
