// Fit warnings: the data's shape says that another kind, or no diagram, may serve the reader better.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));

test("the stored examples fit their kinds, so they get no fit warning", () => {
  for (const name of ["sequence", "sequence-uml", "activity", "class", "object", "communication"]) assert.deepEqual(renderDiagram(fixture(name)).warnings, [], name);
});

test("a sequence where every message goes one way, with no reply, reads as a workflow", () => {
  const d = { id: "one-way", kind: "sequence", label: "Three hand-offs.", participants: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }], messages: [{ from: "a", to: "b", verb: "send the form" }, { from: "b", to: "c", verb: "pass it on" }] };
  assert.match(renderDiagram(d).warnings.join(), /no reply comes back; this reads as a workflow/);
  d.messages.push({ from: "c", to: "a", verb: "answer", reply: true });
  assert.deepEqual(renderDiagram(d).warnings, []);
});

test("an activity with no decision, no fork and one partition is a numbered list", () => {
  const d = { id: "straight", kind: "activity", label: "Three steps in a row.", nodes: [{ id: "s", type: "initial" }, { id: "a", type: "action", name: "Fill in the form" }, { id: "b", type: "action", name: "Send it" }, { id: "e", type: "final" }], flows: [{ from: "s", to: "a" }, { from: "a", to: "b" }, { from: "b", to: "e" }] };
  assert.match(renderDiagram(d).warnings.join(), /this is a numbered list/);
});

test("a class diagram with no relations is a table, and a chain of links reads better as a sequence", () => {
  const c = fixture("class");
  c.relations = [];
  c.notes = [];
  assert.match(renderDiagram(c).warnings.join(), /no relations; this is a table/);
  const m = fixture("communication");
  m.lifelines = m.lifelines.slice(0, 3);
  m.messages = m.messages.filter((x) => !["pay"].includes(x.from) && !["pay"].includes(x.to)).map((x) => ({ ...x, n: x.n === "2" ? "2" : x.n }));
  assert.match(renderDiagram(m).warnings.join(), /a sequence diagram reads better/);
});

test("check reports a fit warning, and the document still passes", () => {
  const { checkDocument } = require("../skills/docent/scripts/check.cjs");
  const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const data = { id: "one-way", kind: "sequence", label: "Two hand-offs.", participants: [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }], messages: [{ from: "a", to: "b", verb: "send the form" }, { from: "b", to: "c", verb: "pass it on" }] };
  const where = '<section id="report"';
  assert.ok(specimen.includes(where));
  const html = renderDocument(specimen.replace(where, `<section id="fit" aria-labelledby="fit-h"><h2 id="fit-h">Fit</h2><figure><div class="fig" role="region" aria-label="Figure 9, hand-offs" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(data, null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 9</strong>Hand-offs.</figcaption></figure></section>\n${where}`)).html;
  const { errors, warnings } = checkDocument(html);
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /\("one-way"\): every message goes one way and no reply comes back; this reads as a workflow/.test(w)), warnings.join("\n"));
});
