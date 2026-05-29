import { useNavigate } from "react-router-dom";
import type { Project } from "../../types/project";
import { useAnimation } from "../../context/AnimationContext";
import { InfoBlock } from "./InfoBlock";
import { GridImage } from "./GridImage";
import styles from "./GridItem.module.css";

export function GridItem({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { setOrigin } = useAnimation();

  const go = (
    imageIndex: number,
    event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({ slug: project.slug, imageIndex, rect });
    navigate(`/project/${project.slug}`);
  };

  const visibleImages = project.images
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => !img.hideInGrid);
  const [lead, ...rest] = visibleImages;

  const info = (
    <div
      className={styles.infoButton}
      role="link"
      tabIndex={0}
      onClick={(e) => go(0, e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") go(0, e);
      }}
    >
      <InfoBlock title={project.title} type={project.type} />
    </div>
  );

  const renderImage = ({ img, i }: (typeof visibleImages)[number]) => (
    <GridImage
      key={img.src + i}
      slug={project.slug}
      index={i}
      src={img.src}
      alt={img.alt || `${project.title} — ${i + 1}`}
      size={img.size}
      onActivate={(e) => go(i, e)}
    />
  );

  return (
    <div className={styles.row}>
      <div className={styles.lead}>
        {info}
        {lead && renderImage(lead)}
      </div>
      {rest.map(renderImage)}
    </div>
  );
}
