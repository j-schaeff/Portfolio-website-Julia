import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { detailImageHeight } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
import { ZOOM_TRANSITION } from "../../utils/motion";
import styles from "./StripImage.module.css";

interface StripImageProps {
  slug: string;
  index: number;
  src: string;
  alt: string;
  size: ImageSize;
  isVideo: boolean;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function StripImage({ slug, index, src, alt, size, isVideo, onClick }: StripImageProps) {
  // Every strip image keeps its layoutId so the lightbox can morph to/from it.
  // The grid restricts layoutId to the clicked image, so the route transition
  // still only ever matches one element.
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
    : { width: "auto", height: detailImageHeight(size, isMobile), objectFit: "contain" };

  if (isVideo) {
    return (
      <motion.video
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
        transition={ZOOM_TRANSITION}
      />
    );
  }

  return (
    <motion.img
      layoutId={layoutId}
      className={["image-card", styles.image].join(" ")}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onClick}
      style={style}
      transition={ZOOM_TRANSITION}
    />
  );
}
