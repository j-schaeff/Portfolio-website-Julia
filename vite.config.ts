import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { contentPlugin } from "./vite/content";

// The public origin, used for canonical links, share previews and the
// sitemap in the prerendered pages (vite/content.ts). Override with SITE_URL
// if the domain changes.
const SITE_URL = process.env.SITE_URL || "https://juliaschaeffler.com";

// Set DEPLOY_BASE in CI (GitHub Pages project page) to serve from a subpath,
// e.g. "/Portfolio-website-Julia/". When unset (local dev, Netlify, custom
// domain), it defaults to "/" so the build is served from the root.
export default defineConfig({
  base: process.env.DEPLOY_BASE || "/",
  plugins: [react(), contentPlugin({ site: SITE_URL })],
});
