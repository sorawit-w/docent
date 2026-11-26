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

test("a timeline table is not Reference text, so an incident page with a long timeline does not look like Reference", () => {
  const timeline = `<table><thead><tr><th>Time</th><th>What happened</th></tr></thead><tbody>${Array.from({ length: 12 }, (_, i) => `<tr><td>09:${String(10 + i * 3).padStart(2, "0")}</td><td>The team saw the queue grow, and the on-call engineer opened the dashboard of the service</td></tr>`).join("")}</tbody></table>`;
  const s = suggestProfile(page(para(2) + pre(1) + table(2) + timeline));
  assert.equal(s.signals.timelines, 1); assert.equal(s.signals.tables, 1);
  assert.notEqual(s.profile, "reference");
  assert.equal(suggestProfile(page(para(2) + pre(1) + table(2) + timeline, "Incident review")).profile, "brief");
  assert.equal(suggestProfile(page(para(1) + pre(4) + table(6) + table(6))).signals.timelines, 0, "a table with no times of day is not a timeline");
});

test("a research or decision document is Standard, also when it is called a report or a summary; an analysis or an incident is Brief", () => {
  for (const kind of ["Research report", "Research summary", "Customer research summary", "Interview summary", "Decision record", "ADR 12"]) {
    const s = suggestProfile(page(para(4), kind));
    assert.deepEqual([s.profile, s.sure], ["standard", true], kind);
  }
  for (const kind of ["Business analysis report", "Customer analysis", "Incident review", "Postmortem", "Release notes"]) assert.equal(suggestProfile(page(para(4), kind)).profile, "brief", kind);
});

test("check names no wrong profile for any of the five test documents", () => {
  const dir = path.join(__dirname, "..", "docs", "research", "test-documents");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const chosen = source.match(/<html\b[^>]*\bdata-profile="([^"]*)"/)[1];
    const s = suggestProfile(source);
    assert.ok(!s.sure || s.profile === "standard" || s.profile === chosen, `${file} has ${chosen}; the guess is ${s.profile}: ${s.reasons}`);
  }
});

test("a timeline figure counts toward Brief, as a timeline table does: its times of day count, and it is not Reference text", () => {
  const figure = (scale, n) => `<figure><div class="fig">\n<!-- docent:diagram\n${JSON.stringify({ id: "t", kind: "timeline", label: "L", scale, rows: Array.from({ length: n }, (_, i) => ({ name: `R${i}`, at: scale.day ? `09:${String(10 + i * 3).padStart(2, "0")}` : `2026-11-${String(2 + i * 3).padStart(2, "0")}` })) })}\n-->\n<svg class="dg"><text>09:10 09:13</text></svg>\n</div></figure>`;
  const minutes = suggestProfile(page(para(2) + figure({ from: "09:00", to: "10:00", day: "2026-11-12", zone: "UTC" }, 6)));
  assert.equal(minutes.signals.timelines, 1);
  assert.equal(minutes.signals.times, 6, "each row of a scale of minutes is a time of day; the drawing's own text is not counted");
  assert.equal(minutes.profile, "brief");
  const days = suggestProfile(page(para(2) + figure({ from: "2026-11-01", to: "2026-11-30" }, 6)));
  assert.equal(days.signals.timelines, 1);
  assert.equal(days.signals.times, 0, "a scale of days holds no times of day");
});
