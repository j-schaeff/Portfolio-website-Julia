import { useEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { imageHeight } from "../../utils/imageSize";
import styles from "./GridImage.module.css";

interface GridImageProps {
  slug: string;
  index: number;
  src: string;
  alt: string;
  size: ImageSize;
  isVideo: boolean;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
  // Reports the media's natural aspect ratio once known, so the mobile grid
  // can lay out its justified rows.
  onAspect?: (aspect: number) => void;
}

// No layoutId here: opening a project doesn't morph the clicked image. The
// detail strip rises in from the bottom on its own instead.
export function GridImage({ src, alt, size, isVideo, onActivate, onAspect }: GridImageProps) {
  // Height goes through a CSS variable so the mobile layout can override it.
  const style = { "--img-h": `${imageHeight(size)}px` } as CSSProperties;

  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const reportAspect = () => {
    const el = mediaRef.current;
    if (!el || !onAspect) return;
    const [w, h] = isVideo ? [el.videoWidth, el.videoHeight] : [el.naturalWidth, el.naturalHeight];
    if (w && h) onAspect(w / h);
  };

  // A broken asset still needs a ratio, or the mobile layout would wait forever.
  const reportBroken = () => onAspect?.(1);

  // Cached media can finish loading before the load listener is attached.
  useEffect(() => {
    const el = mediaRef.current;
    if (el && (isVideo ? el.readyState >= 1 : el.complete)) reportAspect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isVideo]);

  if (isVideo) {
    return (
      <motion.video
        ref={mediaRef}
        className={styles.image}
        src={src}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onClick={onActivate}
        onLoadedMetadata={reportAspect}
        onError={reportBroken}
        style={style}
      />
    );
  }

  return (
    <motion.img
      ref={mediaRef}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onActivate}
      onLoad={reportAspect}
      onError={reportBroken}
      style={style}
    />
  );
}
