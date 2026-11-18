// Package and profile diagrams: folders, one level of nesting, «import» and the like; stereotypes extending metaclasses.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));

for (const name of ["package", "profile"]) {
  test(`a ${name} diagram matches the stored drawing`, () => {
    const { svg, form } = renderDiagram(fixture(name));
    assert.equal(form, name);
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("a package that holds packages is a frame around them, and a dependency to it meets the frame's body", () => {
  const { scene } = renderDiagram(fixture("package"));
  assert.ok(scene.notes.some((n) => n.s === "Shop"), "the Shop frame carries its name");
  const [x, y, w] = [...scene.under[0].matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)][1].slice(1).map(Number); // the body of the folder
  for (const id of ["ordering", "catalog", "billing"]) { const p = scene.parts.find((q) => q.id === id); assert.ok(p.x > x && p.y > y && p.x + p.w < x + w, `${id} is inside Shop`); }
  assert.ok(!scene.parts.some((p) => p.id === "shop"), "Shop is a frame, not a folder of its own");
  const leg = scene.legs.find((l) => l.to === "util");
  assert.equal(leg.from, "group-shop");
  assert.deepEqual(leg.u, { end: "open", dashed: true });
  assert.deepEqual(scene.legs.map((l) => l.texts.map((t) => t.s).join()).sort(), ["«access»", "«import»", "«import»"]);
});

test("a profile draws stereotypes extending metaclasses with a filled triangle, and «apply» from the package that uses it", () => {
  const { svg, scene } = renderDiagram(fixture("profile"));
  const leg = (from, to) => scene.legs.find((l) => l.from === from && l.to === to);
  assert.deepEqual(leg("entity", "class").u, { end: "hollow-filled", dashed: false });
  assert.deepEqual(leg("applied-1", "the-profile").u, { end: "open", dashed: true });
  assert.ok(scene.parts.find((p) => p.id === "class").y < scene.parts.find((p) => p.id === "entity").y, "the metaclass stands above the stereotype");
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>The stereotype «Id» extends the metaclass Property; every Property must carry it\.<\/li>/);
  assert.match(words, /A solid line with a filled triangle/);
});

test("the words and the phone list of a package diagram", () => {
  const { svg, phone } = renderDiagram(fixture("package"));
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>The package Ordering, inside Shop, holds “Order”, “OrderLine”, “Cart”\.<\/li>/);
  assert.match(words, /<li>Ordering imports Catalog\.<\/li>/);
  assert.match(words, /«access»: the first package uses the public names of the second, but does not pass them on\./);
  assert.equal(phone.w, 264);
  const rows = phone.parts.filter((p) => p.id.includes("-row-")).map((p) => p.texts.map((t) => t.s).join(" "));
  assert.ok(rows.includes("«import» Shared utilities (all of Shop)"), rows.join(" | "));
});

test("wrong package and profile data is refused", () => {
  const bad = (name, change, message) => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), message); };
  bad("package", (d) => (d.packages[0].in = "util"), /nest one level deep|itself in a package/);
  bad("package", (d) => (d.packages[0].members = ["X"]), /holds packages and lists members/);
  bad("package", (d) => (d.dependencies[0].to = "shop"), /the package around it/);
  bad("package", (d) => (d.dependencies[0].type = "uses"), /must be one of import, access, merge, use/);
  bad("profile", (d) => d.metaclasses.push({ id: "op", name: "Operation" }), /no stereotype extends the metaclass "op"/);
  bad("profile", (d) => (d.extensions[0].to = "idst"), /which is not a metaclass/);
  bad("profile", (d) => (d.extensions = [d.extensions[1]]), /the stereotype "entity" extends no metaclass/);
});
