export type ImageSize = 1 | 2 | 3 | 4 | 5;

export interface Frontmatter {
  title: string;
  type: string;
  description: string;
  year: number;
  order: number;
  imageSize: ImageSize;
  images: string[];
}

export interface Project extends Frontmatter {
  slug: string;
}
