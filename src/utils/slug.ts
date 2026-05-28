export function slugFromPath(path: string): string {
  const file = path.split("/").pop() ?? path;
  return file
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
