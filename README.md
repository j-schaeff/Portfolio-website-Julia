# Portfolio Website — Julia Schäffler

A single-page portfolio site for showcasing design projects. Built with React, TypeScript, and Vite, with animated transitions powered by Framer Motion. Content is authored as Markdown and managed through a CMS — no code changes needed to add or edit projects.

## How it works

- **Grid view** (`/`) — every project's images laid out in a grid.
- **Detail view** (`/project/:slug`) — a horizontal, drag-to-scroll strip of a project's images plus its title, type, year, and description.
- **Lightbox** — click any image to open a full-screen viewer that navigates across *all* images from every project (← → arrows / Escape).
- **Shared-element transitions** — clicking a grid tile zooms smoothly into the detail view; the same image morphs between grid, strip, and lightbox.

## Content

Projects live as Markdown files in [content/projects/](content/projects/), one file per project. Each file has YAML frontmatter:

```yaml
---
title: Spring
type: Print              # used to group projects
description: Visual identity for a late-night concert series.
year: 2021
order: 5                 # controls position; ascending
images:
  - image: public/images/5_spring/cover-2.jpg
    size: "5"            # height multiplier, 1–5 (width follows aspect ratio)
    hideInGrid: false    # hide in grid but still show in detail view
    alt: ""              # screen-reader description
---
Optional body text (currently not rendered on the page).
```

Images are uploaded to [public/images/](public/images/). The site supports images **and** video (`.mp4`, `.mov`, `.webm`, etc.).

### Editing content

Content is normally edited through **[Pages CMS](https://pagescms.org)**, which is connected to the GitHub repo and reads [.pages.yml](.pages.yml). Saving in the CMS commits to `main`, which triggers an automatic deploy. You can also edit the Markdown files directly if you prefer.

## Development

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server
npm run build    # type-check (tsc) and build to dist/
npm run preview  # preview the production build locally
```

## Deployment

- **Hosting:** [Netlify](https://reliable-caramel-55ff44.netlify.app/) — auto-deploys on every push to `main`. Build config is in [netlify.toml](netlify.toml) (`npm run build` → `dist`, with an SPA catch-all redirect).
- **Repo:** `j-schaeff/Portfolio-website-Julia` (default branch `main`).
- **CMS:** Pages CMS, connected to the repo.

## Tech stack

React 18 · TypeScript · Vite · React Router · Framer Motion · gray-matter (frontmatter parsing).

See [AGENTS.md](AGENTS.md) for a deeper map of the codebase.
