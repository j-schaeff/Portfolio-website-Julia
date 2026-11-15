import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LOGO_PAD_LEFT, LOGO_WIDTH } from "../../hooks/useJustifiedRows";
import cellStyles from "./GridItem.module.css";
import logoMask from "./logo-mask.svg";
import styles from "./Logo.module.css";

// The exit: eases in, so the logo gathers speed as it drops out of view.
const EXIT = { duration: 0.8, ease: [0.55, 0, 0.75, 0] } as const;

// The loading logo is a skeleton the whole time it's on screen: dimmed and
// slowly breathing, with a highlight sweeping across it. Both run as CSS
// opacity/transform animations (see Logo.module.css) so they stay on the
// compositor and keep moving smoothly while the main thread is busy loading
// images — animating the SVG itself repainted the whole logo every frame,
// which stuttered on phones.
const shimmerMask = { "--logo-mask": `url(${logoMask})` } as CSSProperties;

// Inlined (not an <img>) so the fill can follow the theme via currentColor.
// Same paths as logo-mask.svg, which shapes the loading shimmer.
function LogoMark() {
  return (
    <svg
      className={styles.svg}
      viewBox="0 0 806.18 380.08"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0,207.55h13.78c15.66,0,18.17-7.52,18.17-21.3v-113.17h13.15v113.17c0,22.13-7.31,32.99-31.32,32.99H0v-11.69ZM30.48,32.57h16.08v19h-16.08v-19ZM72.46,139.68v-66.61h13.15v64.31c0,19,10.02,30.9,27.56,30.9s27.56-11.9,27.56-30.9v-64.31h13.15v66.61c0,20.25-15.66,39.88-40.72,39.88s-40.72-19.63-40.72-39.88ZM177.27,131.12c0-36.33,15.03-73.92,35.08-106.07l12.74,3.34c-18.58,29.65-35.08,69.53-35.08,104.61,0,20.25,5.85,34.87,22.55,34.87h3.34v11.69h-3.34c-25.89,0-35.29-21.09-35.29-48.44ZM252.86,72.24l12.53,2.3-24.22,104.61-12.53-2.92,24.22-103.98ZM251.81,32.57h16.08v19h-16.08v-19ZM280.21,150.75c0-15.66,8.14-27.35,30.48-31.53,31.11-5.85,37.38-7.31,37.38-19.42,0-6.68-5.01-17.12-25.06-17.12s-24.01,8.14-26.73,19l-12.95-2.09c5.01-17.54,15.66-28.61,39.67-28.61,26.31,0,38.21,13.15,38.21,36.33v45.52c0,8.14.63,16.5,2.51,24.64h-12.95c-1.25-2.51-2.3-7.31-1.67-13.36h-.63c-6.47,9.6-18.58,15.45-34.66,15.45-21.72,0-33.62-13.99-33.62-28.81ZM348.07,135.09v-18.79c-2.09,7.31-11.28,9.81-36.54,14.82-9.19,1.88-18.17,7.73-18.17,19,0,8.35,5.85,17.75,22.34,17.75,19.21,0,32.36-14.2,32.36-32.78Z" />
      <path d="M25.47,344.37l12.95-2.3c0,13.78,10.65,26.31,27.98,26.31s23.59-8.77,24.22-15.66c1.04-11.28-7.52-17.12-15.03-19.21l-21.3-6.06c-12.95-3.76-27.14-12.74-25.68-31.74,1.04-12.53,13.99-24.22,37.17-24.01,24.85.21,36.12,16.7,35.5,35.08l-12.74,2.3c-.21-13.78-4.18-25.68-23.59-25.68-16.08,0-22.76,7.93-23.39,14.82-.63,10.23,7.52,14.62,15.24,16.91l21.09,6.06c13.15,3.76,27.35,13.57,25.68,34.03-1.04,12.74-13.57,24.85-38.21,24.85-22.34,0-40.51-17.33-39.88-35.71ZM121.73,325.58c0-30.28,20.04-54.08,46.15-54.08,24.01,0,35.91,11.48,41.76,29.02l-12.95,2.09c-3.55-10.86-9.4-19.42-28.81-19.42s-32.99,18.37-32.99,42.39,13.15,42.8,32.99,42.8,25.26-8.98,28.81-19.84l12.95,2.09c-5.85,17.54-17.75,29.44-41.76,29.44-26.1,0-46.15-24.22-46.15-54.5ZM231.56,225.56h13.15v65.98h.63c4.38-10.23,16.91-20.04,30.9-20.04,23.59,0,37.58,14.2,36.75,38.21l-2.09,68.28h-13.15l2.09-68.07c.63-20.25-10.23-26.73-26.1-26.73s-29.02,10.86-29.02,30.9v63.89h-13.15v-152.42ZM333.87,351.26c0-15.66,8.14-27.35,30.48-31.53,31.11-5.85,37.38-7.31,37.38-19.42,0-6.68-5.01-17.12-25.06-17.12s-24.01,8.14-26.73,19l-12.95-2.09c5.01-17.54,15.66-28.61,39.67-28.61,26.31,0,38.21,13.15,38.21,36.33v45.52c0,8.14.63,16.5,2.51,24.64h-12.95c-1.25-2.51-2.3-7.31-1.67-13.36h-.63c-6.47,9.6-18.58,15.45-34.66,15.45-21.72,0-33.62-13.99-33.62-28.81ZM401.73,335.6v-18.79c-2.09,7.31-11.28,9.81-36.54,14.82-9.19,1.88-18.17,7.73-18.17,19,0,8.35,5.85,17.75,22.34,17.75,19.21,0,32.36-14.2,32.36-32.78ZM361.64,236.84h14.82v16.5h-14.82v-16.5ZM399.43,236.84h14.82v16.5h-14.82v-16.5ZM453.1,289.46h-17.96v-11.69h17.96v-.84c-16.7-27.56,2.51-47.19,24.22-47.19,11.28,0,18.79,3.55,24.64,10.23l-9.19,8.35c-4.38-5.43-9.4-6.68-15.45-6.68-12.53,0-25.68,11.69-11.07,36.12h29.65v11.69h-29.65v88.53h-13.15v-88.53ZM529.31,289.46h-17.96v-11.69h17.96v-.84c-16.7-27.56,2.51-47.19,24.22-47.19,11.28,0,18.79,3.55,24.64,10.23l-9.19,8.35c-4.38-5.43-9.4-6.68-15.45-6.68-12.53,0-25.68,11.69-11.07,36.12h29.65v11.69h-29.65v88.53h-13.15v-88.53ZM584.85,331.63c0-36.33,15.03-73.92,35.08-106.07l12.74,3.34c-18.58,29.65-35.08,69.53-35.08,104.61,0,20.25,5.85,34.87,22.55,34.87h3.34v11.69h-3.34c-25.89,0-35.29-21.09-35.29-48.44ZM636,325.58c0-30.28,17.96-54.08,48.23-54.08s46.56,22.97,44.27,54.08h-79.34c0,24.01,13.15,42.8,36.12,42.8,14.62,0,25.06-6.06,29.44-19.84l12.95,2.09c-5.22,17.54-21.3,29.44-42.39,29.44-30.28,0-49.28-24.22-49.28-54.5ZM715.14,313.89c-.42-22.55-16.7-30.69-30.9-30.69-19.84,0-30.9,12.74-34.03,30.69h64.94ZM751.05,273.59h13.15v17.54h.63c2.3-10.23,16.91-20.04,28.81-20.04,5.85,0,9.4.42,12.53,1.04l-2.92,11.69c-2.92-.84-6.47-1.04-12.11-1.04-13.15,0-26.94,10.86-26.94,30.9v64.31h-13.15v-104.4Z" />
    </svg>
  );
}

// Full-screen loading logo. Decorative and ignores the pointer. On exit it
// slides down past the bottom of the viewport (transform only, so it stays
// smooth on the compositor). The skeleton pulse runs for the overlay's whole
// life, through the reveal and the exit.
export function LogoOverlay() {
  return (
    <div className={styles.overlay} aria-hidden="true">
      <motion.div
        className={styles.overlayMark}
        exit={{ y: "100vh", transition: EXIT }}
      >
        {/* Rotated on mobile (see the CSS). A separate layer so the rotation
            doesn't turn the exit's downward slide sideways. */}
        <div className={styles.overlayTurn}>
          <div className={`${styles.layer} ${styles.pulse}`}>
            <LogoMark />
          </div>
          <div className={`${styles.layer} ${styles.shimmer}`} style={shimmerMask}>
            <div className={styles.band} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface LogoCellProps {
  // Justified width from useJustifiedRows; natural size until it's known.
  width: number | undefined;
  // Hidden while the overlay still shows the logo.
  showMark: boolean;
}

// The grid's final slot. Mirrors a GridItem cell (same reserved label band) so
// it shares the row's baseline, but isn't a data-grid-cell: the row reveal
// never hides it. Once shown, the logo is the link to the About page.
export function LogoCell({ width, showMark }: LogoCellProps) {
  const cellWidth = width ?? LOGO_WIDTH + LOGO_PAD_LEFT;
  const style = {
    "--cell-w": `${cellWidth}px`,
    "--logo-pad": `${LOGO_PAD_LEFT}px`,
  } as CSSProperties;

  return (
    <div className={`${cellStyles.cell} ${styles.cell}`} style={style}>
      {showMark ? (
        <Link to="/about" className={styles.cellMark} aria-label="About">
          <LogoMark />
        </Link>
      ) : (
        <div className={styles.cellMark} aria-hidden="true" />
      )}
      <div className={cellStyles.label} />
    </div>
  );
}
