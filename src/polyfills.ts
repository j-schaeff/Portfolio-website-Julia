import { Buffer } from "buffer";

// gray-matter expects a global `Buffer` at runtime. Imported before any module
// that parses frontmatter (see import order in main.tsx).
if (typeof (globalThis as { Buffer?: unknown }).Buffer === "undefined") {
  (globalThis as { Buffer?: unknown }).Buffer = Buffer;
}
