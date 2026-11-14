# AGENTS.md

Guidance for AI agents (and humans) working in this repo. Read this before making changes.

## What this is

A React + TypeScript + Vite single-page portfolio site. Projects are authored as Markdown files with YAML frontmatter and rendered through two views: a grid and a per-project detail strip. Transitions between them use Framer Motion animations. Strip images aren't clickable (there is no lightbox).

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc (type-check) + vite build → dist/
npm run preview  # preview the production build
npm run sizes    # write a size into any project image that lacks one
npm run media    # make web-sized copies of public/images (also runs before dev/build)
```

There is **no test suite and no linter configured**. The only automated check is the TypeScript compile in `npm run build` — run it to verify changes.

## Architecture

```
src/
  main.tsx                 entry point (imports polyfills first, then App)
  polyfills.ts             defines global `Buffer` — gray-matter needs it at runtime
  App.tsx                  providers: BrowserRouter → ProjectsProvider
  AnimatedRoutes.tsx       routes: "/" → GridView, "/project?project=<slug>" → DetailView, "/about" → AboutView, "/list" → ListView
  data/projects.ts         loads & parses all Markdown at build time (the data layer)
  data/about.ts            parses content/about.md (bio paragraphs + links)
  types/project.ts         Project / ProjectImage / Frontmatter / ImageSize types
  context/
    ProjectsContext.tsx    exposes the parsed projects to the tree
  hooks/
    useProjects.ts         read ProjectsContext
    useBodyScrollLock.ts   lock body scroll (detail page)
    useIsMobile.ts         tracks the 560px mobile breakpoint
    useJustifiedRows.ts    picks the index grid's rows and gives each cell a width
    useRowReveal.ts        logo loading screen + row-by-row reveal on first load
    useFallbackSrc.ts      show a web-sized copy, falling back to the original if it fails
  utils/
    imageSize.ts           clampImageSize() + size (1–5) → grid/strip heights
    slug.ts                filename → URL slug
    media.ts               isVideo() extension check, dropboxDirect() share-link rewrite, optimizedSrc()
    motion.ts              shared transition timings (grid fade, strip rise)
    intro.ts               once-per-page-load flags: logo + reveal intro, desktop scroll hint
    justify.ts             whole-paragraph line breaking (Knuth–Plass) + hyphenation for justified text
  components/
    grid/                  GridView, GridItem, GridImage, InfoBlock, Logo
    detail/                DetailView, ScrollStrip (desktop), ProjectPager (mobile), StripImage, DetailMeta, ProjectHint (desktop up/down project arrows + scroll hint)
    about/                 AboutView
    list/                  ListView (every project as one line: year, title, type; no year on phones)
    JustifiedText.tsx      justified paragraph without wide word gaps (detail descriptions)
    CornerNav.tsx          corner controls: List link top-left (index only; About is the grid's logo) + ThemeToggle top-right
    ThemeToggle.tsx        light/dark switch, saved to localStorage
  styles/                  index.css, variables.css (CSS custom properties)
content/projects/*.md      project content (one file per project)
scripts/assign-sizes.mjs   fills missing image sizes (run in the deploy workflow)
scripts/optimize-media.mjs web-sized copies of public/images → public/optimized (gitignored)
content/about.md           About page content (bio + links), editable in Pages CMS
content/order.md           project order ("Project order" list in Pages CMS)
public/images/             image & video assets
```

Styling is **CSS Modules** (`*.module.css`) plus shared CSS variables in [src/styles/variables.css](src/styles/variables.css). There is no CSS framework.

## How the data layer works ([src/data/projects.ts](src/data/projects.ts))

- All `content/projects/*.md` files are loaded at **build time** via Vite's `import.meta.glob` (eager, raw). Adding a Markdown file is enough to add a project — no registration step.
- `gray-matter` parses the frontmatter into `Project` objects, sorted by their position in [content/order.md](content/order.md) — the "Project order" list in Pages CMS, a list of `reference` entries (project file paths) dragged into place. Entries are matched by slug (NFC-normalised, since macOS may store "ä" decomposed); projects not in the list follow, by `year` then `title`, and entries for deleted files are ignored. There is no per-project order field. (gray-matter needs a global `Buffer`; [src/polyfills.ts](src/polyfills.ts) supplies it and is imported first in `main.tsx`.)
- `normalizeSrc()` prefixes stored paths like `public/images/x.jpg` with `import.meta.env.BASE_URL`, producing `/images/x.jpg` locally and `/Portfolio-website-Julia/images/x.jpg` on the GitHub Pages subpath. **Keep this** — relative paths break on the `/project` route, and a hardcoded `/` base breaks the Pages build. Absolute (`http(s)://`, `//`, `data:`) sources pass through untouched.
- Uploaded videos go in an entry's `video` field, not `image`: the CMS `image` field type shows thumbnails but rejects video extensions. Precedence is `videoUrl` → `video` → `image`.
- `videoUrl` on an image entry overrides the uploaded `image`: it lets large videos stream from external hosting (e.g. Dropbox) instead of being committed through the CMS. `dropboxDirect()` rewrites Dropbox share links to a playable form (`raw=1`); such entries are always treated as video.
- Legacy image entries may be plain strings instead of objects; `toImage()` handles both. Preserve that fallback.
- **Web-sized copies:** the CMS uploads in `public/images/` are often several MB, so components never show them directly. `scripts/optimize-media.mjs` (run by `predev`/`prebuild`, needs `sharp` and `ffmpeg`) writes `<file>.thumb.webp` (600px tall, grid), `<file>.full.webp` (2400px long edge, detail strip), and for videos `<file>.opt.mp4` + `<file>.poster.webp` into `public/optimized/`. Work is skipped by content hash (`.manifest.json`), and the deploy workflow caches the folder. `toImage()` fills `ProjectImage.thumb`/`full`/`poster` via `optimizedSrc()`; `src` stays the original, and `useFallbackSrc()` switches to it if a copy fails to load. External sources (`videoUrl`) and SVGs have no copies and pass through unchanged. If you change the file naming, update both the script and `optimizedSrc()`. The script also writes each copy's aspect ratio to `src/generated/media-aspects.json` (gitignored); `toImage()` sets it as `ProjectImage.aspect`, so the index lays out its rows before any image loads. Media without one (external `videoUrl`s) is measured on load instead.

## Key conventions & gotchas

- **Grid → detail transition:** the grid fades out quickly while the detail page (fixed over the viewport, so it's in place during the `mode="sync"` crossfade) plays a staggered rise: each strip image slides up from below, then the metadata fades in. Timings live in [src/utils/motion.ts](src/utils/motion.ts). The rise only plays on the page's first render, not on project switches. The logo loading screen + row-by-row reveal play once per page load (each image grows in, then its title and type slide in 24px from the left); the logo waits only for the media in the viewport and for those cells to reveal (cells below the fold reveal with the last visible one and finish loading afterwards). They play on first entry or refresh, tracked by [src/utils/intro.ts](src/utils/intro.ts); returning to the index from a project just fades the grid in.
- **Image sizing:** width follows the image's natural aspect ratio; only height scales, via the `size` field (1–5) → `imageHeight()`. Shared transition timings (the `[0.22, 1, 0.36, 1]` easing, `ZOOM_TRANSITION` at 0.6s, the rise) live once in [src/utils/motion.ts](src/utils/motion.ts). Every image stores an explicit `size` in its frontmatter. New images saved without one are filled by [scripts/assign-sizes.mjs](scripts/assign-sizes.mjs) (`npm run sizes`), which the deploy workflow runs and commits back to `main`: a slug-seeded mix of 2–5 where no two neighbours match. Existing 1–5 values are never touched, so after that they are adjusted by hand in the CMS. Until the fill lands, `clampImageSize()` renders a missing size as 3.
- **Video support:** assets can be video; use `isVideo(src)` rather than assuming `<img>`. On the index, a video with a poster doesn't load or play until the reveal starts; the loading screen waits on its poster instead. A video can be an uploaded file or an external `videoUrl` (see the data layer above) — by the time it reaches a component the source is already resolved into `ProjectImage.src` with `isVideo` set, so components don't need to know which it was.
- **CMS coupling:** [.pages.yml](.pages.yml) defines the content schema for Pages CMS. If you add/rename a frontmatter field, update `.pages.yml`, the `Frontmatter` type, and `toProject()` together, or the CMS and the site will drift. Project order lives in `content/order.md`, not in the project files; renaming a project's file means updating its entry there (it otherwise drops to the end).

## Deployment

Pushing to `main` deploys to **GitHub Pages** ([.github/workflows/](.github/workflows/)), served at the custom domain `juliaschaeffler.com` (set in the repo's Pages settings, DNS at GoDaddy). Because of the custom domain the build uses the default `/` base (see `base` in [vite.config.ts](vite.config.ts)); it copies `index.html` → `404.html` for the SPA fallback. If you change the `base` handling, keep it in sync with `normalizeSrc()`, which relies on `import.meta.env.BASE_URL`. Removing the custom domain would require `DEPLOY_BASE=/Portfolio-website-Julia/` again.

[netlify.toml](netlify.toml) remains from the earlier Netlify setup (`npm run build` → `dist`, SPA catch-all redirect), but Netlify no longer serves the domain — its free build credits ran out under the volume of CMS commits.

Content edits usually come through Pages CMS (which commits to `main`). Be deliberate about committing/pushing — every push to `main` ships to production.

## Working norms

- Match the surrounding code style; keep the explanatory comments — they capture non-obvious reasoning (e.g. why `normalizeSrc` exists).
- Run `npm run build` before considering a change done.
- Don't commit or push unless asked.
