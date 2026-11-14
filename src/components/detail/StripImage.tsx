import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { useFallbackSrc } from "../../hooks/useFallbackSrc";
import { useIsMobile } from "../../hooks/useIsMobile";
import { detailFillHeight, detailImageHeight } from "../../utils/imageSize";
import { RISE_STAGGER, RISE_TRANSITION } from "../../utils/motion";
import styles from "./StripImage.module.css";

interface StripImageProps {
  index: number;
  // The detail-sized copy, and the upload to fall back to if it's missing.
  src: string;
  original: string;
  // Width ÷ height from the build. Sizes the box before the file arrives, so
  // nothing after it in the strip shifts (or shows early) while it loads.
  aspect?: number;
  // Already-cached stand-in shown until the detail copy loads: the grid
  // thumbnail for an image, the poster frame for a video.
  placeholder?: string;
  alt: string;
  size: ImageSize;
  // Largest size in the project; on tablet/desktop it fills the strip height.
  largest: ImageSize;
  isVideo: boolean;
  // A video with sound: gets a toggle beneath it to unmute.
  hasAudio?: boolean;
  // Play the page-entrance rise from the bottom on mount.
  rise: boolean;
  // Fires once the media knows its own dimensions (loaded / metadata).
  onReady?: () => void;
}

export function StripImage({ index, src: preferred, original, alt, size, largest, isVideo, hasAudio = false, rise, onReady, aspect, placeholder }: StripImageProps) {
  const isMobile = useIsMobile();
  const { src, isOriginal, fallBack } = useFallbackSrc(preferred, original);
  const onError = isOriginal ? undefined : fallBack;
  const [loaded, setLoaded] = useState(false);
  const handleReady = () => {
    setLoaded(true);
    onReady?.();
  };

  const isLeadingMobileImage = isMobile && index === 0;
  const style: CSSProperties = isLeadingMobileImage
    ? // Fills the strip exactly (it's the pager's height, see ProjectPager).
      { width: "auto", height: "100%", objectFit: "contain" }
    : {
        width: "auto",
        height: isMobile ? detailImageHeight(size) : detailFillHeight(size, largest),
        objectFit: "contain",
      };
  if (aspect) style.aspectRatio = aspect;
  // The placeholder fills the box exactly (it has the same aspect ratio), and
  // is dropped once the real image is in so it can't show through
  // transparent areas.
  if (placeholder && !isVideo && !loaded) {
    style.backgroundImage = `url("${placeholder}")`;
    style.backgroundSize = "100% 100%";
  }

  // Start a full viewport down so every image, whatever its height, begins
  // hidden; the strip clips it, so it emerges from the strip's baseline. The
  // stagger is capped so long projects don't keep trickling in off-screen.
  const motionProps = {
    initial: rise ? { y: window.innerHeight } : false,
    animate: { y: 0 },
    transition: { ...RISE_TRANSITION, delay: RISE_STAGGER * Math.min(index, 8) },
  } as const;

  if (isVideo && hasAudio) {
    // The wrapper takes the box the video would have (same size, shadow and
    // backdrop), so the strip lays out exactly as before; the toggle hangs
    // beneath it without taking space. The leading mobile video fills the
    // screen, so its toggle sits inside the bottom edge instead.
    return (
      <motion.div {...motionProps} className={`${styles.image} ${styles.soundBox}`} style={style}>
        <SoundVideo
          src={src}
          poster={placeholder}
          alt={alt}
          inset={isLeadingMobileImage}
          onReady={handleReady}
          onError={onError}
        />
      </motion.div>
    );
  }

  if (isVideo) {
    return (
      <motion.video
        {...motionProps}
        className={styles.image}
        src={src}
        poster={placeholder}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onLoadedMetadata={handleReady}
        onError={onError}
        style={style}
      />
    );
  }

  return (
    <motion.img
      {...motionProps}
      className={styles.image}
      src={src}
      alt={alt}
      draggable={false}
      onLoad={handleReady}
      onError={onError}
      style={style}
    />
  );
}

// Unmuting one video mutes whichever was playing sound before.
const SOUND_EVENT = "strip-sound";

interface SoundVideoProps {
  src: string;
  poster?: string;
  alt: string;
  inset: boolean;
  onReady: () => void;
  onError?: () => void;
}

function SoundVideo({ src, poster, alt, inset, onReady, onError }: SoundVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const onOther = (event: Event) => {
      if ((event as CustomEvent).detail !== videoRef.current) setMuted(true);
    };
    window.addEventListener(SOUND_EVENT, onOther);
    return () => window.removeEventListener(SOUND_EVENT, onOther);
  }, []);

  // React doesn't keep the muted attribute in sync, so set the property.
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    if (!next) {
      // Unmuting is the user's tap, so playback is allowed; start from the top
      // so the soundtrack is heard from its beginning.
      video.muted = false;
      video.currentTime = 0;
      void video.play().catch(() => {});
      window.dispatchEvent(new CustomEvent(SOUND_EVENT, { detail: video }));
    }
    setMuted(next);
  };

  return (
    <>
      <video
        ref={videoRef}
        className={styles.soundVideo}
        src={src}
        poster={poster}
        aria-label={alt}
        muted
        loop
        autoPlay
        playsInline
        onLoadedMetadata={onReady}
        onError={onError}
      />
      <button
        type="button"
        className={`${styles.soundToggle} ${inset ? styles.soundInset : ""}`}
        onClick={toggle}
        aria-pressed={!muted}
        aria-label={muted ? "Play sound" : "Mute sound"}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
          {muted ? (
            <path d="M10.5 6l4 4M14.5 6l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          ) : (
            <path
              d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>
      </button>
    </>
  );
}
