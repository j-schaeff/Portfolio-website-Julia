import { motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { useAnimation } from "../../context/AnimationContext";
import { focalOrigin } from "../../utils/layoutId";
import { GridItem } from "./GridItem";
import styles from "./GridView.module.css";

const ZOOM = { duration: 0.5, ease: [0.22, 1, 0.36, 1] } as const;

export function GridView() {
  const { projects } = useProjects();
  const { origin } = useAnimation();

  return (
    <motion.main
      className={styles.grid}
      style={{ transformOrigin: focalOrigin(origin?.rect) }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      // Push the grid toward the clicked tile as it hands off to the detail page.
      exit={{ opacity: 0, scale: 1.06 }}
      transition={ZOOM}
    >
      {projects.map((project) => (
        <GridItem key={project.slug} project={project} />
      ))}
    </motion.main>
  );
}
