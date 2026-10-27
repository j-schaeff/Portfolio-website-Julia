import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { detailFillHeight, detailImageHeight } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
import { RISE_STAGGER, RISE_TRANSITION, ZOOM_TRANSITION } from "../../utils/motion";
import styles from "./StripImage.module.css";

interface StripImageProps {
  slug: string;
  index: number;
  src: string;
  alt: string;
  size: ImageSize;
  // Largest size in the project; on tablet/desktop it fills the strip height.
  largest: ImageSize;
  isVideo: boolean;
  // Play the page-entrance rise from the bottom on mount.
  rise: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function StripImage({ slug, index, src, alt, size, largest, isVideo, rise, onClick }: StripImageProps) {
  // Every strip image keeps its layoutId so the lightbox can morph to/from it.
  // The grid has none, so opening a project never matches a grid image.
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 560px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 560px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const layoutId = imageLayoutId(slug, index);
  const isLeadingMobileImage = isMobile && index === 0;
  const style: CSSProperties = isLeadingMobileImage
    ? { width: "auto", height: "100dvh", objectFit: "contain" }
    : {
        width: "auto",
        height: isMobile ? detailImageHeight(size, true) : detailFillHeight(size, largest),
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
        className={["image-card", styles.image].join(" ")}
        src={src}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onClick={onClick}
        style={style}
      />
    );
  }

  return (
    <motion.img
      {...motionProps}
      layoutId={layoutId}
      className={["image-card", styles.image].join(" ")}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onClick}
      style={style}
    />
  );
}
