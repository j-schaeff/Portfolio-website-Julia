import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { imageLayoutId } from "../../utils/layoutId";
import { isVideo } from "../../utils/media";
import type { ProjectImage } from "../../types/project";
import styles from "./Lightbox.module.css";

interface LightboxProps {
  slug: string;
  title: string;
  images: ProjectImage[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Lightbox({
  slug,
  title,
  images,
  index,
  onClose,
  onNext,
  onPrev,
}: LightboxProps) {
  useBodyScrollLock(true);

  const hasMultiple = images.length > 1;
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const current = images[index];
  const caption = current.alt || `${title} — ${index + 1}`;

  return createPortal(
    <motion.div
      className={styles.scrim}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
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

      {isVideo(current.src) ? (
        <motion.video
          layoutId={imageLayoutId(slug, index)}
          className={styles.image}
          src={current.src}
          aria-label={caption}
          controls
          autoPlay
          loop
          playsInline
          onClick={stop}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : (
        <motion.img
          layoutId={imageLayoutId(slug, index)}
          className={styles.image}
          src={current.src}
          alt={caption}
          onClick={stop}
          draggable={false}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
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
