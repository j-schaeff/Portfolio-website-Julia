// Gives every project image without a valid size (1–5) a varied height, and
// writes it back into the Markdown so it shows up in Pages CMS and can be
// adjusted by hand from there. Runs in the deploy workflow; explicit sizes are
// never changed, so after the first fill a project's sizes are fully manual.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = "content/projects";

// Heights new images are drawn from: the range the rest of the index uses.
const RHYTHM_POOL = [2, 3, 4, 5];

// Same as slugFromPath() in src/utils/slug.ts.
function slugFromFile(file) {
  return file
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSize(value) {
  const n = Number(String(value ?? "").trim().replace(/^["']|["']$/g, ""));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

// Fills missing (null) sizes with a varied rhythm where no two neighbours share
// a height. The PRNG is seeded by the project slug rather than Math.random() so
// re-running the script on the same content picks the same values.
function resolveRhythm(seed, sizes) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const random = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const out = [];
  sizes.forEach((size, i) => {
    if (size !== null) {
      out.push(size);
      return;
    }
    const prev = out[i - 1];
    const next = sizes[i + 1];
    const options = RHYTHM_POOL.filter((s) => s !== prev && s !== next);
    out.push(options[Math.floor(random() * options.length)]);
  });
  return out;
}

const SIZE_LINE = /^(  - |    )size:(.*)$/;

// Edits the frontmatter line by line instead of re-serialising it, so the rest
// of the file keeps exactly the formatting Pages CMS wrote.
function assignSizes(file, raw) {
  const { data } = matter(raw);
  if (!Array.isArray(data.images)) return null;

  const lines = raw.split("\n");
  const start = lines.findIndex((l) => l === "images:");
  if (start === -1) return null;

  // Group the lines of each `  - ` list item under images:.
  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("  - ")) items.push({ first: i, last: i });
    else if (line.startsWith("    ") && items.length) items[items.length - 1].last = i;
    else break;
  }
  if (items.length !== data.images.length) {
    throw new Error(`${file}: could not match images list (${items.length} vs ${data.images.length})`);
  }

  // Only entries with a source become images on the site (see toImage() in
  // src/data/projects.ts), so only they take part in the rhythm. Legacy string
  // entries can't hold a size and keep the default.
  const targets = items
    .map((item, i) => ({ item, entry: data.images[i] }))
    .filter(({ entry }) => entry && typeof entry === "object")
    .filter(({ entry }) => entry.videoUrl || entry.video || entry.image || entry.src);

  const current = targets.map(({ entry }) => parseSize(entry.size));
  if (!current.includes(null)) return null;
  const sizes = resolveRhythm(slugFromFile(file), current);

  // Apply from the bottom up so inserted lines don't shift later items.
  for (let t = targets.length - 1; t >= 0; t--) {
    if (current[t] !== null) continue;
    const { item } = targets[t];
    const value = `size: "${sizes[t]}"`;
    let replaced = false;
    for (let i = item.first; i <= item.last; i++) {
      const match = lines[i].match(SIZE_LINE);
      if (match) {
        lines[i] = match[1] + value;
        replaced = true;
        break;
      }
    }
    if (!replaced) lines.splice(item.first + 1, 0, `    ${value}`);
  }
  return lines.join("\n");
}

let changed = 0;
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith(".md")).sort()) {
  const full = path.join(DIR, file);
  const updated = assignSizes(file, fs.readFileSync(full, "utf8"));
  if (updated === null) continue;
  fs.writeFileSync(full, updated);
  console.log(`Assigned sizes in ${full}`);
  changed++;
}
if (!changed) console.log("All images already have a size.");
