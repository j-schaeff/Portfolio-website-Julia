// Shared identifier so Framer Motion can match the same image across the Grid,
// the Detail scroll strip, and the Lightbox for layout transitions.
export function imageLayoutId(slug: string, index: number): string {
  return `img-${slug}-${index}`;
}
