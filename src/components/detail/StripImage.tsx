import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { useFallbackSrc } from "../../hooks/useFallbackSrc";
import { useIsMobile } from "../../hooks/useIsMobile";
import { detailFillHeight, detailImageHeight } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
import { RISE_STAGGER, RISE_TRANSITION, ZOOM_TRANSITION } from "../../utils/motion";
import styles from "./StripImage.module.css";

interface StripImageProps {
  slug: string;
  index: number;
  // The detail-sized copy, and the upload to fall back to if it's missing.
  src: string;
  original: string;
  alt: string;
  size: ImageSize;
  // Largest size in the project; on tablet/desktop it fills the strip height.
  largest: ImageSize;
  isVideo: boolean;
  // Play the page-entrance rise from the bottom on mount.
  rise: boolean;
  // False for the mobile pager's loop copies: a layoutId must be unique, and
  // the lightbox morphs to the real image.
  shared?: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function StripImage({ slug, index, src: preferred, original, alt, size, largest, isVideo, rise, shared = true, onClick }: StripImageProps) {
  // Every strip image keeps its layoutId so the lightbox can morph to/from it.
  // The grid has none, so opening a project never matches a grid image.
  const isMobile = useIsMobile();
  const { src, isOriginal, fallBack } = useFallbackSrc(preferred, original);
  const onError = isOriginal ? undefined : fallBack;

  const layoutId = shared ? imageLayoutId(slug, index) : undefined;
  const isLeadingMobileImage = isMobile && index === 0;
  const style: CSSProperties = isLeadingMobileImage
    ? // Fills the strip exactly (it's the pager's height, see ProjectPager).
      { width: "auto", height: "100%", objectFit: "contain" }
    : {
        width: "auto",
        height: isMobile ? detailImageHeight(size) : detailFillHeight(size, largest),
        objectFit: "contain",
      };

  // Start a full viewport down so every image, whatever its height, begins
  // hidden; the strip clips it, so it emerges from the strip's baseline. Only
  // y gets the staggered rise — layout (lightbox) morphs keep ZOOM timing. The
  // stagger is capped so long projects don't keep trickling in off-screen.
  const motionProps = {
    initial: rise ? { y: window.innerHeight } : false,
    animate: { y: 0 },
    transition: {
      ...ZOOM_TRANSITION,
      y: { ...RISE_TRANSITION, delay: RISE_STAGGER * Math.min(index, 8) },
    },
  } as const;

  if (isVideo) {
    return (
      <motion.video
        {...motionProps}
        layoutId={layoutId}
        className={styles.image}
        src={src}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onClick={onClick}
        onError={onError}
        style={style}
      />
    );
  }

  return (
    <motion.img
      {...motionProps}
      layoutId={layoutId}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onClick}
      onError={onError}
      style={style}
    />
  );
}
