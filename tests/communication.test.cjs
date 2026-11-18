// Communication diagrams: lifelines, one line per link, and numbered messages beside the links with a small arrow.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "communication.json"), "utf8"));
const broken = (change, message) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), message); };

test("a communication diagram matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "communication");
  const file = path.join(__dirname, "expected", "communication.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "communication.svg changed; look at the drawing, then run with UPDATE=1");
});

test("each pair that talks gets one link, and each message sits beside it with its number and an arrow the way it goes", () => {
  const { svg, scene } = renderDiagram(fixture());
  assert.equal(scene.legs.length, 3, "Checkout-Cart, Cart-Stock and Cart-Payments");
  assert.ok(scene.legs.every((l) => l.still && l.u.end === null), "a link is a plain line, and nothing moves");
  const pay = scene.legs.find((l) => l.to === "pay");
  assert.deepEqual(pay.texts.map((t) => t.s.slice(0, -2)), ["1.2 [all reserved]: charge(total)", "1.3: receipt"]);
  // The arrows of 1.2 and 1.3 point opposite ways along the same link.
  const arrow = (t) => t.s.slice(-1);
  const flip = { "→": "←", "←": "→", "↑": "↓", "↓": "↑" };
  assert.equal(flip[arrow(pay.texts[0])], arrow(pay.texts[1]));
  assert.match(svg, /1\.1 \*\[i=1\.\.n\]: reserve\(item\)/);
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<ol><li>1\. : Checkout sends placeOrder\(\) to c : Cart\.<\/li><li>1\.1\. c : Cart sends reserve\(item\) to : Stock, again and again: i=1\.\.n\.<\/li>/);
  assert.match(words, /1\.1 and 1\.2 happen inside message 1/);
});

test("the data is checked, and each error says what to change", () => {
  broken((d) => (d.messages[1].n = "1.a"), /is not a decimal sequence number/);
  broken((d) => (d.messages[4].n = "1.1"), /does not come after 1\.3/);
  broken((d) => (d.messages[0].n = "3"), /does not come after|is part of message 1/);
  broken((d) => (d.messages[1].guard = "x"), /both a "guard" and a "repeat"/);
  broken((d) => d.lifelines.push({ id: "lonely", name: ": Log" }), /the lifeline "lonely" has no link/);
  broken((d) => (d.links = [{ from: "ui", to: "cart" }]), /which a message already joins/);
  broken((d) => (d.lifelines = d.lifelines.slice(0, 1)), /2 to 8 lifelines/);
});
