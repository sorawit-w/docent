// profile: counts what a page holds and suggests the profile that fits it. The agent chooses the profile; check names a suggestion only when one rule wins clearly.
const PROFILES = ["standard", "task", "reference", "brief", "deck"]; // a deck is chosen when the user asks for slides, never suggested

const plain = (s) => s.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const all = (s, re) => [...s.matchAll(re)].map((m) => m[1] || m[0]);
const TIME = /\b(?:[01]\d|2[0-3]):[0-5]\d\b/;
// A timeline table: at least 3 rows, and at least half of them, hold a time of day. Brief exists for it, so it is not Reference text.
const isTimeline = (table) => { const rows = table.match(/<tr\b[\s\S]*?(?=<tr\b|$)/gi) || []; const timed = rows.filter((r) => TIME.test(plain(r))).length; return timed >= 3 && timed * 2 >= rows.length; };
// The document's kind, from the margin note of the title block. A research or decision document explains a result, so it is Standard,
// also when it is called a report or a summary; this rule comes first. A report for managers, an analysis or an incident is Brief.
const KINDS = [
  ["standard", /research|study|interview|decision record|\badr\b/i],
  ["brief", /report|brief|summary|release|analysis|incident|post-?mortem/i],
];

/** The timeline figures in a page's data blocks: how many, and how many of their rows are times of day (a scale of minutes). A
 * timeline figure counts toward Brief as a timeline table does: it is not Reference text, and its times of day count as times. */
function timelineFigures(source) {
  const blocks = [...source.matchAll(/<!-- docent:diagram[ \t]*\n([\s\S]*?)\n[ \t]*-->/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
  const timelines = blocks.filter((d) => d && d.kind === "timeline");
  const times = timelines.filter((d) => d.scale && /\d{2}:\d{2}$/.test(String(d.scale.from))).reduce((n, d) => n + (Array.isArray(d.rows) ? d.rows.length : 0), 0);
  return { count: timelines.length, times };
}

/** Counts from the <main> of a page, without drawings and without the steps of a diagram in words. */
function profileSignals(source) {
  const figures = timelineFigures((source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [, source])[1]);
  const markup = source.replace(/<!--[\s\S]*?-->/g, "");
  const main = (markup.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [, markup])[1]
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<details\b[^>]*class="[^"]*\bdg-words\b[\s\S]*?<\/details>/gi, "");
  const blocks = all(main, /<(?:pre|table)\b[^>]*>([\s\S]*?)<\/(?:pre|table)>/gi).filter((b) => !isTimeline(b));
  const timelines = all(main, /<table\b[^>]*>([\s\S]*?)<\/table>/gi).filter(isTimeline).length;
  const outsideCode = main.replace(/<pre\b[\s\S]*?<\/pre>/gi, "");
  const kind = (markup.match(/class="title"[\s\S]*?class="note"[^>]*>\s*<strong>([^<]*)<\/strong>/i) || [])[1] || "";
  return {
    stepHeadings: all(main, /<h3\b[^>]*class="[^"]*\bstep\b[^"]*"/gi).length,
    numberedItems: all(main, /<ol>([\s\S]*?)<\/ol>/gi).reduce((n, list) => n + (list.match(/<li\b/gi) || []).length, 0),
    code: (main.match(/<pre\b/gi) || []).length,
    tables: (main.match(/<table\b/gi) || []).length - timelines,
    timelines: timelines + figures.count,
    blockText: blocks.map(plain).join(" ").length,
    prose: all(main, /<p\b[^>]*>([\s\S]*?)<\/p>/gi).map(plain).join(" ").length,
    times: (plain(outsideCode).match(new RegExp(TIME.source, "g")) || []).length + figures.times,
    kind: plain(kind),
  };
}

/** Returns { profile, sure, reasons }. Sure means exactly one rule won; with no rule or two rules, the profile is Standard. */
function suggestProfile(markup) {
  const s = profileSignals(markup);
  const won = [];
  if (s.code + s.tables >= 3 && s.blockText > s.prose) won.push(["reference", `${s.code} code blocks and ${s.tables} tables hold more text than the paragraphs`]);
  if (s.stepHeadings >= 3 || s.numberedItems >= 5) won.push(["task", s.stepHeadings >= 3 ? `${s.stepHeadings} numbered step headings` : `${s.numberedItems} numbered steps`]);
  const kind = KINDS.find(([, words]) => words.test(s.kind))?.[0];
  if (kind === "standard") won.push(["standard", `the document's kind is "${s.kind}"`]);
  if (kind === "brief" || (s.times >= 5 && s.code + s.tables < 3)) won.push(["brief", kind === "brief" ? `the document's kind is "${s.kind}"` : `${s.times} times of day`]);
  if (won.length === 1) return { profile: won[0][0], sure: true, reasons: [won[0][1]], signals: s };
  return { profile: "standard", sure: won.length === 0, reasons: won.map(([p, why]) => `${p}: ${why}`), signals: s };
}

module.exports = { PROFILES, profileSignals, suggestProfile };
