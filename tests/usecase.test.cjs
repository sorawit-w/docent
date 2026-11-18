// Use case diagrams: actors, use cases in a system boundary, associations, «include», «extend» and generalization.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "usecase.json"), "utf8"));

test("a use case diagram matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "usecase");
  const file = path.join(__dirname, "expected", "usecase.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "usecase.svg changed; look at the drawing, then run with UPDATE=1");
});

test("actors stand outside the boundary, at their side, and an included use case stands right of the one that includes it", () => {
  const { scene } = renderDiagram(fixture());
  const at = (id) => scene.parts.find((p) => p.id === id);
  const box = scene.under.find((u) => u.includes('class="u-frame"'));
  const [, bx, , bw] = box.match(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/).map(Number);
  for (const a of ["customer", "member"]) assert.ok(at(a).x + at(a).w <= bx, `${a} stands left of the boundary`);
  assert.ok(at("bank").x >= bx + bw, "the payment service stands right of the boundary");
  for (const u of ["browse", "order", "pay", "coupon", "track"]) assert.ok(at(u).x > bx && at(u).x + at(u).w < bx + bw, `${u} is inside the boundary`);
  assert.ok(at("pay").x > at("order").x, "Pay stands right of Place an order");
  assert.ok(at("member").y > at("customer").y, "a kind of an actor stands below it");
  assert.ok(scene.legs.every((l) => l.still), "a structural kind has no dot");
  const ends = Object.fromEntries(scene.legs.map((l) => [`${l.from}>${l.to}`, l.u]));
  assert.deepEqual(ends["customer>order"], { end: null, dashed: false });
  assert.deepEqual(ends["order>pay"], { end: "open", dashed: true });
  assert.deepEqual(ends["coupon>order"], { end: "open", dashed: true });
  assert.deepEqual(ends["member>customer"], { end: "hollow", dashed: false });
});

test("the words say who takes part in what, and the phone list has one band per actor", () => {
  const { svg, phone } = renderDiagram(fixture());
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>Customer takes part in “Browse the catalog” and “Place an order”\.<\/li>/);
  assert.match(words, /Member is a kind of Customer, and takes part in all that Customer does\./);
  assert.match(words, /<li>“Place an order” always includes “Pay”\.<\/li>/);
  assert.match(words, /<li>“Apply a coupon” may add to “Place an order”, under a condition\.<\/li>/);
  assert.match(words, /A stick figure: an actor/);
  assert.equal(phone.w, 264);
  assert.deepEqual(phone.bands.length, 3);
  assert.deepEqual(phone.notes.filter((n) => n.cls === "sub").map((n) => n.s), ["Customer", "Member", "Payment service"]);
});

test("wrong use case data is refused", () => {
  const bad = (change, message) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), message); };
  bad((d) => delete d.system, /"system" .* is missing/);
  bad((d) => (d.relations[0] = { from: "browse", to: "customer" }), /goes "from" an actor "to" a use case/);
  bad((d) => (d.relations[4].from = "customer"), /an include, which goes from one use case to another/);
  bad((d) => (d.relations[3].to = "browse"), /between an actor and a use case/);
  bad((d) => d.relations.push({ from: "pay", to: "order", type: "include" }), /includes itself/);
  bad((d) => d.usecases.push({ id: "lonely", name: "Lonely" }), /"lonely" has no relation/);
  bad((d) => (d.actors[2].side = "top"), /must be "left" or "right"/);
  bad((d) => (d.relations[0].type = "uses"), /must be one of association, include, extend, generalization/);
  bad((d) => d.relations.push({ from: "customer", to: "browse" }), /two relations go from "customer" to "browse"/);
});
