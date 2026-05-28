import { motion } from "framer-motion";
import { useProjects } from "../../hooks/useProjects";
import { GridItem } from "./GridItem";
import styles from "./GridView.module.css";

export function GridView() {
  const { projects } = useProjects();

  return (
    <motion.main
      className={styles.grid}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {projects.map((project) => (
        <GridItem key={project.slug} project={project} />
      ))}
    </motion.main>
  );
}
