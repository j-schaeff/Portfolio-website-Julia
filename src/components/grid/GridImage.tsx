import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { imageHeight, IMAGE_WIDTH } from "../../utils/imageSize";
import { imageLayoutId } from "../../utils/layoutId";
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
  return (
    <motion.img
      layoutId={imageLayoutId(slug, index)}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onClick={onActivate}
      style={{ width: IMAGE_WIDTH, height: imageHeight(size) }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
