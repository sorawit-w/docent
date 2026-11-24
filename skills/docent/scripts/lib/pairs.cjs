// The pairs that a palette must pass, in Node, so the scripts can test a palette that is not in palettes.json: the same pairs, labels and
// minimums as the palette part of tests/contrast.py, which checks that both agree. Each row is [label, foreground, background, minimum,
// words]; each gap is [label, value, minimum, words]. The words name the pair for an author, with no code.
const { contrast, distance, STATUS } = require("./color.cjs");

const PAPER_HEAT = ["#dee2f0", "#babecb", "#9498a5", "#616571", "#3e424d"]; // paper keeps Docent's gray heat steps (palettes.cjs)
const FG = { text: "Body text", muted: "Muted text", primary: "The accent", ink: "The heading color", ok: "Green status text", warn: "Amber status text", err: "Red status text" };
const MODE = { light: "in light mode", dark: "in dark mode", paper: "on paper" };
const STATUS_NAME = { ok: "green", warn: "amber", err: "red" };

/** Every pair of one palette: { rows, gaps }. p is a palette as palettes.json holds it. */
function palettePairs(p) {
  const n = p.name.toLowerCase(), rows = [], gaps = [];
  const lt = { page: p.light.bg, well: p.light.panel, text: p.light.text, muted: p.light.muted, line: p.light.line, primary: p.light.primary, ink: p.light.ink, ...STATUS.light };
  const dk = { page: p.dark.bg, well: p.dark.panel, text: p.dark.text, muted: p.dark.muted, line: p.dark.line, primary: p.dark.primary, ink: p.dark.text, ...STATUS.dark };
  const pp = { ...lt, page: "#ffffff" };
  for (const [mode, t] of [["light", lt], ["dark", dk], ["paper", pp]]) {
    for (const fg of ["text", "muted", "primary", "ink", "ok", "warn", "err"]) for (const bg of ["page", "well"]) rows.push([`${n} ${mode} ${fg} on ${bg}`, t[fg], t[bg], 4.5, `${FG[fg]} on the ${bg} ${MODE[mode]}`]);
    rows.push([`${n} ${mode} line on page (non-text)`, t.line, t.page, 0, `The line on the page ${MODE[mode]}`]);
    if (mode !== "paper") for (const bg of ["page", "well"]) {
      rows.push([`${n} ${mode} more: line on ${bg} (non-text)`, t.muted, t[bg], 3.0, `The line on the ${bg} ${MODE[mode]}, with more contrast`]);
      rows.push([`${n} ${mode} more: muted text on ${bg}`, t.text, t[bg], 4.5, `Muted text on the ${bg} ${MODE[mode]}, with more contrast`]);
    }
    rows.push([`${n} ${mode} no-data outline on page`, t.muted, t.page, 3.0, `The outline of a heat-map cell with no data ${MODE[mode]}`]);
    const steps = mode === "paper" ? PAPER_HEAT : [1, 2, 3, 4, 5].map((k) => p[mode][`heat-${k}`]);
    steps.forEach((step, i) => { const fg = i < 3 ? "text" : "page"; rows.push([`${n} ${mode} ${fg} on heat-${i + 1}`, t[fg], step, 4.5, `The number on heat step ${i + 1} ${MODE[mode]}`]); });
    if (mode !== "paper") for (let k = 1; k <= 4; k += 1) gaps.push([`${n} ${mode} heat steps ${k} and ${k + 1} (CIE76)`, distance(steps[k - 1], steps[k]), 12, `Heat steps ${k} and ${k + 1} ${MODE[mode]}`]);
  }
  rows.push([`${n} light primary dot on page`, lt.primary, lt.page, 3.0, "The dot on the page in light mode"]);
  for (const bg of ["page", "well"]) rows.push([`${n} dark dot on dark ${bg}`, dk.primary, dk[bg], 3.0, `The dot on the ${bg} in dark mode`]);
  for (const [mode, t] of [["light", lt], ["dark", dk]]) gaps.push([`${n} ${mode} muted vs accent (CIE76)`, distance(t.muted, t.primary), 25, `The muted color and the accent ${MODE[mode]}`]);
  for (const [mode, t] of [["light", lt], ["dark", dk]]) for (const st of ["ok", "warn", "err"]) gaps.push([`${n} ${mode} accent vs ${st} (CIE76)`, distance(t.primary, t[st]), 25, `The accent and the ${STATUS_NAME[st]} status color ${MODE[mode]}`]);
  // Present mode of a deck: always light, with the more-contrast tokens; every text pair reaches 7:1 on the page.
  const accent = (p.present && p.present.primary) || p.light.primary;
  for (const [label, fg, words] of [["text", p.light.text, "Body text"], ["muted text (text color)", p.light.text, "Muted text"], ["heading (ink)", p.light.ink, "The heading color"], ["accent", accent, "The accent"]]) rows.push([`${n} present: ${label} on page`, fg, p.light.bg, 7.0, `${words} on the page when a deck is presented`]);
  rows.push([`${n} present: line (muted) on page`, p.light.muted, p.light.bg, 3.0, "The line on the page when a deck is presented"]);
  for (const st of ["ok", "warn", "err"]) rows.push([`${n} present: ${st} dot on page`, STATUS.light[st], p.light.bg, 3.0, `The ${STATUS_NAME[st]} status dot when a deck is presented`]);
  return { rows, gaps };
}

/** The pairs of a palette that fail, each in plain words with the one number that matters: [{ label, words }]. */
function failing(p) {
  const { rows, gaps } = palettePairs(p), out = [];
  for (const [label, fg, bg, need, words] of rows) {
    const r = contrast(fg, bg);
    if (r < need) out.push({ label, words: `${words} is too hard to ${need === 3 ? "see" : "read"} (${r.toFixed(2)}:1, needs ${need}:1)` });
  }
  for (const [label, value, need, words] of gaps) {
    if (value >= need) continue;
    const why = /muted/.test(label) ? ", so a note would look like a link" : /accent vs/.test(label) ? ", so a link would read as a status" : ", so they look like one step";
    out.push({ label, words: `${words} stand ${value.toFixed(1)} apart (CIE76); they need ${need}${why}` });
  }
  return out;
}

module.exports = { PAPER_HEAT, palettePairs, failing };
