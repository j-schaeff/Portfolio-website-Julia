import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { imageHeight } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
import { isVideo } from "../../utils/media";
import { useAnimation } from "../../context/AnimationContext";
import styles from "./GridImage.module.css";

interface GridImageProps {
  slug: string;
  index: number;
  src: string;
  alt: string;
  size: ImageSize;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
}

export function GridImage({ slug, index, src, alt, size, onActivate }: GridImageProps) {
  const { origin } = useAnimation();
  // Only the clicked image shares a layoutId, so a single element morphs into
  // the detail strip instead of every grid image fighting for a match.
  const isShared = origin?.slug === slug && origin?.imageIndex === index;
  const layoutId = isShared ? imageLayoutId(slug, index) : undefined;
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
        onClick={onActivate}
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
      onClick={onActivate}
      style={style}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
