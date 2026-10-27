const EASE = [0.22, 1, 0.36, 1] as const;

// Shared timing for the grid's fade and the strip ↔ lightbox shared-element
// morph.
export const ZOOM_TRANSITION = { duration: 0.6, ease: EASE } as const;

// Grid→detail entrance: the index fades out while the project's strip images
// rise up from below, one after another, left to right.
export const RISE_TRANSITION = { duration: 0.9, ease: EASE } as const;
export const RISE_STAGGER = 0.06;
// Exit fade for the index: short, so it clears before the images settle.
export const GRID_EXIT_TRANSITION = { duration: 0.35, ease: EASE } as const;
