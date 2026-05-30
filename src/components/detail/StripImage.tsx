import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { imageHeight } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
import { isVideo } from "../../utils/media";
import styles from "./StripImage.module.css";

interface StripImageProps {
  slug: string;
  index: number;
  src: string;
  alt: string;
  size: ImageSize;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export function StripImage({ slug, index, src, alt, size, onClick }: StripImageProps) {
  // Every strip image keeps its layoutId so the lightbox can morph to/from it.
  // The grid restricts layoutId to the clicked image, so the route transition
  // still only ever matches one element.
  const layoutId = imageLayoutId(slug, index);
  const style = { width: "auto", height: imageHeight(size) };

  if (isVideo(src)) {
    return (
      <motion.video
        layoutId={layoutId}
        className={styles.image}
        src={src}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onClick={onClick}
        style={style}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    );
  }

  return (
    <motion.img
      layoutId={layoutId}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onClick}
      style={style}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
