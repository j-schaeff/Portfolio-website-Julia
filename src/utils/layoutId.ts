// Shared identifier so Framer Motion can match the same image across the Grid,
// the Detail scroll strip, and the Lightbox for layout transitions.
export function imageLayoutId(slug: string, index: number): string {
  return `img-${slug}-${index}`;
}

// CSS transform-origin pointing at the centre of the clicked image, so the
// page zoom radiates from where the user clicked. Viewport coordinates work
// because both routes mount at scroll-top during the transition.
export function focalOrigin(rect: DOMRect | undefined): string {
  if (!rect) return "center";
  return `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
}
