// profile: counts what a page holds and suggests the profile that fits it. The agent chooses the profile; check names a suggestion only when one rule wins clearly.
const PROFILES = ["standard", "task", "reference", "brief"];

const plain = (s) => s.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const all = (s, re) => [...s.matchAll(re)].map((m) => m[1] || m[0]);

/** Counts from the <main> of a page, without drawings and without the steps of a diagram in words. */
function profileSignals(source) {
  const markup = source.replace(/<!--[\s\S]*?-->/g, "");
  const main = (markup.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [, markup])[1]
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<details\b[^>]*class="[^"]*\bdg-words\b[\s\S]*?<\/details>/gi, "");
  const blocks = all(main, /<(?:pre|table)\b[^>]*>([\s\S]*?)<\/(?:pre|table)>/gi);
  const outsideCode = main.replace(/<pre\b[\s\S]*?<\/pre>/gi, "");
  const kind = (markup.match(/class="title"[\s\S]*?class="note"[^>]*>\s*<strong>([^<]*)<\/strong>/i) || [])[1] || "";
  return {
    stepHeadings: all(main, /<h3\b[^>]*class="[^"]*\bstep\b[^"]*"/gi).length,
    numberedItems: all(main, /<ol>([\s\S]*?)<\/ol>/gi).reduce((n, list) => n + (list.match(/<li\b/gi) || []).length, 0),
    code: (main.match(/<pre\b/gi) || []).length,
    tables: (main.match(/<table\b/gi) || []).length,
    blockText: blocks.map(plain).join(" ").length,
    prose: all(main, /<p\b[^>]*>([\s\S]*?)<\/p>/gi).map(plain).join(" ").length,
    times: (plain(outsideCode).match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g) || []).length,
    kind: plain(kind),
  };
}

/** Returns { profile, sure, reasons }. Sure means exactly one rule won; with no rule or two rules, the profile is Standard. */
function suggestProfile(markup) {
  const s = profileSignals(markup);
  const won = [];
  if (s.code + s.tables >= 3 && s.blockText > s.prose) won.push(["reference", `${s.code} code blocks and ${s.tables} tables hold more text than the paragraphs`]);
  if (s.stepHeadings >= 3 || s.numberedItems >= 5) won.push(["task", s.stepHeadings >= 3 ? `${s.stepHeadings} numbered step headings` : `${s.numberedItems} numbered steps`]);
  if (/report|brief|summary|release/i.test(s.kind) || (s.times >= 5 && s.code + s.tables < 3)) won.push(["brief", s.kind && /report|brief|summary|release/i.test(s.kind) ? `the document's kind is "${s.kind}"` : `${s.times} times of day`]);
  if (won.length === 1) return { profile: won[0][0], sure: true, reasons: [won[0][1]], signals: s };
  return { profile: "standard", sure: won.length === 0, reasons: won.map(([p, why]) => `${p}: ${why}`), signals: s };
}

module.exports = { PROFILES, profileSignals, suggestProfile };
