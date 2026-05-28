import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { imageHeight, IMAGE_WIDTH } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
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
  return (
    <motion.img
      layoutId={imageLayoutId(slug, index)}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onClick}
      style={{ width: IMAGE_WIDTH, height: imageHeight(size) }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
