import styles from "./InfoBlock.module.css";

interface InfoBlockProps {
  title: string;
  type: string;
}

export function InfoBlock({ title, type }: InfoBlockProps) {
  return (
    <div className={styles.info}>
      <span className={styles.title}>{title}</span>
      <span className={styles.type}>{type}</span>
    </div>
  );
}
