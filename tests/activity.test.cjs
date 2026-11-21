// Activity diagrams in UML notation: the drawing, the column for phones, the words and the key, and the errors.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "activity.json"), "utf8"));

test("an activity diagram matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "activity");
  const file = path.join(__dirname, "expected", "activity.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "activity.svg changed; look at the drawing, then run with UPDATE=1");
});

test("an activity diagram draws each node with its UML mark, partitions as lanes, and open arrowheads", () => {
  const { svg, scene } = renderDiagram(fixture());
  const main = svg.split('id="dg-order-flow-phone"')[0];
  assert.equal((main.match(/<circle [^>]*r="8" class="u-ink"\/>/g) || []).length, 1, "one initial node");
  assert.equal((main.match(/<rect [^>]*height="5" class="u-ink"\/>/g) || []).length, 2, "a fork and a join bar");
  assert.equal((main.match(/<rect [^>]*rx="10" class="u-face"\/>/g) || []).length, 4, "four actions with round corners");
  assert.match(main, /<polygon [^>]*class="u-face"\/>[^]*>Send the invoice</, "a send signal");
  assert.match(main, />\[shipped\]</, "an object node with its state in brackets");
  assert.deepEqual(scene.lanes.map((l) => l.text.s), ["Shop", "Warehouse"]);
  assert.equal(scene.legs.length, 12);
  assert.ok(scene.legs.every((l) => l.u.end === "open" && !l.u.dashed), "a flow is a solid line with an open arrowhead");
  assert.deepEqual(scene.legs.filter((l) => l.texts.length).map((l) => l.texts[0].s).sort(), ["[else]", "[in stock]"], "guards in brackets beside their flows");
  const moving = scene.legs.filter((l) => !l.still).map((l) => l.n);
  assert.deepEqual(moving, [1, 2, 3, 4, 5, 6, 7, 8], "the dot travels the main path, from the start to the final node");
  assert.doesNotMatch(main, /class="pulse pulse-(9|10|11|12)"/, "the other flows keep still");
});

test("an activity diagram has a column for phones that fits 264px, and the steps in words with a key", () => {
  const { svg, phone } = renderDiagram(fixture());
  assert.equal(phone.w, 264);
  assert.match(svg, /<svg id="dg-order-flow-phone" class="dg dg-activity dg-auto"/);
  assert.match(svg, /@media \(max-width:792px\)\{#dg-order-flow\{display:none\}#dg-order-flow-phone\{display:block\}\}/);
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>Shop: Start\.<\/li><li>Shop: Take the order\.<\/li><li>Shop: Decide: if in stock, go to the fork; if else, go to Tell the customer\.<\/li>/);
  assert.match(words, /<li>Warehouse: The path splits; these run at the same time: Pack the items; Send the invoice\.<\/li>/);
  assert.match(words, /<li>Shop: Send the signal “Send the invoice”\. Then back to the join after Pack the items\.<\/li>/);
  assert.match(words, /<li>Shop: This path ends; the other paths go on\.<\/li>/);
  for (const k of ["A filled dot", "A box with round corners", "A hollow diamond", "A thick bar", "A plain box", "A box with a point", "A ring around a filled dot", "A ring with a cross", "A column with a name"]) assert.ok(words.includes(k), `the key has "${k}"`);
  assert.ok(!words.includes("A box with a notch"), "the key leaves out the accept event, which the drawing does not use");
});

test("wrong activity data is refused with a plain reason", () => {
  const bad = (change, message) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), message); };
  bad((d) => (d.nodes[1].type = "loop"), /the type of node 2 \("take"\) must be one of/);
  bad((d) => delete d.nodes[1].name, /is an action and needs a "name"/);
  bad((d) => (d.nodes[2].name = "Stock?"), /is a decision, which has no name in UML/);
  bad((d) => delete d.flows[2].guard, /has no guard; each flow out of a decision says when it is taken/);
  bad((d) => (d.flows[3].guard = "go"), /only the flows out of a decision have guards/);
  bad((d) => (d.flows[2].guard = "[in stock]"), /write it without them/);
  bad((d) => (d.nodes[4].partition = "office"), /names the partition "office", which does not exist/);
  bad((d) => d.flows.push({ from: "take", to: "tell" }), /has 2 flows out; to split the path, add a decision/);
  bad((d) => d.flows.splice(7, 1), /has no flow out; a path ends at a final node/);
  bad((d) => (d.nodes[0].type = "action", d.nodes[0].name = "Begin"), /starts at an initial node|nothing flows into/);
  bad((d) => d.flows.push({ from: "done", to: "take" }), /has a flow out; a final node ends a path/);
});

test("the review findings: port limits, phone width, the dot's order, and empty partitions", () => {
  const base = (nodes, flows, more = {}) => ({ id: "t", kind: "activity", label: "A test.", nodes, flows, ...more });
  const four = base([{ id: "s", type: "initial" }, { id: "d", type: "decision" }, ...[1, 2, 3, 4].map((k) => ({ id: `e${k}`, type: "final" }))], [{ from: "s", to: "d" }, ...[1, 2, 3, 4].map((k) => ({ from: "d", to: `e${k}`, guard: `case ${k}` }))]);
  assert.throws(() => renderDiagram(four), /a decision has at most 3, so that each line meets one side of the diamond/);
  four.flows.pop(); four.nodes.pop();
  assert.doesNotThrow(() => renderDiagram(four), "three ways out of a decision are drawn");
  const long = base([{ id: "s", type: "initial" }, { id: "a", name: "Review the completed application" }, { id: "b", name: "Send the answer to the person" }, { id: "e", type: "final" }], [{ from: "a", to: "b" }, { from: "b", to: "e" }, { from: "s", to: "a" }]);
  const drawn = renderDiagram(long);
  assert.ok(!drawn.phone || drawn.phone.w === 264, "a long name wraps in the column");
  assert.deepEqual(drawn.scene.legs.filter((l) => !l.still).map((l) => [l.from, l.to]), [["s", "a"], ["a", "b"], ["b", "e"]], "the dot travels from the start, whatever the order of the flows");
  const empty = base([{ id: "s", type: "initial", partition: "used" }, { id: "e", type: "final", partition: "used" }], [{ from: "s", to: "e" }], { partitions: [{ id: "unused", name: "Unused" }, { id: "used", name: "Used" }] });
  assert.throws(() => renderDiagram(empty), /the partition "unused" has no nodes; leave it out/);
});

test("a long action name wraps in the column form, which stays 264px wide", () => {
  const { layoutColumnGraph, PHONE_NODE } = require("../skills/docent/scripts/lib/graph.cjs");
  const { columnOf, readActivity } = require("../skills/docent/scripts/lib/activity.cjs");
  const d = fixture();
  d.nodes[1].name = "Review the completed application";
  const col = layoutColumnGraph(columnOf(readActivity(d)), "activity");
  assert.equal(col.w, 264);
  assert.ok(col.parts.every((p) => p.w <= PHONE_NODE));
});
