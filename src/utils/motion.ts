export const EASE = [0.22, 1, 0.36, 1] as const;

// Shared timing for the grid's fade and the metadata fade-in.
export const ZOOM_TRANSITION = { duration: 0.6, ease: EASE } as const;

// Grid→detail entrance: the index fades out while the project's strip images
// rise up from below, one after another, left to right.
export const RISE_TRANSITION = { duration: 0.9, ease: EASE } as const;
export const RISE_STAGGER = 0.06;
// Exit fade for the index: short, so it clears before the images settle.
export const GRID_EXIT_TRANSITION = { duration: 0.35, ease: EASE } as const;

// Mobile detail view: once the rise is done, the strip slides a little to the
// left and back, hinting that it scrolls sideways. Out with the usual ease,
// back with a gentler in-out.
export const NUDGE_DELAY = RISE_TRANSITION.duration + RISE_STAGGER;
// How much of the strip past the first image's right edge the nudge shows
// (the gap, then the start of the description card).
export const NUDGE_PEEK = 64;
export const NUDGE_TRANSITION = {
  duration: 1.1,
  times: [0, 0.4, 1],
  ease: [[...EASE], [0.45, 0, 0.55, 1]] as [number, number, number, number][],
};
