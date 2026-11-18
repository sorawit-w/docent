// Timing diagrams: state lines over a time axis, messages at a moment, and duration constraints.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "timing.json"), "utf8"));

test("a timing diagram matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "timing");
  const file = path.join(__dirname, "expected", "timing.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "timing.svg changed; look at the drawing, then run with UPDATE=1");
});

test("each lifeline has one step line, each message an arrow, and the words follow time", () => {
  const { svg, scene, phone } = renderDiagram(fixture());
  assert.equal(scene.parts.length, 3, "one state line per lifeline");
  assert.equal(scene.legs.length, 2, "one arrow per message");
  assert.ok(scene.legs.every((l) => l.still), "nothing moves in a timing diagram");
  assert.ok(phone && phone.w === 264, "the phone form is a 264px table");
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li>At 0 s: User is Idle\. Controller is Ready\. Door is Closed\.<\/li>/);
  assert.match(words, /<li>At 1 s: User sends “press” to Controller\. User becomes Waiting\. Controller becomes Busy\.<\/li>/);
  assert.match(words, /From 1 s to 4 s, Door keeps the constraint \{≤ 3 s\}\./);
  assert.match(words, /a message from one lifeline to another at that moment/);
});

test("message verbs keep clear of lines and other texts", () => {
  const { scene } = renderDiagram(fixture());
  const verbs = scene.notes.filter((n) => n.cls === "verb");
  assert.equal(verbs.length, 2);
  for (const v of verbs) for (const t of scene.tracks) {
    if (t[1] !== t[3]) continue; // only level guide lines
    assert.ok(Math.abs(v.y - 4 - t[1]) > 6 || v.x > t[2] || v.x < t[0], `“${v.s}” sits on a guide line`);
  }
});

test("wrong timing data is refused", () => {
  const bad = (change, message) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), message); };
  bad((d) => (d.time.step = 0), /"time" must run forward/);
  bad((d) => (d.time = { from: 0, to: 100, step: 1 }), /at most 24/);
  bad((d) => (d.changes[0].at = 0.5), /has no state at 0/);
  bad((d) => (d.changes[1].state = "Open"), /which is not one of its states/);
  bad((d) => (d.changes[2].state = "Waiting"), /changes to the state it is already in/);
  bad((d) => (d.messages[0].to = "user"), /goes from "user" to itself/);
  bad((d) => (d.messages[0].at = 11), /must be a number from 0 to 10/);
  bad((d) => (d.lifelines[0].states = ["Only"]), /2 to 6 "states"/);
});
