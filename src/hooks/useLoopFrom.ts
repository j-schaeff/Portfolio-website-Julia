import { useEffect, type RefObject } from "react";

// "Video start" (seconds) from the CMS: the video opens at that point and,
// when it reaches the end, jumps back there instead of to 0:00. The native
// `loop` attribute always restarts from the top, so videos with a start leave
// it off (pass `loop={!start}`) and this restarts them on `ended`. A start at
// or past the clip's end falls back to the beginning.
export function useLoopFrom(ref: RefObject<HTMLVideoElement | null>, start: number, src: string) {
  useEffect(() => {
    const video = ref.current;
    if (!video || !start) return;
    const seek = () => {
      video.currentTime = video.duration && start < video.duration ? start : 0;
    };
    const restart = () => {
      seek();
      void video.play().catch(() => {});
    };
    // Cached media can have its metadata before the listener is attached.
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    video.addEventListener("ended", restart);
    return () => {
      video.removeEventListener("loadedmetadata", seek);
      video.removeEventListener("ended", restart);
    };
  }, [ref, start, src]);
}
