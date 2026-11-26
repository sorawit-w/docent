// Where lines meet the sides of boxes in the UML kinds: clear of the corners, evenly spaced, never along a border.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");
const { layoutGraph, sideProblems, MARGIN } = require("../skills/docent/scripts/lib/graph.cjs");
const uml = require("../skills/docent/scripts/lib/uml.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const GRAPH = ["activity", "state", "interaction-overview", "usecase", "class", "object", "package", "profile", "component", "composite", "deployment", "communication"];

test("a component diagram with many interfaces matches the stored drawing", () => {
  const { svg } = renderDiagram(fixture("component-many"));
  const file = path.join(__dirname, "expected", "component-many.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "component-many.svg changed; look at the drawing, then run with UPDATE=1");
});

test("two lines on one side of a box sit symmetric around its middle, clear of the corners", () => {
  const { scene } = renderDiagram(fixture("component-many"));
  const web = scene.parts.find((p) => p.id === "web"), cy = web.y + web.h / 2;
  const left = scene.legs.flatMap((l) => [l.from === "web" ? l.pts[0] : null, l.to === "web" ? l.pts.at(-1) : null]).filter((p) => p && Math.abs(p[0] - web.x) < 0.5);
  assert.deepEqual(left.map((p) => p[1] - cy).sort((a, b) => a - b), [-12, 12], "the two lines on the left side of Web app are 12px above and below its middle");
  for (const [, y] of left) assert.ok(y - web.y >= MARGIN && web.y + web.h - y >= MARGIN, `the line at y=${y} keeps ${MARGIN}px from the corners`);
});

test("a box too short for its lines grows, and draws itself at the new size", () => {
  const box = { id: "a", w: 120, h: 40, grow: true, draw: (cx, cy, w = 120, h = 40) => ({ svg: uml.shapes.rounded({ x: cx - w / 2, y: cy - h / 2, w, h }), texts: [] }) };
  const s = layoutGraph({ nodes: [box], edges: [{ from: "a", to: "a", end: "open" }], groups: [] }, "test");
  const a = s.parts[0], [first, last] = [s.legs[0].pts[0], s.legs[0].pts.at(-1)];
  assert.equal(a.h, 48, "a 40px box grows to 48px so both ends of its loop keep clear of the corners");
  assert.match(a.svg, /height="48"/);
  assert.deepEqual([first[1] - a.y, last[1] - a.y], [12, 36]);
});

test("the side check names an end near a corner, ends too close or uneven, and a line along a border", () => {
  const node = { id: "n", i: 0, cx: 120, cy: 120, w: 120, h: 96 };
  const out = (ends, legs = []) => ({ placed: [node], rects: [], lead: [], groups: [], legs, ends: ends.map((a, k) => ({ key: "0:left", node: 0, side: "left", a, mid: false, k })) });
  assert.deepEqual(sideProblems(out([120])), [], "one line at the middle is fine");
  assert.deepEqual(sideProblems(out([108, 132])), [], "two lines 12px each side of the middle are fine");
  assert.match(sideProblems(out([160]))[0], /meets the left side of "n" 8px from a corner/);
  assert.match(sideProblems(out([108, 120])).join(), /less than 24px apart/);
  assert.match(sideProblems(out([120, 144])).join(), /not evenly spaced/, "the middle, then 24px below it, is not centered");
  assert.match(sideProblems(out([84, 108, 156])).join(), /not evenly spaced/, "gaps of 24px and 48px");
  assert.match(sideProblems(out([], [[[0, 172], [200, 172]]])).join(), /line 1 runs along the border of "n"/, "a run 4px under the bottom border");
  assert.deepEqual(sideProblems(out([], [[[0, 180], [200, 180]]])), [], "a run 12px under it is clear");
});

test("every stored UML drawing keeps its line ends clear of the corners and evenly spaced", () => {
  const names = fs.readdirSync(path.join(__dirname, "fixtures")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).filter((n) => GRAPH.includes(fixture(n).kind));
  assert.ok(names.length >= 13, `found ${names.length} UML fixtures`);
  // layoutGraph runs the side check on every drawing and throws when it cannot meet it, so drawing each one is the test.
  for (const n of names) assert.doesNotThrow(() => renderDiagram(fixture(n)), `${n} meets the side rules`);
});
