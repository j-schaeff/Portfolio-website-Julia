/// <reference types="vite/client" />

// Frontmatter of every content file, parsed at build time (vite/content.ts).
declare module "virtual:content" {
  type Data = Record<string, unknown>;
  const content: {
    // Keyed by "/content/projects/<file>.md".
    projects: Record<string, Data>;
    order: Data | null;
    about: Data;
  };
  export default content;
}
