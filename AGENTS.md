# AGENTS.md

Guidance for AI agents (and humans) working in this repo. Read this before making changes.

## What this is

A React + TypeScript + Vite single-page portfolio site. Projects are authored as Markdown files with YAML frontmatter and rendered through three views: a grid, a per-project detail strip, and a full-screen lightbox. Transitions between them use Framer Motion shared-element animations.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc (type-check) + vite build → dist/
npm run preview  # preview the production build
```

There is **no test suite and no linter configured**. The only automated check is the TypeScript compile in `npm run build` — run it to verify changes.

## Architecture

```
src/
  main.tsx                 entry point
  App.tsx                  providers: BrowserRouter → ProjectsProvider → AnimationProvider
  AnimatedRoutes.tsx       routes: "/" → GridView, "/project/:slug" → DetailView
  data/projects.ts         loads & parses all Markdown at build time (the data layer)
  types/project.ts         Project / ProjectImage / Frontmatter / ImageSize types
  context/
    ProjectsContext.tsx    exposes parsed projects + helpers to the tree
    AnimationContext.tsx   stores the click origin (slug, image index, DOMRect) for zoom transitions
  hooks/
    useProjects.ts         read ProjectsContext
    useLightbox.ts         index into the flat all-images list; ← → Esc keys; wraps around
    useDragScroll.ts       click-and-drag horizontal scrolling for the detail strip
    useActiveProject.ts    tracks which project is centered in the strip
    useBodyScrollLock.ts   lock body scroll (lightbox open)
  utils/
    layoutId.ts            imageLayoutId() shared id + focalOrigin() transform-origin
    imageSize.ts           size (1–5) → pixel height; BASE_HEIGHT * multiplier
    slug.ts                filename → URL slug
    media.ts               isVideo() extension check
  components/
    grid/                  GridView, GridItem, GridImage, InfoBlock
    detail/                DetailView, ScrollStrip, StripImage, DetailMeta
    lightbox/              Lightbox
  styles/                  index.css, variables.css (CSS custom properties)
content/projects/*.md      project content (one file per project)
public/images/             image & video assets
```

Styling is **CSS Modules** (`*.module.css`) plus shared CSS variables in [src/styles/variables.css](src/styles/variables.css). There is no CSS framework.

## How the data layer works ([src/data/projects.ts](src/data/projects.ts))

- All `content/projects/*.md` files are loaded at **build time** via Vite's `import.meta.glob` (eager, raw). Adding a Markdown file is enough to add a project — no registration step.
- `gray-matter` parses the frontmatter into `Project` objects, sorted by `order`, then `year`, then `title`.
- `normalizeSrc()` converts stored paths like `public/images/x.jpg` into root-absolute `/images/x.jpg`. **Keep this** — relative paths break on the `/project/:slug` route. Don't "simplify" it away.
- Legacy image entries may be plain strings instead of objects; `toImage()` handles both. Preserve that fallback.
- `allImages` is a flat list of every image across all projects, in project order. The lightbox indexes into this so next/prev cross project boundaries. `globalImageIndex(slug, indexInProject)` maps back into it.

## Key conventions & gotchas

- **Shared layout ids:** `imageLayoutId(slug, index)` must be identical wherever the same image appears (grid, strip, lightbox) — that's what lets Framer Motion morph between them. Don't change the format without updating every call site.
- **Zoom transitions:** clicking a tile records a `DOMRect` in AnimationContext; `focalOrigin()` turns it into a `transform-origin` so the zoom radiates from the click. The origin is cleared on `onAnimationComplete`.
- **Image sizing:** width follows the image's natural aspect ratio; only height scales, via the `size` field (1–5) → `imageHeight()`. The shared `ZOOM` easing `[0.22, 1, 0.36, 1]` over `0.5s` is duplicated in GridView and DetailView — keep them in sync if you change one.
- **Video support:** assets can be video; use `isVideo(src)` rather than assuming `<img>`.
- **CMS coupling:** [.pages.yml](.pages.yml) defines the content schema for Pages CMS. If you add/rename a frontmatter field, update `.pages.yml`, the `Frontmatter` type, and `toProject()` together, or the CMS and the site will drift.

## Deployment

Pushing to `main` auto-deploys to Netlify ([netlify.toml](netlify.toml): `npm run build` → `dist`, SPA catch-all redirect). Content edits usually come through Pages CMS (which commits to `main`). Be deliberate about committing/pushing — every push to `main` ships to production.

## Working norms

- Match the surrounding code style; keep the explanatory comments — they capture non-obvious reasoning (e.g. why `normalizeSrc` exists).
- Run `npm run build` before considering a change done.
- Don't commit or push unless asked.
