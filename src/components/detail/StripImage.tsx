import { useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { useFallbackSrc } from "../../hooks/useFallbackSrc";
import { useIsMobile } from "../../hooks/useIsMobile";
import { detailFillHeight, detailImageHeight } from "../../utils/imageSize";
import { RISE_STAGGER, RISE_TRANSITION } from "../../utils/motion";
import styles from "./StripImage.module.css";

interface StripImageProps {
  index: number;
  // The detail-sized copy, and the upload to fall back to if it's missing.
  src: string;
  original: string;
  // Width ÷ height from the build. Sizes the box before the file arrives, so
  // nothing after it in the strip shifts (or shows early) while it loads.
  aspect?: number;
  // Already-cached stand-in shown until the detail copy loads: the grid
  // thumbnail for an image, the poster frame for a video.
  placeholder?: string;
  alt: string;
  size: ImageSize;
  // Largest size in the project; on tablet/desktop it fills the strip height.
  largest: ImageSize;
  isVideo: boolean;
  // Play the page-entrance rise from the bottom on mount.
  rise: boolean;
  // Fires once the media knows its own dimensions (loaded / metadata).
  onReady?: () => void;
}

export function StripImage({ index, src: preferred, original, alt, size, largest, isVideo, rise, onReady, aspect, placeholder }: StripImageProps) {
  const isMobile = useIsMobile();
  const { src, isOriginal, fallBack } = useFallbackSrc(preferred, original);
  const onError = isOriginal ? undefined : fallBack;
  const [loaded, setLoaded] = useState(false);
  const handleReady = () => {
    setLoaded(true);
    onReady?.();
  };

  const isLeadingMobileImage = isMobile && index === 0;
  const style: CSSProperties = isLeadingMobileImage
    ? // Fills the strip exactly (it's the pager's height, see ProjectPager).
      { width: "auto", height: "100%", objectFit: "contain" }
    : {
        width: "auto",
        height: isMobile ? detailImageHeight(size) : detailFillHeight(size, largest),
        objectFit: "contain",
      };
  if (aspect) style.aspectRatio = aspect;
  // The placeholder fills the box exactly (it has the same aspect ratio), and
  // is dropped once the real image is in so it can't show through
  // transparent areas.
  if (placeholder && !isVideo && !loaded) {
    style.backgroundImage = `url("${placeholder}")`;
    style.backgroundSize = "100% 100%";
  }

  // Start a full viewport down so every image, whatever its height, begins
  // hidden; the strip clips it, so it emerges from the strip's baseline. The
  // stagger is capped so long projects don't keep trickling in off-screen.
  const motionProps = {
    initial: rise ? { y: window.innerHeight } : false,
    animate: { y: 0 },
    transition: { ...RISE_TRANSITION, delay: RISE_STAGGER * Math.min(index, 8) },
  } as const;

  if (isVideo) {
    return (
      <motion.video
        {...motionProps}
        className={styles.image}
        src={src}
        poster={placeholder}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onLoadedMetadata={handleReady}
        onError={onError}
        style={style}
      />
    );
  }

  return (
    <motion.img
      {...motionProps}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onLoad={handleReady}
      onError={onError}
      style={style}
    />
  );
}
