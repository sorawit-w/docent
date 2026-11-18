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

test("h4 and definition lists have kit styles within the six sizes and two weights", () => {
  assert.match(rule("h4"), /font: 600 16px\/1\.5 var\(--sans\)/);
  assert.match(rule("dt"), /font-weight: 600/);
  assert.match(rule("dl"), /max-width: var\(--measure\)/);
});

test("the page script writes each step number as text, so a screen reader in Chromium reads it", () => {
  assert.match(js, /querySelectorAll\('h3\.step'\)/);
  assert.match(js, /span\.className = 'step-n'/);
  assert.match(rule("h3.is-numbered::before"), /content: none/);
});
