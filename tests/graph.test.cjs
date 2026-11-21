// The graph layout of the UML kinds: rows, groups that own their columns, lines on the lattice, labels, the same result every time.
const test = require("node:test");
const assert = require("node:assert/strict");
const { layoutGraph, layoutColumnGraph, wrap } = require("../skills/docent/scripts/lib/graph.cjs");
const uml = require("../skills/docent/scripts/lib/uml.cjs");

const box = (id, group, extra = {}) => ({ id, w: 96, h: 40, group, draw: (cx, cy) => ({ svg: uml.shapes.rounded({ x: cx - 48, y: cy - 20, w: 96, h: 40 }), texts: [] }), ...extra });

test("a graph is laid out the same every time, on the 12px lattice", () => {
  const g = () => ({ nodes: ["a", "b", "c", "d", "e"].map((id) => box(id)), edges: [{ from: "a", to: "b", end: "open" }, { from: "a", to: "c", end: "open", labels: [{ s: "[no]" }] }, { from: "b", to: "d", end: "hollow" }, { from: "c", to: "d", end: "diamond" }, { from: "d", to: "a", end: "open" }, { from: "d", to: "e" }], groups: [] });
  const one = layoutGraph(g(), "test"), two = layoutGraph(g(), "test");
  assert.deepEqual(one, two);
  for (const leg of one.legs) for (const [x, y] of leg.pts.slice(1, -1)) assert.ok(x % 12 === 0 && y % 12 === 0, `a bend sits on the lattice: ${x},${y}`);
  const y = (id) => one.parts.find((p) => p.id === id).y;
  assert.ok(y("a") < y("b") && y("b") < y("d") && y("d") < y("e"), "each node sits below the nodes that lead to it");
});

test("a line that points up puts its end above its start", () => {
  const s = layoutGraph({ nodes: [box("child"), box("parent")], edges: [{ from: "child", to: "parent", end: "hollow", up: true }], groups: [] }, "test");
  const [c, p] = ["child", "parent"].map((id) => s.parts.find((q) => q.id === id));
  assert.ok(p.y < c.y, "the parent is above the child");
  assert.equal(s.legs[0].pts.at(-1)[1], p.y + p.h, "the hollow triangle sits on the parent's lower side");
});

test("a group owns its columns, so its frame holds only its own nodes", () => {
  const s = layoutGraph({ nodes: [box("a", "g"), box("b"), box("c", "g"), box("d")], edges: [{ from: "a", to: "b", end: "open" }, { from: "b", to: "c", end: "open" }, { from: "c", to: "d", end: "open" }], groups: [{ id: "g", name: "Group", kind: "box" }] }, "test");
  const [x, y, w, h] = s.under[0].match(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
  for (const p of s.parts) {
    const inside = p.x >= x && p.x + p.w <= x + w && p.y >= y && p.y + p.h <= y + h;
    assert.equal(inside, ["a", "c"].includes(p.id), `"${p.id}" is ${inside ? "inside" : "outside"} the frame`);
  }
});

test("the column form wraps long rows to fit a phone", () => {
  assert.deepEqual(wrap("back to the join after Pack the items", "name", 140), ["back to the join", "after Pack the", "items"]);
  const s = layoutColumnGraph([{ node: box("a"), rows: [{ end: "open", label: "[a long guard here]", target: "to a node with a very long name indeed" }] }, { node: box("b"), rows: [] }], "test");
  assert.equal(s.w, 264);
});
