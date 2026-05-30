import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Set DEPLOY_BASE in CI (GitHub Pages project page) to serve from a subpath,
// e.g. "/Portfolio-website-Julia/". When unset (local dev, Netlify, custom
// domain), it defaults to "/" so the build is served from the root.
export default defineConfig({
  base: process.env.DEPLOY_BASE || "/",
  plugins: [react()],
});
