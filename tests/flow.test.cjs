// Flowcharts, tested against a stored drawing. Run with UPDATE=1 to store new expected output after a wanted change.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { check } = require("../skills/docent/scripts/lib/geometry.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { stampHtml } = require("../skills/docent/scripts/lib/kit.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "flow.json"), "utf8"));

test("a flowchart matches the stored drawing and keeps every spacing rule", () => {
  const { svg, scene, form } = renderDiagram(fixture());
  assert.equal(form, "flow");
  assert.deepEqual(check(scene), []);
  const file = path.join(__dirname, "expected", "flow.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "flow.svg changed; look at the drawing, then run with UPDATE=1");
});

test("a flowchart: the main path in the first column, decisions with pointed ends, thick stops, no numbers, and a dot on the main path only", () => {
  const { svg, scene, model } = renderDiagram(fixture());
  const main = svg.split("\n<svg")[0];
  assert.deepEqual(model.parts.filter((p) => p.lane === 0).map((p) => p.id), ["get", "read", "valid", "setup", "run", "good", "save", "done"]);
  assert.deepEqual(model.parts.filter((p) => p.lane === 1).map((p) => p.id), ["refuse", "tries", "fail"]);
  assert.equal((main.match(/<path d="M[^"]*Z" class="card"\/>/g) || []).length, 3, "three decisions, each a plate with pointed ends");
  assert.equal((main.match(/class="card is-stop"/g) || []).length, 2, "two stops with a thick outline");
  assert.ok(!/class="mark"/.test(main), "no numbers on the arrows");
  assert.equal((main.match(/class="pulse /g) || []).length, 7, "a dot for each of the 7 arrows of the main path, and none for the others");
  assert.equal(scene.legs.filter((leg) => leg.still).length, 4);
  assert.match(main, />no<\/text>/, "the label of an exit is its verb");
});

test("a flowchart has the column form for phones, and the steps in words", () => {
  const { svg } = renderDiagram(fixture());
  assert.match(svg, /<svg id="dg-job-phone" class="dg dg-column dg-auto"/);
  assert.match(svg, /<g class="jump"><circle [^>]*class="mark"\/><text [^>]*class="verb"[^>]*>yes<\/text><text [^>]*class="sub"[^>]*>back to Run the work<\/text><\/g>/, "an arrow back is a go-to row with no number");
  assert.match(svg, /<li>Input valid\? If yes: Set up\. If no: Refuse the job\.<\/li><li>Refuse the job\. The path ends here\.<\/li>/);
  assert.match(svg, /<li>Tries left\? If yes: Run the work\. If no: Report a failure\.<\/li>/);
});

test("wrong flowchart data is refused with a plain reason", () => {
  const broken = (change, reason) => { const copy = fixture(); change(copy); assert.throws(() => renderDiagram(copy), reason); };
  broken((d) => (d.kind = "tree"), /"kind" must be one of "sequence", "flow"/);
  broken((d) => delete d.edges[2].when, /leaves the decision "valid" with no "when"/);
  broken((d) => (d.edges[0].when = "always"), /leaves the step "get" with a "when"/);
  broken((d) => d.edges.push({ from: "setup", to: "save" }), /the step "setup" has 2 exits/);
  broken((d) => d.edges.push({ from: "refuse", to: "get" }), /the stop "refuse" has an exit/);
  broken((d) => (d.nodes[7].stop = false), /the path ends at "refuse"/);
  broken((d) => (d.edges = d.edges.filter((e) => e.to !== "refuse")), /the decision "valid" has 1 exits/);
  broken((d) => (d.edges[3].when = "YES"), /two exits of the decision "valid" have the same "when"/);
  broken((d) => (d.nodes[1] = { id: "read", name: "Read", ask: "Read?" }), /has both "name" and "ask"/);
  broken((d) => d.nodes.push({ id: "lost", name: "Lost", stop: true }), /the path ends at "done"|no path from "get" reaches "lost"/);
  broken((d) => (d.nodes[2].ask = "x".repeat(29)), /29 characters long; the most is 28/);
});

test("check tests a flowchart in a document like any other diagram", () => {
  const template = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "template.html"), "utf8");
  const page = template.replace("</main>", `<figure><div class="fig" role="region" aria-label="Figure 9" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div></figure></main>`);
  const built = stampHtml(renderDocument(page).html).html;
  assert.deepEqual(checkDocument(built), { errors: [], warnings: [] });
});
