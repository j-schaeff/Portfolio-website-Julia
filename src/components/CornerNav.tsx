import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./CornerNav.module.css";

// Corner controls: the List link top-left (index page only; the list has an
// "Index" button in the same spot, so the two switch between the views) and
// the theme switch top-right. About is reached through the logo at the end of
// the grid (LogoCell).
export function CornerNav() {
  const { pathname } = useLocation();

  return (
    <>
      {pathname === "/" && (
        <Link to="/list" className={`${styles.item} ${styles.left}`}>
          List
        </Link>
      )}
      <ThemeToggle className={`${styles.item} ${styles.right}`} />
    </>
  );
}
