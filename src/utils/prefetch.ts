import type { Project } from "../types/project";
import { preloadDetail } from "../routes";

// Hovering (or touching) a link to a project warms what its page opens
// with: the page's code and the first strip images (posters for videos), so
// the rise plays on images that are already there. Once per project.
const done = new Set<string>();

export function prefetchProject(project: Project) {
  if (done.has(project.slug)) return;
  done.add(project.slug);
  preloadDetail();
  for (const img of project.images.slice(0, 2)) {
    const src = img.isVideo ? img.poster : img.full;
    if (src) new Image().src = src;
  }
}
