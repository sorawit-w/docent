// Class and object diagrams: boxes with compartments, the UML relations, notes; a list of cards on a phone.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));

for (const name of ["class", "object"]) {
  test(`a ${name} diagram matches the stored drawing`, () => {
    const { svg, form } = renderDiagram(fixture(name));
    assert.equal(form, name);
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("each relation has its UML line and end, a parent stands above its child and a whole above its part", () => {
  const { svg, scene } = renderDiagram(fixture("class"));
  const leg = (from, to) => scene.legs.find((l) => l.from === from && l.to === to);
  assert.deepEqual(leg("customer", "order").u, { end: "open", dashed: false }, "a navigable association");
  assert.deepEqual(leg("line", "order").u, { end: "diamond-filled", dashed: false }, "a composition runs from the part, so the diamond sits at the whole");
  assert.deepEqual(leg("card", "payment").u, { end: "hollow", dashed: true }, "a realization");
  assert.deepEqual(leg("order", "payment").u, { end: "open", dashed: true }, "a dependency");
  assert.deepEqual(leg("n1", "order").u, { end: null, dashed: true }, "a note hangs on a dashed line");
  const at = (id) => scene.parts.find((p) => p.id === id);
  assert.ok(at("payment").y < at("card").y, "the interface stands above the class that implements it");
  assert.ok(at("order").y < at("line").y, "the whole stands above its part");
  assert.ok(scene.legs.every((l) => l.still), "a structural kind has no dot");
  const texts = scene.legs.flatMap((l) => l.texts.map((t) => t.s));
  for (const s of ["places", "1", "0..*", "lines 1..*", "«use»"]) assert.ok(texts.includes(s), `the label "${s}" is drawn`);
  const main = svg.split('id="dg-order-classes-phone"')[0];
  assert.match(main, /class="u-mem u-ul">- count: Integer</, "a static member is underlined");
  assert.match(main, /class="u-mem u-it">\+ charge\(amount: Money\): Boolean</, "an abstract operation is in italics");
  assert.match(main, />«interface»</);
  assert.match(main, /\.u-mem\{font-size:12px;fill:var\(--text,#1c1f2e\)\}/, "members take the text color of the page");
});

test("the words name every class and relation, and the key the marks that are used", () => {
  const words = renderDiagram(fixture("class")).svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>Order\. Attributes: “- total: Money”, “- count: Integer” \(static\)\./);
  assert.match(words, /<li>Customer is linked to 0\.\.\* Order, by “places”; each Order to 1 Customer; the link is used from Customer to Order\.<\/li>/);
  assert.match(words, /<li>Order owns 1\.\.\* OrderLine as “lines”; an OrderLine cannot exist without its Order\.<\/li>/);
  assert.match(words, /<li>CardPayment implements the interface Payment\.<\/li>/);
  for (const s of ["A box in parts: a class", "+ public, - private", "A filled diamond", "A dashed line with a hollow triangle", "0..*"]) assert.ok(words.includes(s), `the key says "${s}"`);
  const obj = renderDiagram(fixture("object")).svg.split('<details class="dg-words">')[1];
  assert.match(obj, /<li>o1042, an Order, with “total = 46\.00”\.<\/li>/);
  assert.match(obj, /<li>ana : Customer is linked to o1042 : Order, by “places”\.<\/li>/);
});

test("the phone list has a card per class, with a row for each relation that starts there", () => {
  const { phone } = renderDiagram(fixture("class"));
  assert.equal(phone.w, 264);
  const rows = phone.parts.filter((p) => p.id.includes("-row-")).map((p) => p.texts.map((t) => t.s).join(" "));
  assert.ok(rows.includes("owns OrderLine (1..*)"), rows.join(" | "));
  assert.ok(rows.includes("implements Payment"));
});

test("a parent stays above its child when another line between them points the other way", () => {
  const d = { id: "mix", kind: "class", label: "A child is a kind of its parent and also uses it.", classes: [{ id: "child", name: "Child" }, { id: "parent", name: "Parent" }], relations: [{ from: "child", to: "parent", name: "uses", navigable: true }, { from: "child", to: "parent", type: "generalization" }] };
  const { scene } = renderDiagram(d);
  const at = (id) => scene.parts.find((p) => p.id === id);
  assert.ok(at("parent").y < at("child").y);
});

test("an object with no slots is still underlined, and an abstract class with no members still in italics", () => {
  const obj = renderDiagram({ id: "bare", kind: "object", label: "One order.", objects: [{ id: "o", name: "o1", class: "Order" }], links: [] }).svg;
  assert.match(obj, /class="name u-ul"/);
  assert.match(obj, /\.u-ul\{text-decoration:underline\}/);
  const cls = renderDiagram({ id: "abs", kind: "class", label: "An abstract shape.", classes: [{ id: "s", name: "Shape", abstract: true }], relations: [] }).svg;
  assert.match(cls, /\.u-it\{font-style:italic\}/);
});

test("wrong class and object data is refused", () => {
  const bad = (name, change, message) => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), message); };
  bad("class", (d) => (d.relations[0].multiplicity = ["1", "many"]), /not a UML multiplicity/);
  bad("class", (d) => (d.relations[0].multiplicity = ["1"]), /a list of two/);
  bad("class", (d) => (d.relations[3].to = "order"), /which is not an interface/);
  bad("class", (d) => (d.relations[3].type = "generalization", d.relations.push({ from: "payment", to: "card", type: "generalization" })), /a kind of itself/);
  bad("class", (d) => (d.classes[4].stereotype = "«interface»"), /without them/);
  bad("class", (d) => (d.relations[4].multiplicity = ["1", "1"]), /has no multiplicities or roles/);
  bad("class", (d) => (d.classes[0].attributes[0] = { text: "x", abstract: true }), /only an operation can be abstract/);
  bad("object", (d) => (d.objects[0].slots = ["email"]), /a slot gives a value/);
  bad("object", (d) => (d.links[0].to = "ana"), /to itself/);
});
