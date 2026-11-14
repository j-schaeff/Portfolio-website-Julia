import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./CornerNav.module.css";

// Corner controls: the About link top-left and the List link top-centre
// (index page only, where the other views have their "Index" button) and the
// theme switch top-right.
export function CornerNav() {
  const { pathname } = useLocation();

  return (
    <>
      {pathname === "/" && (
        <>
          <Link to="/about" className={`${styles.item} ${styles.left}`}>
            About
          </Link>
          <Link to="/list" className={`${styles.item} ${styles.center}`}>
            List
          </Link>
        </>
      )}
      <ThemeToggle className={`${styles.item} ${styles.right}`} />
    </>
  );
}
