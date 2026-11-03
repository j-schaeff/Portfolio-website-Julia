import { useEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { useFallbackSrc } from "../../hooks/useFallbackSrc";
import { imageHeight } from "../../utils/imageSize";
import styles from "./GridImage.module.css";

interface GridImageProps {
  // The grid-sized copy, and the upload to fall back to if it's missing.
  src: string;
  original: string;
  // A video's first frame: shown until it plays, and what the loading screen
  // waits for instead of the video itself.
  poster?: string;
  // Videos hold off until the reveal starts, so they don't compete with the
  // images for bandwidth while the loading screen is up.
  play: boolean;
  alt: string;
  size: ImageSize;
  isVideo: boolean;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
  // Reports the media's natural aspect ratio once known, so the grid can lay
  // out its justified rows.
  onAspect?: (aspect: number) => void;
}

// No layoutId here: opening a project doesn't morph the clicked image. The
// detail strip rises in from the bottom on its own instead.
export function GridImage({ src: preferred, original, poster, play, alt, size, isVideo, onActivate, onAspect }: GridImageProps) {
  // Height goes through a CSS variable so the mobile layout can override it.
  const style = { "--img-h": `${imageHeight(size)}px` } as CSSProperties;

  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  const reportAspect = () => {
    const el = mediaRef.current;
    if (!el || !onAspect) return;
    const [w, h] = isVideo ? [el.videoWidth, el.videoHeight] : [el.naturalWidth, el.naturalHeight];
    if (w && h) onAspect(w / h);
  };

  const { src, isOriginal, fallBack } = useFallbackSrc(preferred, original);
  // A broken asset still needs a ratio, or the mobile layout would wait forever.
  const reportBroken = () => (isOriginal ? onAspect?.(1) : fallBack());

  // The poster has the video's proportions, so the layout needn't wait for
  // the video's own metadata. If it fails, onLoadedMetadata still reports.
  useEffect(() => {
    if (!isVideo || !poster || !onAspect) return;
    const img = new Image();
    img.onload = () => img.naturalHeight && onAspect(img.naturalWidth / img.naturalHeight);
    img.src = poster;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, poster]);

  // Without a poster (an external link) there's nothing to show meanwhile, and
  // the loading screen waits on the video's first frame, so it starts at once.
  const startNow = play || !poster;
  useEffect(() => {
    // play() rejects if the browser blocks it; the poster stays up then.
    if (isVideo && startNow) mediaRef.current?.play().catch(() => {});
  }, [isVideo, startNow, src]);

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
        poster={poster}
        aria-label={alt}
        muted
        loop
        playsInline
        preload={poster ? "metadata" : "auto"}
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
      decoding="async"
      draggable={false}
      onClick={onActivate}
      onLoad={reportAspect}
      onError={reportBroken}
      style={style}
    />
  );
}
