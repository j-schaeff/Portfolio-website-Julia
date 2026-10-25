import { useEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { imageHeight } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
import { ZOOM_TRANSITION } from "../../utils/motion";
import { useAnimation } from "../../context/AnimationContext";
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

export function GridImage({ slug, index, src, alt, size, isVideo, onActivate, onAspect }: GridImageProps) {
  const { origin } = useAnimation();
  // Only the clicked image shares a layoutId, so a single element morphs into
  // the detail strip instead of every grid image fighting for a match.
  const isShared = origin?.slug === slug && origin?.imageIndex === index;
  const layoutId = isShared ? imageLayoutId(slug, index) : undefined;
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
        layoutId={layoutId}
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
        transition={ZOOM_TRANSITION}
      />
    );
  }

  return (
    <motion.img
      ref={mediaRef}
      layoutId={layoutId}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onActivate}
      onLoad={reportAspect}
      onError={reportBroken}
      style={style}
      transition={ZOOM_TRANSITION}
    />
  );
}
