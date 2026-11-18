// Interaction overview diagrams: an activity diagram whose nodes are ref frames, each naming a sequence diagram.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "interaction-overview.json"), "utf8"));

test("an interaction overview diagram matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "interaction-overview");
  const file = path.join(__dirname, "expected", "interaction-overview.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "interaction-overview.svg changed; look at the drawing, then run with UPDATE=1");
});

test("each interaction is a ref frame, and its words link to the diagram it names", () => {
  const { svg, scene } = renderDiagram(fixture());
  const main = svg.split('id="dg-checkout-overview-phone"')[0];
  assert.equal((main.match(/class="u-op">ref<\/text>/g) || []).length, 4, "four ref frames");
  assert.doesNotMatch(main, /<a /, "the drawing is one image, so it holds no link; the words carry it");
  assert.deepEqual(scene.legs.filter((l) => !l.still).map((l) => l.n), [1, 2, 3, 4, 5, 7, 9], "the dot travels the main path");
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>The interaction “<a href="#dg-login">Log in<\/a>” happens here; its steps are in its own diagram\.<\/li>/);
  assert.match(words, /A frame marked ref: an interaction whose messages are drawn in its own sequence diagram\./);
});

test("wrong interaction overview data is refused, and check finds a ref to a diagram that is not in the document", () => {
  const bad = (change, message) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), message); };
  bad((d) => (d.nodes[2].type = "action"), /must be one of initial, interaction, decision/);
  bad((d) => (d.nodes[2] = { id: "pay", name: "Pay" }), /it names the interaction in "ref", not "name"/);
  bad((d) => (d.partitions = [{ id: "a", name: "A" }]), /has no partitions/);
  bad((d) => (d.nodes[3].diagram = "x"), /only an interaction names one/);
  const block = `<!-- docent:diagram\n${JSON.stringify(fixture())}\n-->\n${renderDiagram(fixture()).svg}\n<!-- /docent:diagram -->`;
  const { errors } = checkDocument(`<!doctype html><html><body>${block}</body></html>`);
  assert.ok(errors.some((e) => /a ref frame links to the diagram "login", which is not in this document/.test(e)), errors.join("\n"));
});
