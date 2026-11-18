// State machine diagrams in UML notation: the drawing, the column for phones, the words and the key, and the errors.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "state.json"), "utf8"));

test("a state machine diagram matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "state");
  const file = path.join(__dirname, "expected", "state.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "state.svg changed; look at the drawing, then run with UPDATE=1");
});

test("a state machine draws states with their actions, a composite state with two regions, and labeled transitions", () => {
  const { svg, scene } = renderDiagram(fixture());
  const main = svg.split('id="dg-order-states-phone"')[0];
  assert.match(main, />entry \/ reserve stock</);
  assert.match(main, />do \/ notify the warehouse</);
  assert.match(main, />exit \/ send the tracking link</);
  assert.equal(scene.under.length, 1, "one frame for the composite state, around both regions");
  assert.match(scene.under[0], /rx="10" class="u-face"\/><line [^>]*class="u-ln u-dash"\/>/, "a rounded frame with a dashed line between its regions");
  assert.deepEqual(scene.notes.map((t) => t.s), ["Shipping"]);
  const labels = scene.legs.flatMap((l) => l.texts.map((t) => t.s));
  for (const s of ["pay", "[card valid]", "[else] / show error", "edit", "hand over"]) assert.ok(labels.includes(s), `the label "${s}"`);
  const self = scene.legs.find((l) => l.from === "new" && l.to === "new");
  assert.equal(self.pts.length, 4, "a transition to itself is a loop at the right of its state");
  assert.ok(self.pts.every(([x]) => x >= self.pts[0][0]), "out of its right side and back in");
  const into = scene.legs.find((l) => l.to === "shipping--r1");
  const frame = scene.under[0].match(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
  assert.equal(into.pts.at(-1)[1], frame[1], "a transition to the composite state ends on its frame");
  assert.deepEqual(scene.legs.filter((l) => !l.still).map((l) => l.n), [1, 2, 3, 5, 10, 11], "the dot travels the main path: start, New, the choice, Paid, Shipping, Shipped, the end");
});

test("a state machine has a column for phones and the states in words with a key", () => {
  const { svg, phone } = renderDiagram(fixture());
  assert.equal(phone.w, 264);
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>The state New\. On entry: reserve stock\. On “pay”, go to the choice\. On “after 7 days”, go to Cancelled\. On “edit”, stay in it and start it again\.<\/li>/);
  assert.match(words, /<li>A choice\. If card valid, go to Paid\. If else, go to New, doing “show error”\.<\/li>/);
  assert.match(words, /<li>Shipping, region 2: The state Labeling\. On “printed”, go to the end in Shipping\.<\/li>/);
  assert.match(words, /Shipping is a state with states inside, in 2 regions that are active at the same time\. From any state inside, on “hand over”, go to Shipped\./);
  for (const k of ["A large box with round corners", "A dashed line inside a state", "a change of state"]) assert.ok(words.includes(k), `the key has "${k}"`);
  assert.ok(!words.includes("H in a ring"), "no history in the key, since the drawing has none");
});

test("wrong state machine data is refused with a plain reason", () => {
  const bad = (change, message) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), message); };
  bad((d) => (d.states[1].type = "busy"), /the type of state 2 \("new"\) must be one of/);
  bad((d) => (d.states[0].name = "Begin"), /is a initial pseudostate, which has no name/);
  bad((d) => (d.states[6].in = "paid"), /is in "paid", which is not a composite state/);
  bad((d) => (d.states[6].region = 3), /is in region 3 of "shipping", which has 2 regions/);
  bad((d) => (d.states[3].entry = "x", d.states[4].entry = "y"), /only a simple state has entry, do and exit actions/);
  bad((d) => (d.transitions[2].guard = "[card valid]"), /write it without them/);
  bad((d) => (d.transitions[3].effect = "/ show error"), /write it without, and the renderer adds it/);
  bad((d) => delete d.transitions[3].guard, /has no guard; each says when it is taken/);
  bad((d) => (d.transitions[0].trigger = "go"), /may only have an effect/);
  bad((d) => d.transitions.push({ from: "end", to: "new" }), /has a transition out; it ends the machine/);
  bad((d) => d.states.push({ id: "h", type: "history" }), /is not inside a composite state/);
  bad((d) => d.transitions.push({ from: "shipping", to: "packing" }), /to a state inside it/);
});
