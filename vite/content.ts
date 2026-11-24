import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Plugin, ResolvedConfig } from "vite";
import { slugFromPath } from "../src/utils/slug";
import { parseDescription } from "../src/utils/richText";

// Two jobs, both done in Node so the browser never parses Markdown:
//
// 1. `virtual:content` hands the app the frontmatter of every content file,
//    already parsed (gray-matter and its Buffer polyfill used to ship in the
//    client bundle just for this). src/data/projects.ts and about.ts turn it
//    into Projects / About exactly as before.
//
// 2. After the build, every subpage gets a real HTML file (about.html,
//    list.html, project/<slug>.html) with its own title, description, share
//    preview and a crawlable copy of its text, plus sitemap.xml, robots.txt
//    and the 404.html SPA fallback. GitHub Pages serves /about from
//    about.html with a 200, where before every subpage came back as a 404
//    with the app drawn on top.

const VIRTUAL_ID = "virtual:content";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const CONTENT_DIR = "content";
const PROJECTS_DIR = path.join(CONTENT_DIR, "projects");

const SITE_NAME = "julia schäffler";
const SITE_DESCRIPTION =
  "julia schäffler — creative culinary concepts, art direction, graphic and web design.";

type Data = Record<string, unknown>;

function readFrontmatter(file: string): Data {
  try {
    // JSON round trip: YAML dates and the like become plain JSON values.
    return JSON.parse(JSON.stringify(matter(fs.readFileSync(file, "utf8")).data));
  } catch {
    return {};
  }
}

// Keyed by the same "/content/projects/<file>.md" paths import.meta.glob gave,
// so slugFromPath() and the order matching see what they always saw.
function loadContent(root: string) {
  const dir = path.join(root, PROJECTS_DIR);
  const projects: Record<string, Data> = {};
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir).sort() : []) {
    if (!name.toLowerCase().endsWith(".md")) continue;
    projects[`/${PROJECTS_DIR}/${name}`] = readFrontmatter(path.join(dir, name));
  }
  const orderFile = path.join(root, CONTENT_DIR, "order.md");
  const aboutFile = path.join(root, CONTENT_DIR, "about.md");
  return {
    projects,
    order: fs.existsSync(orderFile) ? readFrontmatter(orderFile) : null,
    about: fs.existsSync(aboutFile) ? readFrontmatter(aboutFile) : {},
  };
}

// --- Prerendering -----------------------------------------------------------

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function clip(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length) + "…";
}

interface Page {
  // Route path without the base ("/", "/about", "/project/bread-scape").
  route: string;
  // Output file inside dist ("about.html", "project/bread-scape.html").
  file: string;
  title: string;
  description: string;
  image?: string;
  jsonLd: Data;
  // Crawlable text placed in #root; React replaces it when it mounts.
  body: string;
  // Lazy route chunk to preload, so a direct visit doesn't wait on it.
  chunk?: string;
}

interface Summary {
  slug: string;
  title: string;
  type: string;
  year: number;
  description: string;
  descriptionHtml: string;
  alts: string[];
  // Path under public/images of the image used as the share preview.
  preview?: string;
}

// Stored paths look like "/images/x.jpg" or "public/images/x.jpg"; returns
// the part under images/, or undefined for an external link.
function uploadPath(src: string): string | undefined {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return undefined;
  const rel = src.replace(/^\/+/, "").replace(/^public\//, "");
  return rel.startsWith("images/") ? rel.slice("images/".length) : undefined;
}

function summarize(file: string, fm: Data): Summary {
  const { text, links } = parseDescription(String(fm.description ?? ""));
  // The description again, with its links as real anchors.
  let html = "";
  let at = 0;
  for (const link of links) {
    html += escapeHtml(text.slice(at, link.from));
    html += `<a href="${escapeHtml(link.href)}">${escapeHtml(text.slice(link.from, link.to))}</a>`;
    at = link.to;
  }
  html += escapeHtml(text.slice(at));

  const title = String(fm.title ?? "Untitled");
  const images = Array.isArray(fm.images) ? fm.images : [];
  const alts: string[] = [];
  let preview: string | undefined;
  images.forEach((entry, i) => {
    const e = (typeof entry === "string" ? { image: entry } : entry ?? {}) as Data;
    alts.push(String(e.alt || `${title} — ${i + 1}`));
    if (preview || e.videoUrl) return;
    const src = String(e.video || e.image || e.src || "");
    const rel = uploadPath(src);
    if (rel) preview = rel;
  });

  return {
    slug: slugFromPath(file),
    title,
    type: String(fm.type ?? ""),
    year: Number(fm.year ?? 0),
    description: text,
    descriptionHtml: html,
    alts,
    preview,
  };
}

// The web-sized copy from scripts/optimize-media.mjs if it exists (a poster
// for videos), the upload itself otherwise.
function previewUrl(outDir: string, base: string, rel: string): string {
  const isVid = /\.(mp4|mov|webm|m4v|ogv)$/i.test(rel);
  const copy = `optimized/${rel}.${isVid ? "poster.webp" : "full.webp"}`;
  if (fs.existsSync(path.join(outDir, copy))) return base + copy;
  return isVid ? "" : base + "images/" + rel;
}

// Visually hidden but in the DOM, so a crawler that doesn't run the app
// still finds the text and links; createRoot() replaces it on mount.
const HIDDEN =
  "position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap";

function render(template: string, page: Page, site: string, base: string): string {
  const url = site + base + page.route.replace(/^\//, "");
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    page.image ? `<meta property="og:image" content="${site + page.image}" />` : "",
    `<meta name="twitter:card" content="${page.image ? "summary_large_image" : "summary"}" />`,
    page.chunk ? `<link rel="modulepreload" crossorigin href="${base + page.chunk}" />` : "",
    `<script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, "\\u003c")}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");

  // The template's own description goes first, so it isn't confused with
  // the page's.
  return template
    .replace(/\s*<meta name="description"[^>]*>/, "")
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace(
      /<div id="root"><\/div>/,
      `<div id="root"><div style="${HIDDEN}">${page.body}</div></div>`,
    );
}

export function contentPlugin(options: { site: string }): Plugin {
  let config: ResolvedConfig;
  // Lazy route chunks by the component file they come from.
  const chunks: Record<string, string> = {};

  return {
    name: "portfolio-content",

    configResolved(resolved) {
      config = resolved;
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },

    load(id) {
      if (id !== RESOLVED_ID) return;
      const content = loadContent(config.root);
      // `vite build --watch` rebuilds on content edits. Only for builds: the
      // dev server turns watch files into imports (and fails on the folder);
      // there configureServer below reloads instead.
      if (config.command === "build") {
        for (const file of Object.keys(content.projects)) this.addWatchFile(path.join(config.root, file));
      }
      return `export default ${JSON.stringify(content)};`;
    },

    configureServer(server) {
      // A new, renamed or deleted Markdown file changes the module's content
      // too, so reload the page whenever anything under content/ changes.
      const dir = path.join(config.root, CONTENT_DIR);
      const refresh = (file: string) => {
        if (!file.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.add(dir);
      server.watcher.on("add", refresh);
      server.watcher.on("change", refresh);
      server.watcher.on("unlink", refresh);
    },

    generateBundle(_, bundle) {
      for (const out of Object.values(bundle)) {
        if (out.type !== "chunk" || !out.facadeModuleId) continue;
        const name = path.basename(out.facadeModuleId).replace(/\.tsx?$/, "");
        chunks[name] = out.fileName;
      }
    },

    closeBundle() {
      if (config.command !== "build") return;
      const outDir = path.resolve(config.root, config.build.outDir);
      const indexFile = path.join(outDir, "index.html");
      if (!fs.existsSync(indexFile)) return;
      const template = fs.readFileSync(indexFile, "utf8");
      const base = config.base;
      const site = options.site.replace(/\/+$/, "");

      const content = loadContent(config.root);
      const projects = Object.entries(content.projects)
        .map(([file, fm]) => summarize(file, fm))
        .sort((a, b) => a.title.localeCompare(b.title));
      const projectHref = (slug: string) => `${base}project/${slug}`;
      const projectLinks = `<ul>${projects
        .map((p) => `<li><a href="${projectHref(p.slug)}">${escapeHtml(p.title)}</a></li>`)
        .join("")}</ul>`;
      const nav = `<nav><a href="${base}">Index</a> <a href="${base}list">List</a> <a href="${base}about">About</a></nav>`;
      const person = { "@type": "Person", name: SITE_NAME, url: site + base };
      const firstPreview = projects.find((p) => p.preview)?.preview;
      const siteImage = firstPreview ? previewUrl(outDir, base, firstPreview) : "";

      const aboutText = ["bio", "column2", "column3"]
        .map((k) => String(content.about[k] ?? "").trim())
        .filter(Boolean);
      const aboutHtml = aboutText
        .flatMap((t) => t.split(/\n\s*\n/))
        .map((p) => `<p>${escapeHtml(p.replace(/^[#>]+\s*/gm, "").trim())}</p>`)
        .join("");

      const pages: Page[] = [
        {
          route: "/",
          file: "index.html",
          title: SITE_NAME,
          description: SITE_DESCRIPTION,
          image: siteImage || undefined,
          jsonLd: { "@context": "https://schema.org", ...person, description: SITE_DESCRIPTION },
          body: `<h1>${escapeHtml(SITE_NAME)}</h1><p>${escapeHtml(SITE_DESCRIPTION)}</p>${nav}${projectLinks}`,
        },
        {
          route: "/about",
          file: "about.html",
          title: `About — ${SITE_NAME}`,
          description: clip(aboutText[0] || SITE_DESCRIPTION),
          image: siteImage || undefined,
          jsonLd: { "@context": "https://schema.org", "@type": "AboutPage", mainEntity: person },
          body: `<h1>About</h1>${aboutHtml}${nav}`,
          chunk: chunks.AboutView,
        },
        {
          route: "/list",
          file: "list.html",
          title: `List — ${SITE_NAME}`,
          description: `All projects by ${SITE_NAME}: ${projects.map((p) => p.title).join(", ")}.`,
          image: siteImage || undefined,
          jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Projects", author: person },
          body: `<h1>Projects</h1>${nav}${projectLinks}`,
          chunk: chunks.ListView,
        },
        ...projects.map((p): Page => {
          const image = p.preview ? previewUrl(outDir, base, p.preview) : "";
          const meta = [p.type, p.year || ""].filter(Boolean).join(", ");
          return {
            route: `/project/${p.slug}`,
            file: `project/${p.slug}.html`,
            title: `${p.title} — ${SITE_NAME}`,
            description: clip(p.description || `${p.title}${meta ? ` (${meta})` : ""} by ${SITE_NAME}.`),
            image: image || undefined,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "CreativeWork",
              name: p.title,
              genre: p.type || undefined,
              dateCreated: p.year ? String(p.year) : undefined,
              description: p.description || undefined,
              image: image ? site + image : undefined,
              url: site + projectHref(p.slug),
              creator: person,
            },
            body:
              `<article><h1>${escapeHtml(p.title)}</h1>` +
              (meta ? `<p>${escapeHtml(meta)}</p>` : "") +
              (p.descriptionHtml ? `<p>${p.descriptionHtml}</p>` : "") +
              `<ul>${p.alts.map((a) => `<li>${escapeHtml(a)}</li>`).join("")}</ul></article>` +
              nav +
              projectLinks,
            chunk: chunks.DetailView,
          };
        }),
      ];

      for (const page of pages) {
        const target = path.join(outDir, page.file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, render(template, page, site, base));
      }

      // SPA fallback for anything else (e.g. old /project?project= links,
      // which the app redirects). The plain template, marked noindex.
      fs.writeFileSync(
        path.join(outDir, "404.html"),
        template.replace("</title>", '</title>\n    <meta name="robots" content="noindex" />'),
      );

      const today = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(
        path.join(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          pages
            .map((p) => `  <url><loc>${site + base + p.route.replace(/^\//, "")}</loc><lastmod>${today}</lastmod></url>`)
            .join("\n") +
          `\n</urlset>\n`,
      );
      fs.writeFileSync(
        path.join(outDir, "robots.txt"),
        `User-agent: *\nAllow: /\n\nSitemap: ${site + base}sitemap.xml\n`,
      );
    },
  };
}
