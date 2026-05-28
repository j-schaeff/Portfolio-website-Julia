const VIDEO_EXT = /\.(mp4|mov|webm|m4v|ogv)$/i;

export function isVideo(src: string): boolean {
  return VIDEO_EXT.test(src);
}
