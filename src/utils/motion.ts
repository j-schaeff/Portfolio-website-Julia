// Shared timing for the grid→detail transition. The page container fades and
// the shared-element image morph use this so the fade and the morph stay
// locked together as the clicked image flies into its detail strip slot.
export const ZOOM_TRANSITION = { duration: 0.6, ease: [0.22, 1, 0.36, 1] } as const;
