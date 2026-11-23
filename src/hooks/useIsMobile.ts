import { useEffect, useState } from "react";

// A phone held sideways: wider than the 560px breakpoint, but short. It gets
// the mobile layout too, just with more room across (see the CSS media
// queries, which repeat this condition).
const LANDSCAPE_PHONE_QUERY = "(orientation: landscape) and (max-height: 500px)";
const MOBILE_QUERY = `(max-width: 560px), ${LANDSCAPE_PHONE_QUERY}`;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

// Tracks the mobile breakpoint used across the CSS: portrait phones and
// phones turned sideways.
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

// Only the sideways phone, for the places that use its extra width.
export function useIsLandscapePhone(): boolean {
  return useMediaQuery(LANDSCAPE_PHONE_QUERY);
}
