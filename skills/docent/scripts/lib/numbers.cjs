// The rules of "Numbers" in DESIGN.md that a page's source can show. check reads the author's words only: no code, no drawing, no data
// block and no web address. Each rule gives a warning, never an error, because a part number or a quoted text may look like a mistake.
const NUM = String.raw`\d+(?:[.,]\d+)*`;

/** A date that a reader may read in two ways: day, month and year split by slashes, in either order, or a month and a year. */
function looksLikeDate(found) {
  const p = found.split("/").map(Number), [a, b, c] = p, digits = found.split("/").map((s) => s.length);
  if (p.length === 3 && digits[0] === 4) return b >= 1 && b <= 12 && c >= 1 && c <= 31;
  if (p.length === 3) return [2, 4].includes(digits[2]) && a >= 1 && b >= 1 && a <= 31 && b <= 31 && (a <= 12 || b <= 12);
  return a >= 1 && a <= 12 && b >= 1900 && b <= 2100; // "7/2026"; two small numbers, such as "3/4" or "24/7", are a fraction or a ratio
}

// Each rule: its number in DESIGN.md, its name, what finds it, and what to write instead.
const TEXT_RULES = [
  { rule: 2, name: "rounding", re: /(?<![\d.])\d+\.\d{3,}\s?%/g, keep: (f) => { const v = parseFloat(f); return v > 1 && v < 99; }, fix: "a percent keeps at most 2 decimals; round to the digits the reader needs, such as \"18%\". A share near 0 or 100 may keep more" },
  { rule: 4, name: "negative numbers", re: new RegExp(String.raw`(?<=^|[\s(\[])-(?=\d)${NUM}`, "g"), fix: "a hyphen is not a minus; write the minus sign, as in \"−12\" (U+2212), or a word, such as \"fell by 12\"" },
  { rule: 5, name: "ranges", re: new RegExp(String.raw`(?<![\w.,:/−-])${NUM}-${NUM}(?:%|[a-zA-Z]{1,3})?(?![\w/-])`, "g"), keep: (f) => !/^\d{3}-\d{4}$/.test(f), fix: "a range takes an en dash, as in \"45–76\", in a table, a chart or a source line, and \"from 45 to 76\" in the text" },
  { rule: 6, name: "percentage points", re: /(?<![\w.])\d+(?:\.\d+)?\s?(?:pp|pts)\b/g, fix: "write \"percentage points\" in full, as in \"up 6 percentage points\"" },
  { rule: 9, name: "dates", re: /(?<![\w/.])(?:\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\/\d{4})(?![\w/])/g, keep: looksLikeDate, fix: "a date with slashes is read in two ways; write the day, the month as a word and the year, as in \"1 July 2026\"" },
  { rule: 10, name: "about", re: new RegExp(String.raw`~\s?${NUM}`, "g"), fix: "write the word, as in \"about 250\"" },
];

/** The author's words of a page's markup, with no code, drawing, style or script, and no web address or email address. */
function wordsOf(markup) {
  const bare = markup.replace(/<(pre|code|kbd|samp|svg|style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/</g, " <").replace(/<[^>]*>/g, "");
  const text = bare.replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&minus;/g, "−").replace(/&ndash;/g, "–");
  return text.replace(/\S*(?:https?:\/\/|www\.)\S*|\S+@\S+\.\S+|\b[\w-]+(?:\.[\w-]+)+\/\S*/gi, " ").replace(/\s+/g, " ");
}

/** Each place in the words that breaks a rule: { rule, name, fix, found, context }. */
function findNumberText(words) {
  const out = [];
  for (const r of TEXT_RULES) for (const m of words.matchAll(r.re)) {
    if (r.keep && !r.keep(m[0])) continue;
    const from = Math.max(0, m.index - 24), to = Math.min(words.length, m.index + m[0].length + 24);
    out.push({ ...r, found: m[0], context: `${from ? "…" : ""}${words.slice(from, to).trim()}${to < words.length ? "…" : ""}` });
  }
  return out;
}

const parts = (cell) => { const m = cell.match(/^([−+-]?[$€£¥]?)((?:\d{1,3}(?:,\d{3})+|\d+))(?:\.(\d+))?\s?(.*)$/); return m && { whole: m[2], decimals: (m[3] || "").length, unit: m[4] }; };

/** The rounding and thousands rules for one column of numbers: each cell is one number, as the column finder of check's rule 10 reads it. */
function findNumberColumn(cells) {
  const out = [], read = cells.map((text) => ({ text, ...parts(text) })).filter((c) => c.whole);
  const byUnit = new Map();
  for (const c of read) byUnit.set(c.unit, [...(byUnit.get(c.unit) || []), c]);
  for (const same of byUnit.values()) {
    const a = same.find((c) => c.decimals !== same[0].decimals);
    if (a) out.push({ rule: 2, name: "rounding", found: `"${same[0].text}" and "${a.text}"`, fix: "every number in a column has the same decimals, as in \"1.2 s\" and \"0.9 s\"" });
  }
  const comma = read.some((c) => c.whole.includes(","));
  for (const c of read) {
    if (c.whole.includes(",")) continue;
    if (c.whole.length >= 5 || (c.whole.length === 4 && comma)) out.push({ rule: 3, name: "thousands", found: `"${c.text}"`, fix: "a comma goes every three digits from 1,000 up, as in \"12,400\"; a year or a code takes none, and then its column is not a column of numbers" });
  }
  return out;
}

/** The thousands rule for a card's large number. */
const findBigNumber = (text) => ((parts(text) || {}).whole || "").length >= 5 && !text.includes(",") ? [{ rule: 3, name: "thousands", found: `"${text}"`, fix: "a comma goes every three digits from 1,000 up, as in \"12,400\"" }] : [];

module.exports = { wordsOf, findNumberText, findNumberColumn, findBigNumber, looksLikeDate };
