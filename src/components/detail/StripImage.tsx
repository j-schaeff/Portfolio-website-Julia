import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { motion } from "framer-motion";
import type { ImageSize } from "../../types/project";
import { useFallbackSrc } from "../../hooks/useFallbackSrc";
import { useIsLandscapePhone, useIsMobile } from "../../hooks/useIsMobile";
import {
  detailFillHeight,
  detailFocusHeight,
  detailImageHeight,
  FOCUS_SIDE_GUTTER,
} from "../../utils/imageSize";
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
  // Horizontal focal point, 0–100: the part of the first image on a phone
  // that stays in view while it's cropped to fill the screen.
  focus?: number;
  // Largest size in the project; on tablet/desktop it fills the strip height.
  largest: ImageSize;
  isVideo: boolean;
  // A video with sound: gets a toggle beneath it to unmute.
  hasAudio?: boolean;
  // Play the page-entrance rise from the bottom on mount.
  rise: boolean;
  // Fires once the media knows its own dimensions (loaded / metadata).
  onReady?: () => void;
  // Mobile pager only (ProjectPager): the project's images are tapped into
  // the focused view, where they all share one height (detailFocusHeight).
  focused?: boolean;
  // A tap on the media. Passing it also animates size changes (see below).
  onTap?: () => void;
}

export function StripImage({ index, src: preferred, original, alt, size, focus = 50, largest, isVideo, hasAudio = false, rise, onReady, aspect, placeholder, focused = false, onTap }: StripImageProps) {
  // A phone held sideways sizes its images like desktop: a share of the strip
  // height (its pager shows the desktop metadata band beneath, see
  // ProjectPager), so nothing fills the screen.
  const isMobile = useIsMobile();
  const isLandscapePhone = useIsLandscapePhone();
  const isPhonePortrait = isMobile && !isLandscapePhone;
  const { src, isOriginal, fallBack } = useFallbackSrc(preferred, original);
  const onError = isOriginal ? undefined : fallBack;
  const [loaded, setLoaded] = useState(false);
  const handleReady = () => {
    setLoaded(true);
    onReady?.();
  };

  const isLeadingMobileImage = isPhonePortrait && index === 0;
  // The first image on a phone fills the screen, cropped around its focal
  // point (the whole image is a tap away, in the focused view). The box is
  // the screen, not the image's shape, and cover fills it from the focus.
  // Focused, the box takes the image's own shape, so cover shows it whole;
  // both sizes are explicit lengths, so width and height ease together and it
  // uncrops smoothly. Without a known ratio the crop can't be undone
  // smoothly, so such an image keeps its natural width instead.
  const crops = isLeadingMobileImage && Boolean(aspect);
  const position = `${focus}% 50%`;
  const style: CSSProperties = crops
    ? focused
      ? {
          height: detailFocusHeight(aspect),
          width: `calc(${detailFocusHeight(aspect)} * ${aspect!.toFixed(4)})`,
          objectFit: "cover",
          objectPosition: position,
        }
      : // Fills the strip exactly (it's the pager's height, see ProjectPager).
        { width: "100vw", height: "100%", objectFit: "cover", objectPosition: position }
    : focused
    ? {
        width: "auto",
        height: detailFocusHeight(aspect),
        // Without a build-time ratio the height can't adapt, so cap the width.
        ...(aspect ? {} : { maxWidth: `calc(100vw - ${FOCUS_SIDE_GUTTER * 2}px)` }),
        objectFit: "contain",
      }
    : isLeadingMobileImage
    ? { width: "auto", height: "100%", objectFit: "contain" }
    : {
        width: "auto",
        height: isPhonePortrait ? detailImageHeight(size) : detailFillHeight(size, largest),
        objectFit: "contain",
      };
  if (aspect && !crops) style.aspectRatio = aspect;
  // The placeholder fills the box exactly (it has the same aspect ratio, or
  // the same crop), and is dropped once the real image is in so it can't
  // show through transparent areas.
  if (placeholder && !isVideo && !loaded) {
    style.backgroundImage = `url("${placeholder}")`;
    style.backgroundSize = crops ? "cover" : "100% 100%";
    if (crops) style.backgroundPosition = position;
  }

  // Start a full viewport down so every image, whatever its height, begins
  // hidden; the strip clips it, so it emerges from the strip's baseline. The
  // stagger is capped so long projects don't keep trickling in off-screen.
  // In the mobile pager the media's height eases between the normal and the
  // focused view (a CSS transition, .resizes), so the real box resizes and
  // the width follows each frame; ProjectPager slides the strip in step.
  const motionProps = {
    initial: rise ? { y: window.innerHeight } : false,
    animate: { y: 0 },
    transition: { ...RISE_TRANSITION, delay: RISE_STAGGER * Math.min(index, 8) },
    onClick: onTap,
  } as const;
  const imageClass = onTap ? `${styles.image} ${styles.resizes}` : styles.image;

  if (isVideo && hasAudio) {
    // The wrapper takes the box the video would have (same size, shadow and
    // backdrop), so the strip lays out exactly as before; the toggle hangs
    // beneath it without taking space. The leading mobile video fills the
    // screen, so its toggle sits inside the bottom edge instead.
    return (
      <motion.div {...motionProps} className={`${imageClass} ${styles.soundBox}`} style={style}>
        <SoundVideo
          src={src}
          poster={placeholder}
          alt={alt}
          inset={isLeadingMobileImage}
          fit={crops ? { objectFit: "cover", objectPosition: position } : undefined}
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
        className={imageClass}
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
      className={imageClass}
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
  // The wrapper's crop (StripImage's cropped first image), for the video.
  fit?: CSSProperties;
  onReady: () => void;
  onError?: () => void;
}

function SoundVideo({ src, poster, alt, inset, fit, onReady, onError }: SoundVideoProps) {
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

  // Its own tap, not the video's: the pager shouldn't toggle its view too.
  const toggle = (event: MouseEvent) => {
    event.stopPropagation();
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
        style={fit}
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
