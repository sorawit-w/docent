// The profile suggestion: what check names when one rule wins clearly. The agent chooses the profile.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { suggestProfile } = require("../skills/docent/scripts/lib/profile.cjs");

const page = (main, kind = "Guide") => `<html lang="en"><body><main class="shell"><div class="title"><h1>T</h1><div class="row"><p class="standfirst">S</p><div class="note" role="note"><strong>${kind}</strong></div></div></div>${main}</main></body></html>`;
const para = (n) => `<p>${"A sentence of plain text that explains how the part works. ".repeat(n)}</p>`;
const pre = (n) => `<pre><code>${"bugs list --state open --limit 50 --json\n".repeat(n)}</code></pre>`;
const table = (rows) => `<table><tbody>${"<tr><th>--option</th><td>A value that the option takes, and what it does</td></tr>".repeat(rows)}</tbody></table>`;

test("prose with few blocks is Standard", () => {
  assert.deepEqual(suggestProfile(page(para(8) + pre(2) + para(6))).profile, "standard");
});

test("code and tables that hold more text than the paragraphs are Reference", () => {
  const s = suggestProfile(page(para(1) + pre(4) + table(6) + table(6)));
  assert.equal(s.profile, "reference"); assert.equal(s.sure, true);
  assert.match(s.reasons[0], /1 code blocks and 2 tables/);
});

test("numbered steps are Task: three step headings, or five numbered items", () => {
  assert.equal(suggestProfile(page('<h3 class="step">One</h3><h3 class="step">Two</h3><h3 class="step">Three</h3>' + para(4))).profile, "task");
  assert.equal(suggestProfile(page(`<ol>${"<li>Do this.</li>".repeat(5)}</ol>` + para(4))).profile, "task");
  assert.equal(suggestProfile(page(`<ol>${"<li>Do this.</li>".repeat(2)}</ol>` + para(4))).profile, "standard", "a short numbered list does not make a task");
});

test("a report, or many times of day with few blocks, is Brief", () => {
  assert.equal(suggestProfile(page(para(4), "Incident report")).profile, "brief");
  assert.equal(suggestProfile(page(`<p>${["09:12", "09:20", "09:41", "10:05", "10:30"].map((t) => `At ${t} the queue grew.`).join(" ")}</p>`)).profile, "brief");
});

test("a log with many times and many blocks is Reference, not Brief", () => {
  const log = `<p>${["09:12", "09:20", "09:41", "10:05", "10:30"].join(" ")}</p>` + pre(6) + table(8) + table(8);
  assert.equal(suggestProfile(page(log)).profile, "reference");
});

test("two rules that both win give no clear suggestion", () => {
  const s = suggestProfile(page(para(1) + pre(4) + table(6) + table(6), "Incident report"));
  assert.equal(s.sure, false); assert.equal(s.profile, "standard");
});

test("comments, drawings and the steps of a diagram in words are not counted", () => {
  const s = suggestProfile(page(`<!-- <ol><li>a</li><li>b</li><li>c</li><li>d</li><li>e</li></ol> --><svg><text>09:00 09:01 09:02 09:03 09:04</text></svg><details class="dg-words"><ol>${"<li>x</li>".repeat(6)}</ol></details>` + para(4)));
  assert.equal(s.profile, "standard");
});

test("the reference sample is Reference, and the sample page and the template are Standard", () => {
  const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");
  assert.equal(suggestProfile(read("tests", "fixtures", "reference-page.html")).profile, "reference");
  assert.equal(suggestProfile(read("skills", "docent", "assets", "specimen.html")).profile, "standard");
  assert.equal(suggestProfile(read("skills", "docent", "assets", "template.html")).profile, "standard");
});
