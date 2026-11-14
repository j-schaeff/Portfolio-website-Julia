// Makes web-sized copies of everything in public/images, so the site never
// ships the full CMS uploads (often several MB each) to show a thumbnail.
// Runs before `npm run dev` and `npm run build`; the copies land in
// public/optimized (gitignored) and src/utils/media.ts maps each original path
// to them. The originals stay untouched — they remain what Pages CMS edits, and
// the app falls back to them if a copy is missing.
//
// For each image:  <name>.<ext>.thumb.webp  600px tall, for the index grid
//                  <name>.<ext>.full.webp   2400px long edge, detail + lightbox
// For each video:  <name>.<ext>.opt.mp4     H.264, 1280px long edge, faststart
//                  <name>.<ext>.poster.webp first frame, 600px tall
// Keep these names in sync with optimizedSrc() in src/utils/media.ts.
// Each copy's aspect ratio also goes to src/generated/media-aspects.json, and
// the videos with an audible soundtrack to src/generated/media-audio.json.
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);

const SRC = "public/images";
const OUT = "public/optimized";
const MANIFEST = path.join(OUT, ".manifest.json");
// Read by src/data/projects.ts (gitignored, like the copies).
const ASPECTS = "src/generated/media-aspects.json";
const AUDIO = "src/generated/media-audio.json";
// Peak level below which a soundtrack counts as silent (an empty track that an
// editor exported anyway), so it gets no sound button.
const SILENT_DB = -60;
// Bump when the settings below change, so every copy is regenerated.
const VERSION = 1;

// 2× the tallest grid image (size 5 ≈ 237px), so thumbnails stay sharp on retina.
const THUMB_HEIGHT = 600;
const FULL_EDGE = 2400;
const VIDEO_EDGE = 1280;

const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?|avif)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// Skipped work is keyed on the source's content hash rather than mtimes, which
// a fresh checkout or a restored CI cache would make meaningless.
function hashFile(file) {
  return crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");
}

function readManifest() {
  try {
    const data = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    return data.version === VERSION ? { files: data.files ?? {}, audio: data.audio ?? {} } : { files: {}, audio: {} };
  } catch {
    return { files: {}, audio: {} };
  }
}

// True when the video has an audio stream that isn't silence.
async function hasAudio(src) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", src,
  ]);
  if (!stdout.trim()) return false;
  // volumedetect reports on stderr; -f null decodes without writing anything.
  const { stderr } = await run("ffmpeg", [
    "-hide_banner", "-i", src, "-map", "0:a:0", "-af", "volumedetect", "-f", "null", "-",
  ], { maxBuffer: 16 * 1024 * 1024 });
  const match = stderr.match(/max_volume:\s*(-?[\d.]+|-inf) dB/);
  if (!match) return true;
  return match[1] !== "-inf" && Number(match[1]) > SILENT_DB;
}

async function hasFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

async function optimizeImage(src, base) {
  // rotate() applies the EXIF orientation, which browsers honour on the
  // original but would be lost once sharp strips the metadata.
  await sharp(src)
    .rotate()
    .resize({ height: THUMB_HEIGHT, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(`${base}.thumb.webp`);
  await sharp(src)
    .rotate()
    .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(`${base}.full.webp`);
}

async function optimizeVideo(src, base) {
  const out = `${base}.opt.mp4`;
  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", src,
    "-vf", `scale=${VIDEO_EDGE}:${VIDEO_EDGE}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    // Moves the index to the front so playback starts before the file finishes.
    "-movflags", "+faststart",
    out,
  ]);
  // Already-small originals can come out larger; keep the original stream then,
  // just re-muxed for faststart.
  if (fs.statSync(out).size >= fs.statSync(src).size) {
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-c", "copy", "-movflags", "+faststart", out]);
  }

  const { stdout } = await run(
    "ffmpeg",
    ["-loglevel", "error", "-i", src, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  await sharp(stdout)
    .resize({ height: THUMB_HEIGHT, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(`${base}.poster.webp`);
}

const outputsFor = (base, isVid) =>
  isVid ? [`${base}.opt.mp4`, `${base}.poster.webp`] : [`${base}.thumb.webp`, `${base}.full.webp`];

async function main() {
  const { files: previous, audio: previousAudio } = readManifest();
  const next = {};
  const audio = {};
  const expected = new Set([MANIFEST]);
  const ffmpeg = await hasFfmpeg();
  if (!ffmpeg) console.warn("optimize-media: ffmpeg not found, videos will use the originals");

  let made = 0;
  let failed = 0;
  for (const src of walk(SRC)) {
    const isImg = IMAGE_EXT.test(src);
    const isVid = VIDEO_EXT.test(src);
    if (!isImg && !(isVid && ffmpeg)) continue;

    const rel = path.relative(SRC, src);
    const base = path.join(OUT, rel);
    const outputs = outputsFor(base, isVid);
    outputs.forEach((o) => expected.add(o));

    const hash = hashFile(src);
    if (previous[rel] === hash && outputs.every((o) => fs.existsSync(o))) {
      next[rel] = hash;
      if (isVid) {
        try {
          audio[rel] = previousAudio[rel] ?? (await hasAudio(src));
        } catch {
          audio[rel] = false;
        }
      }
      continue;
    }

    fs.mkdirSync(path.dirname(base), { recursive: true });
    try {
      await (isVid ? optimizeVideo(src, base) : optimizeImage(src, base));
      next[rel] = hash;
      if (isVid) audio[rel] = await hasAudio(src).catch(() => false);
      made++;
    } catch (err) {
      // Leave it to the original: the app falls back when a copy is missing.
      outputs.forEach((o) => fs.rmSync(o, { force: true }));
      console.warn(`optimize-media: skipped ${rel} (${err.message.split("\n")[0]})`);
      failed++;
    }
  }

  // Drop copies whose original was deleted or renamed.
  for (const file of walk(OUT)) {
    if (!expected.has(file)) fs.rmSync(file);
  }

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify({ version: VERSION, files: next, audio }, null, 2));

  // Every copy's aspect ratio, so the index can lay out its rows (and the
  // loading screen can tell which images are on screen) before any image has
  // loaded. Read from the copies: they're already EXIF-rotated, and a poster
  // has its video's proportions. Rewritten every run, skipped work included.
  const aspects = {};
  for (const rel of Object.keys(next)) {
    const base = path.join(OUT, rel);
    const file = VIDEO_EXT.test(rel) ? `${base}.poster.webp` : `${base}.thumb.webp`;
    try {
      const { width, height } = await sharp(file).metadata();
      if (width && height) aspects[rel] = width / height;
    } catch {
      // No ratio: the grid falls back to measuring the image once it loads.
    }
  }
  fs.mkdirSync(path.dirname(ASPECTS), { recursive: true });
  fs.writeFileSync(ASPECTS, JSON.stringify(aspects, null, 2));
  const withSound = Object.keys(audio).filter((rel) => audio[rel]).sort();
  fs.writeFileSync(AUDIO, JSON.stringify(withSound, null, 2));
  console.log(`optimize-media: ${made} updated, ${Object.keys(next).length - made} unchanged, ${failed} skipped`);
}

main();
