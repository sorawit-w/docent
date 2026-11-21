// Layouts to scale: where each part sits along one measured width, a 640px form for a desktop and paper, a 264px form for a phone.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const FONT = { row: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400] };

/** The box of a text in a scene, from its estimated width. */
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "middle" ? n.x - w / 2 : n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
const rectOf = (svg) => {
  const m = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
  return { x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4] };
};
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** The names of the boxes that stand above them, and the measures, in a scene. */
const above = (s) => s.notes.filter((n) => n.cls === "row").map((n) => n.s);
const measures = (s) => s.notes.filter((n) => n.cls === "val" && n.knock).sort((a, b) => a.x - b.x);

for (const name of ["layout-screen", "layout-a4"]) {
  test(`${name} matches the stored drawing`, () => {
    const { svg, form, warnings } = renderDiagram(fixture(name));
    assert.equal(form, "layout");
    assert.deepEqual(warnings, []);
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("a layout has a 640px form and a 264px phone form, one band per row, no dot, and its boxes as a table", () => {
  const { svg, scene, phone } = renderDiagram(fixture("layout-screen"));
  assert.equal(scene.w, 640);
  assert.equal(phone.w, 264);
  assert.equal(scene.bands.length, 4);
  assert.doesNotMatch(svg, /class="pulse|data-leg/, "nothing moves");
  assert.match(svg, /<th scope="col">Row<\/th><th scope="col">Box<\/th><th scope="col">From<\/th><th scope="col">To<\/th><th scope="col">Width<\/th>/);
  assert.match(svg, /<tr><th scope="row">A \(Tufte, chosen\)<\/th><td>Wide blocks<\/td><td>578<\/td><td>1698<\/td><td>1120<\/td><\/tr>/);
  assert.match(svg, /<p>All numbers are in px\.<\/p>/);
  assert.match(svg, /<li>A line at 960 px: the middle\.<\/li>/);
});

test("a name that does not fit in its box stands above it: Contents on a desktop, Notes and Contents on a phone", () => {
  const { scene, phone } = renderDiagram(fixture("layout-screen"));
  assert.deepEqual(above(scene), ["Contents"]);
  assert.deepEqual([...new Set(above(phone))].sort(), ["Contents", "Notes"]);
  // Each name above has a tick down to the left edge of its box.
  const contents = scene.parts.find((p) => p.id === "Contents");
  assert.match(contents.svg, /<path d="M[\d.]+,[\d.]+ V[\d.]+" class="tick"\/>/);
  assert.deepEqual(contents.texts, []);
});

test("a track-2 box sits under track 1 in its row", () => {
  const { scene } = renderDiagram(fixture("layout-screen"));
  const [text, wide] = ["Text", "Wide blocks"].map((n) => rectOf(scene.parts.find((p) => p.id === n).svg));
  assert.ok(wide.y0 >= text.y1 + 8, "track 2 starts 8px under track 1");
});

test("a measured row writes every stretch between box edges, and on a phone a crowded measure takes a second line", () => {
  const { scene, phone, svg } = renderDiagram(fixture("layout-a4"));
  assert.deepEqual(measures(scene).map((n) => n.s), ["18", "112", "8", "50", "4", "18"]);
  assert.equal(new Set(measures(scene).map((n) => n.y)).size, 1, "on a desktop every measure fits on one line");
  const last = measures(phone);
  assert.deepEqual(last.map((n) => n.s), ["18", "112", "8", "50", "4", "18"]);
  assert.ok(last[5].y > last[4].y, "the last 18 moves under the 4 on a phone");
  assert.ok(scene.notes.some((n) => n.s === "mm" && n.anchor === "end"), "the unit stands left of the measures on a desktop");
  assert.ok(phone.notes.some((n) => n.s === "in mm"), "and in the row's name line on a phone");
  assert.match(svg, /<li>A4 page, measured: 18, 112, 8, 50, 4 and 18 mm\.<\/li>/);
  assert.doesNotMatch(renderDiagram(fixture("layout-a4")).scene.notes.map((n) => n.s).join(" "), /\b0\b|210/, "no ticks on a scale with no step");
});

test("no text meets another text or a box it does not belong to, and every text stays inside the drawing, in both forms", () => {
  for (const name of ["layout-screen", "layout-a4"]) {
    const { scene, phone } = renderDiagram(fixture(name));
    for (const s of [scene, phone]) {
      const texts = [...s.notes, ...s.parts.flatMap((p) => p.texts)].map(box);
      for (const t of texts) assert.ok(t.x0 >= 0 && t.x1 <= s.w, `"${t.s}" runs past the drawing (${name}, ${s.w}px)`);
      texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => assert.ok(!meet(a, b), `"${a.s}" meets "${b.s}" (${name}, ${s.w}px)`)));
      for (const p of s.parts) {
        const r = rectOf(p.svg);
        for (const t of p.texts.map(box)) assert.ok(t.x0 >= r.x0 + 8 - 0.01 && t.x1 <= r.x1 - 8 + 0.01, `"${t.s}" stays inside its box (${name}, ${s.w}px)`);
        for (const t of s.notes.map(box)) assert.ok(!meet(t, r), `"${t.s}" meets the box "${p.id}" (${name}, ${s.w}px)`);
      }
      const rects = s.parts.map((p) => [p.id, rectOf(p.svg)]);
      rects.forEach(([a, ra], i) => rects.slice(i + 1).forEach(([b, rb]) => assert.ok(!meet(ra, rb), `the boxes "${a}" and "${b}" meet (${name}, ${s.w}px)`)));
    }
  }
});

test("wrong layout data is refused with a plain reason", () => {
  const bad = (name, change, reason) => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), reason); };
  bad("layout-screen", (d) => (d.rows = []), /1 to 6 rows; this one has 0/);
  bad("layout-screen", (d) => (d.rows = [...d.rows, ...d.rows]), /1 to 6 rows; this one has 8/);
  bad("layout-screen", (d) => (d.rows[0].boxes = []), /row 1 \("Now"\) has 0 boxes; a row has 1 to 6/);
  bad("layout-screen", (d) => (d.rows[0].name = "A name far too long"), /the name of row 1/);
  bad("layout-screen", (d) => (d.rows[0].boxes[0].to = 2000), /the box "Text" of row 1 \("Now"\) has "to": 2000; it must be a number on the scale, from 0 to 1920/);
  bad("layout-screen", (d) => (d.rows[0].boxes[0].to = 400), /the box "Text" of row 1 \("Now"\) ends before it starts/);
  bad("layout-screen", (d) => (d.rows[0].boxes[0].track = 3), /"track": 3; it must be 1 or 2/);
  bad("layout-screen", (d) => (d.rows[0].boxes[1].from = 890), /the boxes "Text" and "Notes" of row 1 \("Now"\) overlap on track 1/);
  bad("layout-screen", (d) => (d.rows[0].boxes = [d.rows[0].boxes[2]]), /has boxes on track 2 only/);
  bad("layout-screen", (d) => (d.rows[0].measure = "yes"), /"measure" in row 1 \("Now"\) must be true/);
  bad("layout-screen", (d) => (d.rows[0].boxes[1].to = 969), /the box "Notes" of the row "Now" is [\d.]+px wide on a phone; widen it/);
  bad("layout-screen", (d) => (d.place = "walk"), /a layout to scale sits in the text flow/);
  bad("layout-screen", (d) => (d.form = "wide"), /a layout to scale has no "form"/);
  bad("layout-a4", (d) => (d.rows[0].measure = undefined), /the scale has no "step", so the drawing has no ticks/);
  // Touching boxes are allowed.
  const touch = fixture("layout-screen");
  touch.rows[0].boxes[1].from = 896;
  assert.doesNotThrow(() => renderDiagram(touch));
});

test("names above that would need a third line are refused, and the message names the boxes", () => {
  const d = fixture("layout-a4");
  d.scale = { from: 0, to: 210, step: 30, unit: "mm" };
  d.rows[0].boxes = [{ name: "One", from: 0, to: 4 }, { name: "Two", from: 4, to: 8 }, { name: "Three", from: 8, to: 12 }];
  assert.throws(() => renderDiagram(d), /the names above the boxes "Two" and "Three" of the row "A4 page" need a third line on a desktop and on paper; shorten a name, or move a box to track 2/);
});

test("a layout where every row has one box gets a fit warning", () => {
  const d = fixture("layout-screen");
  d.rows.forEach((r) => (r.boxes = [r.boxes[0]]));
  assert.deepEqual(renderDiagram(d).warnings, ["every row has one box; a range chart says this more simply"]);
});

test("check accepts a layout that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, an A4 page" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture("layout-a4"), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>An A4 page.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace(">112<", ">113<")).errors.join("\n"), /\("a4-notes"\): the drawing does not match its data; run render/);
});

test("a layout takes every color from the page tokens, uses no ultramarine, and is flat", () => {
  const { svg } = renderDiagram(fixture("layout-screen"));
  const bare = svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, "");
  assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(/i, "no color outside a page token");
  assert.doesNotMatch(bare, /(fill|stroke)="(?!none|currentColor)[^"]*"/, "no color written on an element");
  assert.doesNotMatch(svg, /gradient|filter|shadow|stroke-dasharray/i, "flat, and nothing dashed");
  for (const rule of svg.match(/[^{}\n]*\{[^{}]*var\(--(primary|dot),[^{}]*\}/g) || []) assert.match(rule, /pulse/, `ultramarine only for a dot, and a layout draws none: ${rule}`);
});

test("edge cases from review: decimal measures without noise, a long phone note that wraps, and a tick that would cross a name", () => {
  // Measures and widths on a decimal scale with an offset keep only the digits that mean something.
  const dec = { id: "dec", kind: "layout", label: "Two small parts.", scale: { from: 100, to: 101, unit: "mm" }, rows: [{ name: "Strip", measure: true, boxes: [{ name: "A", from: 100.1, to: 100.2 }, { name: "B", from: 100.3, to: 100.4 }] }] };
  const drawn = renderDiagram(dec);
  assert.deepEqual(measures(drawn.scene).map((n) => n.s), ["0.1", "0.1", "0.1", "0.1", "0.6"]);
  assert.match(drawn.svg, /<td>100\.1<\/td><td>100\.2<\/td><td>0\.1<\/td>/);
  // A note that does not fit beside the row name wraps inside the phone form, also with the unit added.
  const long = fixture("layout-a4");
  long.rows[0].name = "一二三四五六七八九十一二三四五六";
  long.rows[0].note = "一二三四五六七八九十一二三四五六七八九十一二三";
  const { phone } = renderDiagram(long);
  for (const t of [...phone.notes, ...phone.parts.flatMap((p) => p.texts)].map(box)) assert.ok(t.x1 <= phone.w, `"${t.s}" runs past the phone form`);
  // The tick of a name on the upper line may not cross a name on the lower line.
  const crowd = { id: "crowd", kind: "layout", label: "Two narrow parts at the right edge.", scale: { from: 0, to: 100, step: 20 }, rows: [{ name: "Edge", boxes: [{ name: "Wide", from: 0, to: 80 }, { name: "Contents", from: 90, to: 95 }, { name: "Notes", from: 95, to: 100 }] }] };
  assert.throws(() => renderDiagram(crowd), /the tick of the name "Contents" would cross the name "Notes" above the boxes of the row "Edge" on a phone; shorten a name, or move a box to track 2/);
});

test("edge cases from review: the unit keeps clear of the row note, and the table in words keeps the notes", () => {
  const d = { id: "page", kind: "layout", label: "A page in two parts.", scale: { from: 0, to: 100, unit: "mm" }, rows: [{ name: "Page", note: "custom layout", measure: true, boxes: [{ name: "A", from: 0, to: 40 }, { name: "B", from: 60, to: 100 }] }] };
  const { scene, svg } = renderDiagram(d);
  const [note, unit] = ["custom layout", "mm"].map((s) => box(scene.notes.find((n) => n.s === s)));
  assert.ok(!meet(note, unit), "the unit does not meet the note");
  assert.match(svg, /<th scope="row">Page \(custom layout\)<\/th>/);
});
