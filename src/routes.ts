import { lazy } from "react";

// The project, About and List pages load as their own chunks, so the index
// starts with less code. AnimatedRoutes preloads them when the browser is
// idle, and prefetchProject() on hover; a prerendered page also preloads its
// own chunk (vite/content.ts), so a direct visit doesn't wait either.
const loaders = {
  detail: () => import("./components/detail/DetailView"),
  about: () => import("./components/about/AboutView"),
  list: () => import("./components/list/ListView"),
};

export const DetailView = lazy(() => loaders.detail().then((m) => ({ default: m.DetailView })));
export const AboutView = lazy(() => loaders.about().then((m) => ({ default: m.AboutView })));
export const ListView = lazy(() => loaders.list().then((m) => ({ default: m.ListView })));

// The browser caches each import, so calling these again is free.
export const preloadDetail = () => void loaders.detail();
export function preloadRoutes() {
  Object.values(loaders).forEach((load) => void load());
}
