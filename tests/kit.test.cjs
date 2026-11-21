// The page styles and the page script: rules that a test can read from the source of the kit.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const assets = path.join(__dirname, "..", "skills", "docent", "assets");
const css = fs.readFileSync(path.join(assets, "kit.css"), "utf8");
const js = fs.readFileSync(path.join(assets, "kit.js"), "utf8");
const rule = (selector) => (css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`)) || [])[1];

test("a status label wraps, so a long label does not make a phone page scroll sideways", () => {
  assert.ok(rule(".state"), "the .state rule exists");
  assert.ok(!/nowrap/.test(rule(".state")));
});

test("status notes have five kinds: three with a status color, and two without one", () => {
  for (const kind of ["ok", "warn", "err"]) assert.match(css, new RegExp(`\\.state\\.${kind} \\{ color: var\\(--${kind}\\); \\}`));
  assert.match(css, /\.state\.info, \.state\.plan \{ color: var\(--text\); \}/, "info and plan use the text color, not a status color");
  assert.match(rule(".state.info::before"), /background: var\(--muted\)/);
  assert.match(rule(".state.plan::before"), /background: none; border: 1\.5px solid var\(--muted\)/, "plan is a ring, so it differs by shape, not by color");
});

test("a table cell lets code break, and a closed section that holds a table takes the full width", () => {
  assert.match(rule(":is(td, th) code"), /overflow-wrap: anywhere/);
  assert.match(rule("details:has(> .table-wrap, > pre, > .code, > figure)"), /max-width: none/);
});

test("text sizes are in rem, so a reader who sets a larger text size gets larger text, not longer lines", () => {
  assert.deepEqual(css.match(/font(-size)?:[^;}]*\b\d+px/g), null);
});

test("on a wide screen the text and its notes sit in the middle, and wide blocks keep the same left edge", () => {
  const shell = rule(".shell");
  assert.match(shell, /--left: max\(40px, min\(\(100% - var\(--measure\) - var\(--gap\) - var\(--margin-col\)\) \/ 2, 100% - var\(--wide\) - 40px\)\)/);
  assert.match(shell, /padding: 0 max\(40px, 100% - var\(--left\) - var\(--wide\)\) 0 var\(--left\)/);
  assert.ok(!/max-width|margin: 0 auto/.test(shell), "no box in the middle of the screen: that leaves the right side empty");
});

test("h4 and definition lists have kit styles within the six sizes and two weights", () => {
  assert.match(rule("h4"), /font: 600 1rem\/1\.5 var\(--sans\)/);
  assert.match(rule("dt"), /font-weight: 600/);
  assert.match(rule("dl"), /max-width: var\(--measure\)/);
});

test("the page script parses", () => {
  assert.doesNotThrow(() => new Function(js), "a syntax error stops every part of the page script");
});

test("the page script takes out what a saved page kept, so it adds each part once", () => {
  assert.match(js, /querySelectorAll\('\.fig-more, \.step-n, button\.copy'\)\.forEach\(\(el\) => el\.remove\(\)\)/);
  assert.match(js, /hasAttribute\('data-theme-reader'\)/, "a theme the reader chose is not a fixed theme in a saved page");
});

test("a heading in the text column of a row lines up with its margin note", () => {
  assert.match(rule(".row:has(> h3:first-child)"), /margin-top: 32px/, "the row brings the space above the heading");
  assert.match(rule(".row > h3:first-child"), /margin-top: 0/);
});

test("the page script writes each step number as text, so a screen reader in Chromium reads it", () => {
  assert.match(js, /querySelectorAll\('h3\.step'\)/);
  assert.match(js, /span\.className = 'step-n'/);
  assert.match(rule("h3.is-numbered::before"), /content: none/);
});

test("the host tokens: the kit reads them and never sets them, so a host value holds in every theme and in print", () => {
  assert.ok(!/--host-[a-z-]+\s*:/.test(css), "the kit does not set a --host-* token");
  for (const token of ["host-accent", "host-accent-dark", "host-ink", "host-serif", "host-sans", "host-mono"]) assert.match(css, new RegExp(`var\\(--${token},`));
  assert.equal((css.match(/--primary: var\(--host-accent, #2f3fd0\)/g) || []).length, 2, "light and print");
  assert.equal((css.match(/--primary: var\(--host-accent-dark, #8e9bff\)/g) || []).length, 2, "dark by the system and dark by the switch");
});

test("a theme written on <html> is fixed: the page script hides the switch and reads no saved choice", () => {
  assert.match(js, /const fixed = root\.dataset\.theme === 'light' \|\| root\.dataset\.theme === 'dark';/);
  assert.match(js, /if \(!fixed\) try \{/);
  assert.match(css, /\.theme\[hidden\] \{ display: none; \}/);
});

test("a card grid has no box and at most four cards in a row", () => {
  assert.match(rule(".cards > li"), /border-top: 1px solid var\(--line\)/);
  assert.ok(!/background|box-shadow|border:/.test(rule(".cards > li")));
  assert.match(rule(".cards"), /calc\(\(100% - 72px\) \/ 4\)/);
});

test("a profile sets the block width and the spacing, never the text column", () => {
  assert.match(css, /--block: calc\(var\(--measure\) \+ var\(--gap\) \+ var\(--margin-col\)\); --section-space: 72px; --cell-y: 12px; --step-space: 36px;/, "Standard: code and tables end at the right edge of the notes");
  assert.match(rule('html[data-profile="task"]'), /--section-space: 56px; --step-space: 28px;/);
  assert.match(rule('html[data-profile="reference"]'), /--block: var\(--wide\); --section-space: 56px; --cell-y: 8px;/);
  assert.match(rule('html[data-profile="brief"]'), /--block: var\(--wide\); --section-space: 64px;/);
  for (const p of ["task", "reference", "brief"]) assert.ok(!/--measure/.test(rule(`html[data-profile="${p}"]`)));
  assert.match(rule(":is(pre, .code, .table-wrap, .cards)"), /max-width: var\(--block\)/);
  assert.match(rule("figure"), /min-width: min\(100%, var\(--block\)\); width: fit-content; max-width: 100%/, "a wider drawing keeps its real size");
  assert.match(rule("section"), /padding-top: var\(--section-space\)/);
  assert.match(rule("th, td"), /padding: var\(--cell-y\) 24px var\(--cell-y\) 0/);
});

test("a page for the public has larger text: the root grows, so every rem size grows with it", () => {
  assert.match(rule('html[data-text="large"]'), /font-size: 112\.5%/);
});

test("on paper: 11pt text, the notes beside the text, lines kept together, and page numbers", () => {
  const print = css.slice(css.indexOf("@media print {"));
  assert.match(print, /html \{ font-size: 11pt; \} html\[data-text="large"\] \{ font-size: 12pt; \}/);
  assert.match(print, /html:root:not\(\[data-never\]\) \{ --measure: 112mm; --gap: 8mm; --margin-col: 50mm; --block: 100%; \}/, "the text, a gap and the notes fit an A4 page (174mm)");
  assert.match(print, /\.shell \{ padding: 0; \}/, "the page margin is the edge");
  assert.match(print, /\.row \{ grid-template-columns: minmax\(0, var\(--measure\)\) var\(--margin-col\); \}/);
  assert.match(print, /p, li \{ orphans: 2; widows: 2; \}/);
  assert.match(print, /pre \{ border: 1px solid var\(--line\); white-space: pre-wrap; overflow-wrap: anywhere; \}/, "paper cannot scroll, so a long line of code wraps");
  assert.match(print, /@bottom-right \{ content: counter\(page\) " \/ " counter\(pages\);/);
  assert.ok(!/size:\s*(A4|letter)/i.test(print), "the reader's paper size wins");
});
