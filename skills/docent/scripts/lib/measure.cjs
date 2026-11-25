// measure: estimates how many characters fit on one line in each column of a table, from its source alone.
// It follows the kit (assets/kit.css): a table is as wide as the profile's block and at least 640px; each cell has 24px on its right,
// none on its left, and none on the right of the last column when it holds numbers; a row heading in the body never wraps; code in a
// cell may break at any character, so a cell of code only can shrink to almost nothing.
// The browser shares the width the way CSS tables do: each column gets its narrowest width (its longest word) plus the same share of
// what it would need to hold its longest cell on one line. Text widths come from text.cjs, which reads a little wider than the system
// font, so the estimate errs towards fewer characters. tests/browser/check-render.cjs compares it with a real browser.
const { textWidth } = require("./text.cjs");

const BLOCK = { standard: "text", task: "text", reference: 1120, brief: 1120 }; // "text": the text column (35rem) + 48px + 220px
const MIN_TABLE = 640;
const PAD = 24;
const PER_CHAR = 0.45; // the system sans-serif at body size: about 0.45em for each character of English prose, measured in Chrome

/** The block width in px of a profile, and the body text size; null for a deck, whose slides are checked on their own. */
function frameOf(profile = "standard", large = false) {
  const root = large ? 18 : 16, block = BLOCK[profile];
  if (block == null) return null;
  return { block: block === "text" ? 35 * root + 48 + 220 : block, body: 1.125 * root, head: 0.875 * root };
}

const longestWord = (text, size, weight) => Math.max(0, ...text.split(/\s+/).map((w) => textWidth(w, size, weight)));

/**
 * The estimated width of each column, and the characters of body text that fit on one line in it.
 * head: the texts of the heading row; rows: the body rows, each a list of { tag, text, num, code }, where code means code only.
 */
function estimateColumns(head, rows, frame) {
  const count = Math.max(head.length, ...rows.map((r) => r.length));
  const cols = Array.from({ length: count }, (_, c) => {
    const cells = rows.map((r) => r[c]).filter(Boolean);
    const num = cells.length > 0 && cells.every((cell) => cell.num);
    const pad = num && c === count - 1 ? 0 : PAD;
    let min = 0, max = 0;
    const take = (lo, hi) => { min = Math.max(min, lo); max = Math.max(max, hi); };
    if (head[c]) take(longestWord(head[c], frame.head, 600), textWidth(head[c], frame.head, 600));
    for (const cell of cells) {
      if (cell.tag === "th") { const w = textWidth(cell.text, frame.body, 600); take(w, w); } // a row heading does not wrap
      else take(cell.code ? 0 : longestWord(cell.text, frame.body, 400), textWidth(cell.text, frame.body, 400));
    }
    return { min: min + pad, max: max + pad, pad, num };
  });
  const table = Math.max(frame.block, MIN_TABLE);
  const lo = cols.reduce((s, c) => s + c.min, 0), hi = cols.reduce((s, c) => s + c.max, 0);
  const t = hi <= table ? 1 : lo >= table ? 0 : (table - lo) / (hi - lo);
  return cols.map((c) => {
    const width = Math.round(c.min + t * (c.max - c.min) - c.pad);
    return { width, chars: Math.floor(width / (PER_CHAR * frame.body)), num: c.num };
  });
}

module.exports = { frameOf, estimateColumns, PER_CHAR };
