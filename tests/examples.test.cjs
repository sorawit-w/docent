const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { stampHtml } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");

// The example pages are copied as they are by the docent-web site, so each one stays built and passes check.
const dir = path.join(__dirname, "..", "examples");
const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"));

test("the examples folder holds the pages", () => {
  assert.ok(pages.includes("runbook.html") && pages.includes("diagrams.html"), pages.join(", "));
});

for (const file of pages) {
  test(`${file} passes check, and render then stamp changes nothing`, () => {
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    const { errors, warnings } = checkDocument(html);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings.filter((w) => !w.includes("[hand.look]")), [], "only a hand-drawn figure may warn");
    assert.equal(stampHtml(renderDocument(html).html).html, html, `run render and stamp on examples/${file}, then commit it`);
  });
}

test("every diagram kind has one figure on diagrams.html, its svg named dg-<kind>", () => {
  const html = fs.readFileSync(path.join(dir, "diagrams.html"), "utf8");
  const kinds = ["sequence", "flow", "activity", "state", "interaction-overview", "usecase", "class", "object", "package", "profile", "component", "composite", "deployment", "communication", "timing", "range", "layout", "plan", "funnel", "bar", "line", "heatmap", "heatplan", "statusgrid", "timeline"];
  for (const id of [...kinds, "workflow-wide", "workflow-tall", "workflow-plates"]) assert.match(html, new RegExp(`<svg [^>]*id="dg-${id}"`), id);
  const forms = renderDocument(html).results.map((r) => r.form.split(";")[0]);
  assert.deepEqual(forms.filter((f) => !["wide", "tall", "plates"].includes(f)).sort(), [...kinds].sort(), "one figure for each kind, and no kind twice");
});
