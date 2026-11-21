// Component, composite structure and deployment diagrams: balls and sockets, ports on a frame, nodes as 3D boxes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const broken = (name, change, message) => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), message); };

for (const name of ["component", "composite", "deployment"]) {
  test(`a ${name} diagram matches the stored drawing`, () => {
    const { svg, form } = renderDiagram(fixture(name));
    assert.equal(form, name);
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("an interface is a ball on a line from its provider, and each user holds it in a socket", () => {
  const { svg, scene } = renderDiagram(fixture("component"));
  const leg = (from, to) => scene.legs.find((l) => l.from === from && l.to === to);
  assert.deepEqual(leg("orders", "stock-check").u, { end: "socket", dashed: false });
  assert.deepEqual(leg("stock-check", "stock").u, { end: null, dashed: false });
  assert.deepEqual(leg("order-api", "frame_backend").u, { end: null, dashed: false, port: "end" }, "the back end offers OrderAPI at a port");
  assert.deepEqual(leg("frame_backend", "orders").u, { end: "open", dashed: false, port: "start" }, "the delegation leaves a port on the frame");
  const orders = scene.parts.find((p) => p.id === "orders"), deleg = leg("frame_backend", "orders");
  assert.ok(deleg.pts.every(([x, y]) => x >= deleg.pts[0][0] - 1e-6 || y > orders.y - 1), "the delegation stays inside the frame");
  assert.ok(scene.legs.every((l) => l.still), "a structural diagram has no dot");
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>The interface OrderAPI: Back end offers it at the port api, and Web shop needs it\.<\/li>/);
  assert.match(words, /A half circle around a ball/);
});

test("a part is named role : Type [multiplicity], and a port sits on the frame with its name", () => {
  const { svg, scene } = renderDiagram(fixture("composite"));
  assert.match(svg, />w : Wheel \[4\]</);
  const leg = scene.legs.find((l) => l.from === "classifier_frame");
  assert.equal(leg.to, "engine");
  assert.equal(leg.u.port, "start");
  assert.equal(leg.texts[0].s, "fuel");
  const p = leg.pts[0], t = leg.texts[0];
  assert.ok(Math.hypot(t.x - p[0], t.y - p[1]) < 40, "the port's name is next to its square");
});

test("a deployment draws nodes as 3D boxes; a node at the top holds its artifacts, and one inside lists them", () => {
  const { svg, scene } = renderDiagram(fixture("deployment"));
  assert.ok(!scene.parts.some((p) => p.id === "server"), "the App server is a frame");
  assert.ok(scene.parts.some((p) => p.id === "jvm") && !scene.parts.some((p) => p.id === "shop-jar"), "the JVM lists shop.jar by name");
  assert.ok(scene.parts.some((p) => p.id === "app-apk"), "the phone holds shop.apk as a box");
  assert.deepEqual(scene.legs.find((l) => l.from === "app-apk").u, { end: "open", dashed: true });
  assert.match(svg, />«executionEnvironment»</);
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>The execution environment JVM, inside App server, runs shop\.jar\.<\/li>/);
  assert.match(words, /<li>Phone talks to App server over HTTPS\.<\/li>/);
});

test("ids from the data never meet the ids the renderer makes", () => {
  const d = fixture("component");
  d.components.push({ id: "frame-backend", name: "Look-alike" });
  d.dependencies.push({ from: "web", to: "frame-backend" });
  const { scene } = renderDiagram(d);
  assert.equal(scene.legs.find((l) => l.from === "web" && l.to === "frame-backend").to, "frame-backend");
});

test("the data is checked, and each error says what to change", () => {
  broken("component", (d) => (d.components[2].in = "stock"), /components nest one level deep|which is itself in a component/);
  broken("component", (d) => d.interfaces.push({ id: "x", name: "X" }), /has no "provider" and no "users"/);
  broken("component", (d) => (d.interfaces[1].users = ["stock"]), /both offers and needs/);
  broken("component", (d) => (d.delegations[0].to = "web"), /not inside it/);
  broken("component", (d) => d.interfaces.push({ id: "y", name: "Y", users: ["web"], port: "p" }), /a port sits on the component that offers/);
  broken("composite", (d) => (d.parts[0].multiplicity = "lots"), /is not a UML multiplicity/);
  broken("composite", (d) => d.ports.push({ id: "spare", name: "spare" }), /the port "spare" has no connector/);
  broken("composite", (d) => d.connectors.push({ from: "fuel", to: "fuel" }), /to itself/);
  broken("deployment", (d) => (d.nodes[0].type = "phone"), /must be one of device, executionEnvironment, node/);
  broken("deployment", (d) => (d.manifests[0].artifact = "shop-jar"), /lists by name/);
  broken("deployment", (d) => (d.manifests = []), /has no «manifest» line/);
  broken("deployment", (d) => d.paths.push({ from: "jvm", to: "server" }), /the node around it/);
});
