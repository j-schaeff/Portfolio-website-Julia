import { createElement, Fragment, type ReactNode } from "react";

// A link inside a plain-text description: `from`/`to` are character offsets
// into the parsed text.
export interface TextLink {
  from: number;
  to: number;
  href: string;
}

// Only web, mail and site-relative links; anything else (javascript: etc.)
// is dropped and its label stays as plain text.
function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u) || /^[/#?]/.test(u)) return u;
  // A bare domain typed into the link box ("example.com") gets https.
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return "https://" + u;
  return null;
}

// Markdown from the CMS's rich-text field, reduced to plain text plus links.
// Descriptions are set as one justified paragraph, so other formatting
// (emphasis, headings, lists, paragraph breaks) is reduced to its text and
// whitespace collapses to single spaces, matching how justifyLines() splits
// words, so the link offsets stay valid through the layout.
export function parseDescription(md: string): { text: string; links: TextLink[] } {
  let text = "";
  const links: TextLink[] = [];
  // Append, collapsing whitespace; no leading space.
  const push = (s: string) => {
    for (const ch of s) {
      if (/\s/.test(ch)) {
        if (text && !text.endsWith(" ")) text += " ";
      } else text += ch;
    }
  };
  // Strip block markers at line starts (#, >, -, *, +, 1.).
  const src = md.replace(/^[ \t]*(#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+|\d+[.)][ \t]+)/gm, "");

  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\" && i + 1 < src.length && /[!-/:-@[-`{-~]/.test(src[i + 1])) {
      push(src[i + 1]);
      i += 2;
      continue;
    }
    if (ch === "[") {
      // [label](url "title"); the url may hold one level of parentheses.
      const m = /^\[((?:\\.|[^\]\\])*)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))*)>?(?:\s+"[^"]*")?\s*\)/.exec(src.slice(i));
      if (m) {
        const label = parseDescription(m[1]).text;
        const href = safeHref(m[2]);
        const from = text.length;
        push(label);
        if (href && text.length > from) links.push({ from, to: text.length, href });
        i += m[0].length;
        continue;
      }
    }
    if (ch === "<") {
      const m = /^<((?:https?:\/\/|mailto:)[^>\s]+)>/i.exec(src.slice(i));
      if (m) {
        const from = text.length;
        push(m[1].replace(/^mailto:/i, ""));
        links.push({ from, to: text.length, href: m[1] });
        i += m[0].length;
        continue;
      }
    }
    // Emphasis / code markers carry no text.
    if (ch === "*" || ch === "`" || (ch === "_" && /^_+/.test(src.slice(i)) && isEmphasisUnderscore(src, i))) {
      i++;
      continue;
    }
    push(ch);
    i++;
  }
  // Trailing space would never match a word.
  if (text.endsWith(" ")) text = text.slice(0, -1);
  return { text, links: links.filter((l) => l.to <= text.length) };
}

// An underscore inside a word (snake_case) is text; at a word edge it's
// emphasis.
function isEmphasisUnderscore(src: string, i: number): boolean {
  const before = src[i - 1] ?? " ";
  let j = i;
  while (src[j] === "_") j++;
  const after = src[j] ?? " ";
  return !/[\p{L}\p{N}]/u.test(before) || !/[\p{L}\p{N}]/u.test(after);
}

// `text[from, to)` as plain strings and <a> elements. Links that the range
// cuts (a link wrapping across lines) render as their visible part.
export function renderRuns(
  text: string,
  links: TextLink[] | undefined,
  from = 0,
  to = text.length,
  linkProps: { tabIndex?: number; className?: string } = {},
): ReactNode {
  if (!links?.length) return text.slice(from, to);
  const out: ReactNode[] = [];
  let at = from;
  for (const link of links) {
    const a = Math.max(link.from, from);
    const b = Math.min(link.to, to);
    if (a >= b) continue;
    if (a > at) out.push(text.slice(at, a));
    const mail = link.href.startsWith("mailto:");
    out.push(
      createElement(
        "a",
        {
          key: `${link.from}-${a}`,
          href: link.href,
          target: mail ? undefined : "_blank",
          rel: "noreferrer",
          ...linkProps,
        },
        text.slice(a, b),
      ),
    );
    at = b;
  }
  if (at < to) out.push(text.slice(at, to));
  return createElement(Fragment, null, ...out);
}
