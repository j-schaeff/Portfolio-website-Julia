// Allow a trailing query string or hash so external links such as a Dropbox
// share URL ("…/clip.mp4?raw=1") are still recognised by extension.
const VIDEO_EXT = /\.(mp4|mov|webm|m4v|ogv)(\?|#|$)/i;

export function isVideo(src: string): boolean {
  return VIDEO_EXT.test(src);
}

// Turn a Dropbox share link into a directly-playable media URL. Dropbox serves
// the file inline (rather than its preview page) when the query carries raw=1,
// and the rlkey/other params are preserved. Non-Dropbox or malformed URLs pass
// through unchanged so a plain CDN link still works.
export function dropboxDirect(url: string): string {
  try {
    const u = new URL(url);
    if (/(^|\.)dropbox\.com$/i.test(u.hostname)) {
      u.searchParams.delete("dl");
      u.searchParams.set("raw", "1");
    }
    return u.toString();
  } catch {
    return url;
  }
}

// Web-sized copies made by scripts/optimize-media.mjs: public/images/<path>
// becomes public/optimized/<path>.<variant>. Only local uploads have copies;
// anything else (external links, SVGs) is returned unchanged.
export type MediaVariant = "thumb.webp" | "full.webp" | "opt.mp4" | "poster.webp";

const OPTIMIZABLE = /\.(jpe?g|png|webp|tiff?|avif|mp4|mov|webm|m4v)$/i;

export function optimizedSrc(src: string, variant: MediaVariant): string {
  const images = import.meta.env.BASE_URL + "images/";
  if (!src.startsWith(images) || !OPTIMIZABLE.test(src)) return src;
  return import.meta.env.BASE_URL + "optimized/" + src.slice(images.length) + "." + variant;
}
