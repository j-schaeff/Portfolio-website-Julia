import { useState } from "react";

// Shows the web-sized copy, switching once to the uploaded original if the copy
// fails to load (not generated yet, or an upload the optimiser couldn't read).
// Returns the src to render and whether it's already the original, so the
// caller can treat a second error as a genuinely broken asset.
export function useFallbackSrc(preferred: string, original: string) {
  // Remembers which copy failed, so a different image (lightbox paging) gets a
  // fresh try at its own copy.
  const [failedCopy, setFailedCopy] = useState<string | null>(null);

  const src = failedCopy === preferred ? original : preferred;
  return { src, isOriginal: src === original, fallBack: () => setFailedCopy(preferred) };
}
