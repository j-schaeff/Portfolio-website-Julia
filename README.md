# Portfolio Website — Julia Schäffler

A single-page portfolio site for showcasing design projects. Built with React, TypeScript, and Vite, with animated transitions powered by Framer Motion. Content is authored as Markdown and managed through a CMS — no code changes needed to add or edit projects.

## How it works

- **Grid view** (`/`) — every project's images laid out in justified rows.
- **Detail view** (`/project?project=<slug>`) — a horizontal strip of a project's images plus its title, type, year, and description. Scrolling vertically moves between projects (on phones, each project is a swipeable full-screen page).
- **Lightbox** — click any image in the detail view to open a full-screen viewer that pages through that project's images (← → arrows / Escape).
- **About page** (`/about`) — bio, links, and further text columns (Impressum & AGB), linked from the top-left corner of the grid.
- **Light/dark theme** — a toggle in the top-right corner; the choice is remembered in the browser.
- **Transitions** — on first load a logo loading screen gives way to a snaking reveal of the grid; opening a project fades the grid out as the strip images rise in; strip images morph into the lightbox.

## Content

Projects live as Markdown files in [content/projects/](content/projects/), one file per project. Each file has YAML frontmatter:

```yaml
---
title: Spring
type: Print              # shown next to the title
description: Visual identity for a late-night concert series.
year: 2021
order: 5                 # controls position; ascending
images:
  - image: public/images/uploads/5_spring/cover-2.jpg
    video: ""            # optional: uploaded .mp4/.mov, shown instead of the image
    videoUrl: ""         # optional: link to an externally-hosted video instead
    size: "5"            # height, 1–5 (width follows aspect ratio)
    hideInGrid: false    # hide in grid but still show in detail view
    alt: ""              # screen-reader description
---
Optional body text (currently not rendered on the page).
```

Uploads go to [public/images/uploads/](public/images/uploads/). The site supports images **and** video:

- **Images** go in the `image` field (jpg, jpeg, png, gif, svg).
- **Uploaded videos** go in the `video` field (mp4, mov) — the CMS image field doesn't accept video files.
- **Large videos** can skip the upload: paste a link into `videoUrl` instead. Any direct video URL works, and Dropbox share links are converted to a playable form automatically.

If more than one is set, `videoUrl` wins over `video`, which wins over `image`.

**Image sizes:** leave `size` empty on new images and a varied size (2–5, no two neighbours alike) is filled in automatically on the next deploy and committed back to the repo. After that it's never changed automatically, so adjust it by hand in the CMS whenever you like. Until it's filled in, a missing size displays as 3.

The **About page** content lives in [content/about.md](content/about.md): a bio, two more text columns, and a list of links. In the text columns, separate paragraphs with an empty line; in column 2, start a paragraph with `# ` for a heading or `> ` to indent it.

### Editing content

Content is normally edited through **[Pages CMS](https://pagescms.org)**, which is connected to the GitHub repo and reads [.pages.yml](.pages.yml). Saving in the CMS commits to `main`, which triggers an automatic deploy. You can also edit the Markdown files directly if you prefer.

## Development

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm run build    # type-check (tsc) and build to dist/
npm run preview  # preview the production build locally
npm run sizes    # fill in a size for any project image that lacks one
```

## Deployment

Every push to `main` deploys automatically, through two paths:

- **Netlify** ([live site](https://reliable-caramel-55ff44.netlify.app/)) — build config in [netlify.toml](netlify.toml) (`npm run build` → `dist`, with an SPA catch-all redirect).
- **GitHub Pages** — via the [Deploy to GitHub Pages](.github/workflows/deploy.yml) Actions workflow. It first runs `npm run sizes` and commits any newly filled image sizes back to `main` (Netlify then rebuilds on that commit). Because the project page is served from a subpath (`/Portfolio-website-Julia/`), the workflow sets `DEPLOY_BASE` so Vite builds with the right base URL and copies `index.html` to `404.html` as an SPA fallback.

Other facts:

- **Repo:** `j-schaeff/Portfolio-website-Julia` (default branch `main`).
- **CMS:** Pages CMS, connected to the repo.

## Tech stack

React 18 · TypeScript · Vite · React Router · Framer Motion · gray-matter (frontmatter parsing).

See [AGENTS.md](AGENTS.md) for a deeper map of the codebase.
