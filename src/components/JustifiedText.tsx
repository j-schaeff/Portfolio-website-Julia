import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { justifyLines, type Line } from "../utils/justify";

interface JustifiedTextProps {
  text: string;
  className?: string;
}

let canvas: HTMLCanvasElement | null = null;

// A justified paragraph without wide gaps between words: the line breaks are
// chosen for the whole paragraph (see utils/justify.ts) and each line is set
// as its own justified row. Font, size and indent come from `className`, so
// the CSS stays the source of truth. Until it has measured (or if it can't),
// it shows the plain text, which the CSS justifies the browser's way.
export function JustifiedText({ text, className }: JustifiedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [lines, setLines] = useState<Line[] | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = -1;
    let cancelled = false;

    const layout = () => {
      if (cancelled) return;
      const style = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      if (w <= 0) return;
      width = w;
      canvas ??= document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const measure = (s: string) => ctx.measureText(s).width;
      // A hair narrower than the box, so rounding never pushes a line over.
      setLines(justifyLines(text, w - 0.5, parseFloat(style.textIndent) || 0, parseFloat(style.fontSize), measure));
    };

    layout();
    // Measure again once the web font has loaded (`ready` alone can resolve
    // before its load has even started) and whenever the column changes width.
    document.fonts?.ready.then(layout);
    document.fonts?.addEventListener("loadingdone", layout);
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) layout();
    });
    ro.observe(el);
    return () => {
      cancelled = true;
      document.fonts?.removeEventListener("loadingdone", layout);
      ro.disconnect();
    };
  }, [text]);

  if (!lines) {
    return (
      <p ref={ref} className={className} style={{ contain: "inline-size" }}>
        {text}
      </p>
    );
  }

  return (
    // inline-size containment keeps the unwrapping rows from widening the
    // column: its width comes from the layout around it, never from the text.
    <p ref={ref} className={className} style={{ contain: "inline-size" }}>
      {/* Screen readers get the text without line-end hyphens. */}
      <span style={visuallyHidden}>{text}</span>
      {lines.map((line, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            display: "block",
            whiteSpace: "nowrap",
            // text-indent is inherited, so only the first row keeps it.
            textIndent: i === 0 ? undefined : 0,
            textAlign: line.last ? "left" : "justify",
            textAlignLast: line.last ? "left" : "justify",
            letterSpacing: line.letterSpacing ? `${line.letterSpacing.toFixed(3)}px` : undefined,
            // Tightened lines get their (negative) spacing a touch short of
            // exact and justify fills the rest, so they never overflow.
            wordSpacing: line.wordSpacing < 0 ? `${(line.wordSpacing - 0.1).toFixed(3)}px` : undefined,
          }}
        >
          {line.text}
        </span>
      ))}
    </p>
  );
}

const visuallyHidden: CSSProperties = {
  position: "absolute",
  userSelect: "none",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};
