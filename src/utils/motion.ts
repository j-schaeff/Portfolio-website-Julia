// Shared timing for the grid→detail "fly into the tile" zoom. The page
// containers and the shared-element image morph all use this so the dive and
// the morph stay locked together.
export const ZOOM_TRANSITION = { duration: 0.6, ease: [0.22, 1, 0.36, 1] } as const;

// How hard the grid dives past the camera as it hands off. The grid scales up
// around the clicked tile (see focalOrigin) and fades, so the tile rushes
// toward the viewer and the surrounding tiles sweep off the edges. The detail
// container itself is never scaled — it holds the shared strip image, and a
// parent transform would fight that image's layout morph — so the clicked image
// zooming to its final strip slot is what carries the eye into the detail page.
export const GRID_EXIT_SCALE = 1.9;
