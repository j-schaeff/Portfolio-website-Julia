export type ImageSize = 1 | 2 | 3 | 4 | 5;

export interface ProjectImage {
  // The uploaded original; components fall back to it if a copy is missing.
  src: string;
  // Web-sized copies (see src/utils/media.ts): `thumb` for the index grid,
  // `full` for the detail strip. For a video both are the
  // re-encoded file and `poster` is its first frame.
  thumb: string;
  full: string;
  poster?: string;
  // Width ÷ height, recorded at build time so the grid can lay out before the
  // media loads. Missing for external links; the grid measures those instead.
  aspect?: number;
  size: ImageSize;
  hideInGrid: boolean;
  alt: string;
  isVideo: boolean;
  // A video with an audible soundtrack (found at build time); the detail
  // strip shows a sound toggle beneath it.
  hasAudio: boolean;
}

export interface Frontmatter {
  title: string;
  type: string;
  description: string;
  year: number;
  // Optional; empty strings when not set. `clientUrl` makes the client a link.
  client: string;
  clientUrl: string;
  images: ProjectImage[];
}

export interface Project extends Frontmatter {
  slug: string;
}
