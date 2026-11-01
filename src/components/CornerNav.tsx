import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./CornerNav.module.css";

// Corner controls: the About link top-left (index page only, where the detail
// view has its "Index" button) and the theme switch top-right.
export function CornerNav() {
  const { pathname } = useLocation();

  return (
    <>
      {pathname === "/" && (
        <Link to="/about" className={`${styles.item} ${styles.left}`}>
          About
        </Link>
      )}
      <ThemeToggle className={`${styles.item} ${styles.right}`} />
    </>
  );
}
