import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

// index.html sets data-theme before first paint; start from whatever it chose.
function initialTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

// Positioned and colored by CornerNav, which passes its item class.
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be unavailable (private mode); the toggle still works.
    }
  }, [theme]);

  // The label names the mode you'll switch to.
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
    >
      {next}
    </button>
  );
}
