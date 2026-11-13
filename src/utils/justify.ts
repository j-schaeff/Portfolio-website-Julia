import { hyphenateSync } from "hyphen/en-us";

// Line breaking for justified text. Browsers fill justified lines one at a
// time, so in a narrow column a line that can't fit its next word gets its
// spaces stretched into wide gaps. This picks the breaks for the whole
// paragraph at once (the Knuth–Plass approach typesetting programs use),
// trying hyphenation points too, so the space is spread evenly. Like InDesign,
// a line may also take a barely visible touch of letter-spacing, so its word
// gaps don't have to absorb all of the slack.

const SOFT_HYPHEN = "­";
// Hyphenation: words of 5+ letters, at least 2 letters before the break and
// 3 after (TeX's English defaults).
const MIN_WORD = 5;
const MIN_BEFORE = 2;
const MIN_AFTER = 3;
// How much a line's word spaces may shrink (share of a space) to fit a little
// more on it; tight lines read better than loose ones, up to a point.
const MAX_SHRINK = 0.25;
// Most letter-spacing a line may take or give up, in em; only the hardest
// lines get near it. Tested on the real font and descriptions: at 0.03em no
// line's word gaps exceed ~2.25× a normal space in a 300–400px column, with
// 0.02em they reach ~2.7×.
const MAX_TRACKING = 0.03;
// How far the letters stretch relative to the spaces: at 1, a line whose
// spaces stretch by half a space has its letters at half of MAX_TRACKING.
const TRACKING_WEIGHT = 1;
const HYPHEN_PENALTY = 30;

export interface Line {
  text: string;
  // Spacing (px) to add between letters and between words. Positive word
  // spacing is left to text-align: justify, which also absorbs rounding.
  letterSpacing: number;
  wordSpacing: number;
  last: boolean;
}

interface Piece {
  // Width up to the end of this fragment, from the start of its word.
  width: number;
  // The word's text up to the end of this fragment.
  text: string;
}

function hyphenationPoints(word: string): number[] {
  if (word.length < MIN_WORD) return [];
  const parts = hyphenateSync(word, { hyphenChar: SOFT_HYPHEN, minWordLength: MIN_WORD }).split(SOFT_HYPHEN);
  const points: number[] = [];
  let at = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    at += parts[i].length;
    // Only split between letters, and not too near either end.
    if (
      at >= MIN_BEFORE &&
      word.length - at >= MIN_AFTER &&
      /\p{L}/u.test(word[at - 1]) &&
      /\p{L}/u.test(word[at])
    ) {
      points.push(at);
    }
  }
  return points;
}

// Breaks `text` into lines of `width` px (the first `indent` px narrower),
// measuring with `measure` at font size `fontSize` (px).
export function justifyLines(
  text: string,
  width: number,
  indent: number,
  fontSize: number,
  measure: (s: string) => number,
): Line[] {
  const raw = text.split(/\s+/).filter(Boolean);
  if (!raw.length || width <= 0) return [];

  const space = measure(" ");
  const hyphen = measure("-");
  const track = MAX_TRACKING * fontSize;
  const words: Piece[][] = raw.map((w) =>
    [...hyphenationPoints(w), w.length].map((end) => ({ width: measure(w.slice(0, end)), text: w.slice(0, end) })),
  );

  // A break position is (word, piece): the line ends after that piece. The
  // last piece of a word is a normal break at the following space.
  type Pos = { w: number; p: number };
  const positions: Pos[] = [{ w: -1, p: 0 }]; // paragraph start
  words.forEach((pieces, w) => pieces.forEach((_, p) => positions.push({ w, p })));

  const isFull = (pos: Pos) => pos.w < 0 || pos.p === words[pos.w].length - 1;

  // The text of a line starting after `from` and ending at `to`.
  const lineText = (from: Pos, to: Pos) => {
    const startWord = isFull(from) ? from.w + 1 : from.w;
    const parts: string[] = [];
    for (let w = startWord; w <= to.w; w++) {
      const pieces = words[w];
      let s = w === to.w ? pieces[to.p].text : pieces[pieces.length - 1].text;
      if (w === startWord && !isFull(from)) s = s.slice(pieces[from.p].text.length);
      parts.push(s);
    }
    return parts.join(" ") + (isFull(to) ? "" : "-");
  };

  // How a line of natural width `natural` with `gaps` spaces and `chars`
  // letters fits `lineWidth`: `ratio` is how far its spaces stretch (+) or
  // shrink (−) as a share of a space, and the spacing that achieves it.
  const fit = (natural: number, gaps: number, chars: number, lineWidth: number) => {
    const slack = lineWidth - natural;
    // Letter-spacing goes between every pair of letters (the line's last
    // letter included, so it counts too).
    const trackCapacity = chars * track * TRACKING_WEIGHT;
    const capacity = gaps * space + trackCapacity;
    if (capacity <= 0) return { ratio: slack >= 0 ? Infinity : -Infinity, letterSpacing: 0, wordSpacing: 0 };
    const ratio = slack / capacity;
    const letterSpacing = Math.max(-track, Math.min(track, ratio * track * TRACKING_WEIGHT));
    const wordSpacing = gaps ? (slack - letterSpacing * chars) / gaps : 0;
    return { ratio, letterSpacing, wordSpacing };
  };

  const stats = (from: Pos, to: Pos) => {
    const t = lineText(from, to);
    return { gaps: t.split(" ").length - 1, chars: t.length, natural: measureLine(from, to) };
  };

  // Natural width from the pieces' measurements (word widths plus spaces).
  const measureLine = (from: Pos, to: Pos) => {
    const startWord = isFull(from) ? from.w + 1 : from.w;
    const carry = isFull(from) ? 0 : words[from.w][from.p].width;
    let natural = 0;
    for (let w = startWord; w <= to.w; w++) {
      const pieces = words[w];
      natural += (w === to.w ? pieces[to.p].width : pieces[pieces.length - 1].width) - (w === startWord ? carry : 0);
    }
    natural += (to.w - startWord) * space;
    if (!isFull(to)) natural += hyphen;
    return natural;
  };

  const best = positions.map(() => ({ cost: Infinity, prev: -1, hyph: false }));
  best[0].cost = 0;

  for (let j = 1; j < positions.length; j++) {
    const to = positions[j];
    const last = j === positions.length - 1;
    const hyph = !isFull(to);
    for (let i = j - 1; i >= 0; i--) {
      const from = positions[i];
      // `from` must come before `to`, and a hyphen piece only continues its
      // own word.
      if (from.w > to.w || (from.w === to.w && (isFull(from) || from.p >= to.p))) continue;
      const lineWidth = width - (i === 0 ? indent : 0);
      const { natural, gaps, chars } = stats(from, to);
      const { ratio } = fit(natural, gaps, chars, lineWidth);
      // Lines only get longer as i decreases, so stop once one is too long.
      if (natural > lineWidth && -ratio > MAX_SHRINK) {
        // A single word wider than the column still has to go somewhere.
        if (gaps === 0 && best[j].cost === Infinity && best[i].cost < Infinity)
          best[j] = { cost: best[i].cost + 1e9, prev: i, hyph };
        break;
      }
      if (best[i].cost === Infinity) continue;
      let badness: number;
      if (last && natural <= lineWidth) badness = 0; // the last line isn't stretched
      else if (gaps === 0) badness = 1e4; // a lone word can't be justified
      else badness = 100 * Math.abs(ratio) ** 3;
      let cost = (1 + badness) ** 2 + (hyph ? HYPHEN_PENALTY ** 2 : 0);
      // Avoid hyphenating two lines in a row, or the second-to-last line.
      if (hyph && best[i].hyph) cost += 3000;
      if (hyph && j === positions.length - 2) cost += 3000;
      cost += best[i].cost;
      if (cost < best[j].cost) best[j] = { cost, prev: i, hyph };
    }
  }

  // Walk the chosen breaks back from the end.
  const breaks: number[] = [];
  for (let j = positions.length - 1; j > 0; j = best[j].prev) breaks.unshift(j);

  let prev = 0;
  return breaks.map((j, n) => {
    const from = positions[prev];
    const to = positions[j];
    const last = n === breaks.length - 1;
    const lineWidth = width - (prev === 0 ? indent : 0);
    prev = j;
    const { natural, gaps, chars } = stats(from, to);
    const text = lineText(from, to);
    if (last && natural <= lineWidth) return { text, letterSpacing: 0, wordSpacing: 0, last };
    const { letterSpacing, wordSpacing } = fit(natural, gaps, chars, lineWidth);
    return { text, letterSpacing, wordSpacing, last };
  });
}
