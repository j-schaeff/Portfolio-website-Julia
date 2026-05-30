export type ImageSize = 1 | 2 | 3 | 4 | 5;

export interface ProjectImage {
  src: string;
  size: ImageSize;
  hideInGrid: boolean;
  alt: string;
  isVideo: boolean;
}

export interface Frontmatter {
  title: string;
  type: string;
  description: string;
  year: number;
  order: number;
  images: ProjectImage[];
}

export interface Project extends Frontmatter {
  slug: string;
}
