// Range charts: values and ranges on one numeric scale, a 640px form for a desktop and paper, a 264px form for a phone.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { readScale, makeScale, placeLabel, valueWidth, fmt } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "range.json"), "utf8"));
const FONT = { row: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400] };

/** The box of a text in a scene, from its estimated width. */
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "middle" ? n.x - w / 2 : n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
/** The box of a mark, read from its SVG: a rect, a circle, or a path of M, H and V. */
const markBox = (svg) => {
  let m;
  if ((m = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/))) return { x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4] };
  if ((m = svg.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/))) return { x0: m[1] - m[3], y0: m[2] - m[3], x1: +m[1] + +m[3], y1: +m[2] + +m[3] };
  const xs = [], ys = [];
  for (const [, c, a, b] of svg.match(/d="([^"]*)"/)[1].matchAll(/([MHV])([\d.]+)(?:,([\d.]+))?/g)) {
    if (c === "M") xs.push(+a), ys.push(+b);
    else if (c === "H") xs.push(+a);
    else ys.push(+a);
  }
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

test("a range chart matches the stored drawing", () => {
  const { svg, form } = renderDiagram(fixture());
  assert.equal(form, "range");
  const file = path.join(__dirname, "expected", "range.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "range.svg changed; look at the drawing, then run with UPDATE=1");
});

test("a range chart has a 640px form and a 264px phone form, still, with one band per group and the rows as a table", () => {
  const { svg, scene, phone, warnings } = renderDiagram(fixture());
  assert.deepEqual(warnings, []);
  assert.equal(scene.w, 640, "the desktop and paper form fits an A4 figure well");
  assert.equal(phone.w, 264, "the phone form fits a 320px screen");
  for (const s of [scene, phone]) {
    assert.equal(s.legs.length, 0, "nothing moves in a range chart");
    assert.equal(s.parts.length, 8, "one mark per row");
    assert.equal(s.bands.length, 2, "one band per group");
  }
  assert.doesNotMatch(svg, /class="pulse/, "no dot");
  assert.match(svg, /@media \(max-width:736px\)\{#dg-line-lengths\{display:none\}#dg-line-lengths-phone\{display:block\}\}/,"the phone form shows below 640px plus the page room");
  assert.match(svg, /@media print\{#dg-line-lengths\{display:block!important\}#dg-line-lengths-phone\{display:none!important\}\}/, "paper prints the 640px form");
  const words = svg.split('<details class="dg-words">')[1];
  assert.match(words, /<th scope="col">Value, in characters<\/th><th scope="col">Group<\/th>/);
  assert.match(words, /<tr><th scope="row">Readers prefer<\/th><td>45–76<\/td><td>The evidence<\/td><\/tr>/);
  assert.match(words, /<tr><th scope="row">WCAG 1\.4\.8, AAA<\/th><td>up to 80<\/td>/);
  assert.match(words, /<tr><th scope="row">Docent on paper<\/th><td>52–64, computed<\/td><td>Docent<\/td><\/tr>/);
  assert.equal((words.match(/<tr>/g) || []).length, 9, "a head row and one row per data row");
});

test("each kind of row has its own mark, and a limit has no cap at the edge of the scale", () => {
  const d = fixture();
  d.rows.push({ name: "At least", from: 80, group: "docent" });
  const { scene } = renderDiagram(d);
  const svgs = scene.parts.map((p) => p.svg);
  assert.match(svgs[0], /^<rect [^>]*height="16" rx="4" class="r-bar"\/>$/, "a range is a bar");
  assert.match(svgs[1], /^<circle [^>]*r="5" class="r-pt"\/>$/, "a point is a filled circle");
  const [, x0, xt] = svgs[2].match(/^<path d="M([\d.]+),[\d.]+ H([\d.]+) M\2,[\d.]+ V[\d.]+" class="r-lim"\/>$/) || [];
  assert.ok(x0 && xt, `an upper limit is a line from the start of the scale and a cap at the limit: ${svgs[2]}`);
  assert.equal(+x0, scene.notes.find((n) => n.s === "40").x, "the line starts at the left edge of the scale, with no cap there");
  assert.match(svgs[8], /^<path d="M([\d.]+),[\d.]+ V[\d.]+ M\1,[\d.]+ H([\d.]+)" class="r-lim"\/>$/, "a lower limit is a cap at the limit and a line to the right edge");
  assert.ok(scene.notes.some((n) => n.s === "at least 80" && n.anchor === "end"), "its value stands on the side of the cap");
});

test("no text meets another text or a mark, and every text stays inside the drawing, in both forms", () => {
  const d = fixture();
  d.scale.marks = [{ at: 66, name: "Docent's aim" }];
  for (const s of [renderDiagram(d).scene, renderDiagram(d).phone]) {
    const texts = s.notes.map(box), marks = s.parts.map((p) => markBox(p.svg));
    for (const t of texts) assert.ok(t.x0 >= 0 && t.x1 <= s.w, `"${t.s}" runs past the drawing (${s.w}px)`);
    texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => assert.ok(!meet(a, b), `"${a.s}" meets "${b.s}" (${s.w}px)`)));
    for (const t of texts) for (const m of marks) assert.ok(!meet(t, m), `"${t.s}" meets a mark (${s.w}px)`);
  }
});

test("tick labels stand at least 48px apart: every tick on a desktop, every second on a phone", () => {
  const { scene, phone } = renderDiagram(fixture());
  const ticks = (s) => s.notes.filter((n) => n.cls === "val" && n.y === s.notes.find((m) => m.s === "40").y);
  assert.deepEqual(ticks(scene).map((n) => n.s), ["40", "50", "60", "70", "80", "90", "100"]);
  assert.deepEqual(ticks(phone).map((n) => n.s), ["40", "60", "80", "100"]);
  for (const s of [scene, phone]) ticks(s).forEach((t, i, all) => i && assert.ok(t.x - all[i - 1].x >= 48));
  assert.equal(phone.tracks.filter((t) => t[0] === ticks(phone)[1].x).length, 8, "on a phone each row's strip has its grid lines");
});

test("a value with no room beside its mark goes to the other side, or on a line above it", () => {
  const d = fixture();
  d.rows[0] = { name: "Readers prefer", from: 70, to: 100, note: "every source", group: "evidence" };
  d.rows[2] = { name: "A literature review", to: 98, note: "a long note", group: "evidence" };
  const plain = renderDiagram(fixture()).scene;
  const { scene } = renderDiagram(d);
  assert.equal(scene.notes.find((n) => n.s === "70–100, every source").anchor, "end", "a range at the end of the scale has its value on the left");
  const above = scene.notes.find((n) => n.s === "up to 98, a long note");
  assert.equal(above.anchor, "start");
  assert.equal(scene.h - plain.h, 16, "the row grows by one line for a value above its mark");
});

test("a named mark is a muted line in each band, with its name over the ticks, and a line in words", () => {
  const d = fixture();
  d.scale.marks = [{ at: 60, name: "a good length" }];
  const { svg, scene } = renderDiagram(d);
  const x = scene.notes.find((n) => n.s === "60").x;
  assert.equal(scene.under.filter((u) => u.includes('class="r-ref"') && u.includes(`x1="${Math.round(x * 100) / 100}"`)).length, 2, "one line in each band");
  assert.ok(!scene.tracks.some((t) => t[0] === x), "no grid line under the mark's line");
  assert.ok(scene.notes.find((n) => n.s === "a good length").y < scene.notes.find((n) => n.s === "60").y, "the name stands above the ticks");
  assert.match(svg, /<li>A line at 60 characters: a good length\.<\/li>/);
});

test("the scale maps numbers to pixels, keeps ticks apart, and finds a free place for a label", () => {
  const scale = readScale({ from: 0, to: 1920, step: 480, unit: "px" }, { needStep: true });
  const sc = makeScale(scale, 100, 580);
  assert.equal(sc.per, 0.25);
  assert.equal(sc.x(960), 340);
  assert.deepEqual(sc.ticks.map((t) => t.label), ["0", "480", "960", "1440", "1920"]);
  assert.deepEqual(makeScale(readScale({ from: 0, to: 20, step: 1 }, { needStep: true }), 0, 200).ticks.map((t) => t.label), ["0", "5", "10", "15", "20"], "every fifth tick when every second is still too close");
  assert.deepEqual(readScale({ from: 0, to: 210, unit: "mm" }, { needStep: false }).count, 0, "a scale may have no step, and then no ticks");
  assert.equal(fmt(1000000000000011), "1000000000000011", "every digit of the author's value stays");
  assert.deepEqual(makeScale(readScale({ from: 0, to: 0.3, step: 0.1 }, { needStep: true }), 0, 600).ticks.map((t) => t.label), ["0", "0.1", "0.2", "0.3"], "a tick drops the noise of the sum (0.1 + 0.2)");
  assert.equal(fmt(-5), "−5", "a minus sign, not a hyphen");
  assert.deepEqual(placeLabel({ a: 10, b: 100, w: 40, lo: 0, hi: 200, sides: ["inside", "right"] }), { x: 55, anchor: "middle", side: "inside" });
  assert.deepEqual(placeLabel({ a: 60, b: 180, w: 40, lo: 0, hi: 200, sides: ["right", "left"] }), { x: 52, anchor: "end", side: "left" });
  assert.equal(placeLabel({ a: 10, b: 180, w: 40, lo: 0, hi: 200, sides: ["right"] }).side, "above");
  assert.equal(placeLabel({ a: 10, b: 180, w: 400, lo: 0, hi: 200, sides: ["right"] }), null, "no place at all");
});

test("a range chart with two rows gets a fit warning", () => {
  const d = fixture();
  d.groups = undefined;
  d.rows = d.rows.slice(0, 2).map(({ group, ...r }) => r);
  assert.match(renderDiagram(d).warnings.join(), /the range chart has 2 rows; a sentence says this more simply/);
});

test("wrong range data is refused with a plain reason", () => {
  const bad = (change, reason) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), reason); };
  bad((d) => (d.scale.step = undefined), /"scale" must be an object with the numbers "from" and "to" and "step"|needs a "step"/);
  bad((d) => (d.scale = { from: 0, to: 100, step: 1 }), /the scale has 100 steps; a scale chart has at most 20/);
  bad((d) => (d.scale.to = 40), /"scale" must run forward/);
  bad((d) => (d.scale.step = 7), /a whole number of steps/);
  bad((d) => (d.rows[0].to = 120), /row 1 \("Readers prefer"\) has "to": 120; it must be a number on the scale, from 40 to 100/);
  bad((d) => (d.rows[0].at = 50), /has "at" and also "from" or "to"/);
  bad((d) => (d.rows[0].to = 45), /starts and ends at 45; write it as a point/);
  bad((d) => (d.rows[0].to = 44), /ends before it starts/);
  bad((d) => (d.rows[1] = { name: "Nothing", group: "evidence" }), /row 2 \("Nothing"\) has no numbers/);
  bad((d) => (d.rows[0].group = "docent"), /the rows of the group "docent" do not stand together/);
  bad((d) => (d.rows[0].group = "other"), /names the group "other", which does not exist/);
  bad((d) => delete d.rows[0].group, /names no group/);
  bad((d) => d.groups.push({ id: "spare", name: "Spare" }), /the group "spare" has no rows/);
  bad((d) => (d.rows = d.rows.slice(0, 1)), /2 to 12 rows/);
  bad((d) => (d.rows[6].to = 64), /the range 63–64 is [\d.]+px wide on a phone; write it as a point/);
  bad((d) => (d.rows[2] = { name: "Too low", to: 40, group: "evidence" }), /sits at the start of the scale/);
  bad((d) => (d.place = "walk"), /a range chart sits in the text flow/);
  bad((d) => (d.form = "wide"), /a range chart has no "form"/);
  bad((d) => (d.scale.marks = [{ at: 60, name: "one" }, { at: 61, name: "two" }]), /the names of the marks "one" and "two" meet/);
});

test("check accepts a range chart that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, line lengths" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Line lengths.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace(">45–76<", ">45–80<")).errors.join("\n"), /\("line-lengths"\): the drawing does not match its data; run render/);
});

test("a range chart takes every color from the page tokens, uses no ultramarine, and is flat", () => {
  const d = fixture();
  d.scale.marks = [{ at: 66, name: "Docent's aim" }];
  const { svg } = renderDiagram(d);
  const bare = svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, "");
  assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(/i, "no color outside a page token");
  assert.doesNotMatch(bare, /(fill|stroke)="(?!none|currentColor)[^"]*"/, "no color written on an element");
  assert.doesNotMatch(svg, /gradient|filter|shadow|stroke-dasharray/i, "flat, and nothing dashed");
  for (const rule of svg.match(/[^{}\n]*\{[^{}]*var\(--(primary|dot),[^{}]*\}/g) || []) assert.match(rule, /pulse/, `ultramarine only for a dot, and a range chart draws none: ${rule}`);
});

test("every text stands inside the drawing: a long unit, a small first tick on a phone, and a heading with no spaces", () => {
  const inside = (s) => s.notes.forEach((n) => { const b = box(n); assert.ok(b.x0 >= 0 && b.x1 <= s.w, `"${n.s}" runs from ${b.x0.toFixed(1)} to ${b.x1.toFixed(1)} in a ${s.w}px drawing`); });
  const base = { id: "edge", kind: "range", label: "Edges of the drawing." };
  const unit = renderDiagram({ ...base, scale: { from: 0, to: 100, step: 25, unit: "milliseconds" }, rows: [{ name: "A", from: 10, to: 40 }, { name: "B", at: 50 }, { name: "C", to: 80 }] });
  const small = renderDiagram({ ...base, scale: { from: -0.0001, to: 0.0001, step: 0.0001 }, rows: [{ name: "A", at: 0 }, { name: "B", from: -0.0001, to: 0.00005 }] });
  const heading = renderDiagram({ ...base, scale: { from: 0, to: 10, step: 5 }, groups: [{ id: "g", name: "用户体验研究与无障碍设计相关参考标准" }], rows: [{ name: "A", at: 2, group: "g" }, { name: "B", at: 6, group: "g" }] });
  for (const r of [unit, small, heading]) for (const s of [r.scene, r.phone]) inside(s);
});

test("a tick on a scale with decimals shows its value without floating-point noise", () => {
  const { scene } = renderDiagram({ id: "noise", kind: "range", label: "Ticks with decimals.", scale: { from: -0.35, to: 0.07, step: 0.07 }, rows: [{ name: "A", at: 0 }, { name: "B", at: -0.21 }] });
  const labels = scene.notes.filter((n) => n.cls === "val" && !n.knock).map((n) => n.s);
  assert.deepEqual(labels, ["−0.35", "−0.28", "−0.21", "−0.14", "−0.07", "0", "0.07"]);
});

test("a scale of very small values keeps one tick for each step", () => {
  const { scene } = renderDiagram({ id: "tiny", kind: "range", label: "A tiny scale.", scale: { from: 0, to: 4e-21, step: 1e-21 }, rows: [{ name: "A", at: 1e-21 }, { name: "B", at: 3e-21 }] });
  const ticks = scene.notes.filter((n) => n.cls === "val" && !n.knock);
  assert.deepEqual(ticks.map((n) => n.s), ["0", "1e-21", "2e-21", "3e-21", "4e-21"]);
  assert.equal(new Set(ticks.map((n) => Math.round(n.x))).size, 5, "the ticks stand apart");
});

test("a scale with a large offset keeps its ticks in place and writes each value in full", () => {
  const { scene } = renderDiagram({ id: "offset", kind: "range", label: "A large offset.", scale: { from: 1700000000001, to: 1700000000005, step: 1 }, rows: [{ name: "A", at: 1700000000002 }, { name: "B", from: 1700000000003, to: 1700000000004 }] });
  const ticks = scene.notes.filter((n) => n.cls === "val" && !n.knock);
  assert.deepEqual(ticks.map((n) => n.s), ["1700000000001", "1700000000002", "1700000000003", "1700000000004", "1700000000005"]);
  ticks.forEach((n, i) => { assert.ok(n.x > 0 && n.x < scene.w, `tick ${n.s} stands inside the drawing`); if (i) assert.ok(n.x > ticks[i - 1].x); });
  assert.ok(scene.notes.some((n) => n.knock && n.s === "1700000000002"), "a row's value is written in full too");
});

test("a 16-digit value keeps its last digit in the ticks, the labels and the table", () => {
  const { readRange, layoutRange, wordsOf } = require("../skills/docent/scripts/lib/range.cjs");
  const scale = readScale({ from: 1000000000000010, to: 1000000000000014, step: 1 }, { needStep: true });
  assert.deepEqual(makeScale(scale, 0, 2000).ticks.map((t) => t.label), ["1000000000000010", "1000000000000011", "1000000000000012", "1000000000000013", "1000000000000014"]);
  // A phone has no room for 16-digit tick labels, so only the desktop form is drawn here.
  const model = readRange({ id: "long", kind: "range", label: "Sixteen digits.", scale: { from: 1000000000000010, to: 1000000000000014, step: 1 }, rows: [{ name: "A", at: 1000000000000011 }, { name: "B", from: 1000000000000012, to: 1000000000000013 }] });
  assert.ok(layoutRange(model).notes.some((n) => n.knock && n.s === "1000000000000011"), "the row's label");
  const words = wordsOf(model);
  assert.match(words, /1000000000000011/, "the table in words");
  assert.match(words, /1000000000000013/);
});

test("edge cases from review: a long first label with no unit, a Thai name on a phone, and a scale past 100 decimals", () => {
  const inside = (s) => s.notes.forEach((n) => { const b = box(n); assert.ok(b.x0 >= 0 && b.x1 <= s.w, `"${n.s}" runs from ${b.x0.toFixed(1)} to ${b.x1.toFixed(1)}`); });
  const base = { id: "edge2", kind: "range", label: "Edge cases." };
  // Labels of 16 characters fit the 640px form, but no two of them stand apart on the 264px phone form, so the chart is refused.
  assert.throws(() => renderDiagram({ ...base, scale: { from: 1.00000000000001, to: 5.00000000000001, step: 1 }, rows: [{ name: "A", at: 2.00000000000001 }, { name: "B", at: 4.00000000000001 }] }), /no two tick labels stand apart/);
  const thai = renderDiagram({ ...base, scale: { from: 0, to: 10, step: 5 }, rows: [{ name: "กิ".repeat(10), at: 2 }, { name: "B", at: 6 }] });
  const lines = thai.phone.notes.filter((n) => n.cls === "row").map((n) => n.s);
  assert.ok(lines.length > 2, "the long Thai name wraps");
  for (const line of lines) assert.ok(!/^\p{M}/u.test(line), `a line starts with a vowel mark: "${line}"`);
  const tiny = renderDiagram({ ...base, scale: { from: 0, to: 4e-101, step: 1e-101 }, rows: [{ name: "A", at: 1e-101 }, { name: "B", at: 3e-101 }] });
  assert.deepEqual(tiny.scene.notes.filter((n) => n.cls === "val" && !n.knock).map((n) => n.s), ["0", "1e-101", "2e-101", "3e-101", "4e-101"]);
});

test("tick labels wider than the scale are refused with a plain reason, not drawn on top of each other", () => {
  assert.throws(() => renderDiagram({ id: "wide-ticks", kind: "range", label: "Wide ticks.", scale: { from: 1.00000000000001, to: 5.00000000000001, step: 0.2 }, rows: [{ name: "A", at: 2.00000000000001 }, { name: "B", at: 4.00000000000001 }] }), /no two tick labels stand apart/);
});

test("the first and the last tick are the scale's own from and to, even when they are tiny", () => {
  const { scene } = renderDiagram({ id: "ends", kind: "range", label: "Tiny ends.", scale: { from: 1e-120, to: 4e-101, step: 1e-101 }, rows: [{ name: "A", at: 1e-120 }, { name: "B", at: 3e-101 }] });
  const ticks = scene.notes.filter((n) => n.cls === "val" && !n.knock).map((n) => n.s);
  assert.equal(ticks[0], "1e-120"); assert.equal(ticks[ticks.length - 1], "4e-101");
});

const tickLabels = (scale) => makeScale(readScale(scale, { needStep: true }), 0, 2000).ticks.map((t) => t.label);
test("a tick near 0 on a tiny scale keeps its real value", () => {
  const ticks = tickLabels({ from: -2.0000000001e-101, to: 1.9999999999e-101, step: 1e-101 });
  assert.ok(ticks.includes("−1e-111"), `the middle tick is about -1e-111, not 0: ${ticks.join(", ")}`);
});

test("tick spacing never skips past the last step, and a real offset near 0 keeps its value", () => {
  const third = renderDiagram({ id: "third", kind: "range", label: "Thirds.", scale: { from: 0, to: 1, step: 1 / 3 }, rows: [{ name: "A", at: 0.5 }, { name: "B", at: 0.9 }] });
  for (const s of [third.scene, third.phone]) assert.ok(s.notes.filter((n) => n.cls === "val" && !n.knock).length >= 2, "at least two ticks give the reader a scale");
  const ticks = tickLabels({ from: -0.99999999999999, to: 1.00000000000001, step: 1 });
  assert.ok(ticks.includes("1e-14"), `the middle tick is 1e-14, not 0: ${ticks.join(", ")}`);
});

test("only the kept tick labels are measured: short end labels fit even when the middle ones are long", () => {
  const { phone } = renderDiagram({ id: "thirds-small", kind: "range", label: "Small thirds.", scale: { from: -0.00001, to: 0, step: 0.00001 / 3 }, rows: [{ name: "A", at: -0.000005 }, { name: "B", at: -0.000002 }] });
  assert.deepEqual(phone.notes.filter((n) => n.cls === "val" && !n.knock).map((n) => n.s), ["−0.00001", "0"]);
});

test("every kept tick label stands inside the drawing, and a scale that is not a whole number of tiny steps is refused", () => {
  const { scene, phone } = renderDiagram({ id: "long-middle", kind: "range", label: "Long middle labels.", scale: { from: -0.000009, to: -0.000008, step: 0.000001 / 11 }, rows: [{ name: "A", at: -0.0000085 }, { name: "B", at: -0.0000082 }] });
  for (const s of [scene, phone]) s.notes.filter((n) => n.cls === "val" && !n.knock).forEach((n) => { const b = box(n); assert.ok(b.x0 >= 0 && b.x1 <= s.w, `"${n.s}" runs from ${b.x0.toFixed(1)} to ${b.x1.toFixed(1)}`); });
  assert.throws(() => readScale({ from: 0, to: 2.4e-21, step: 1e-21 }, { needStep: true }), /a whole number of steps/);
});

test("a scale with rounded endpoints is a whole number of steps, and a scale near the largest number keeps its ticks", () => {
  assert.doesNotThrow(() => readScale({ from: 2000000.1, to: 2000000.2, step: 0.1 }, { needStep: true }));
  assert.deepEqual(tickLabels({ from: 0, to: 1.6e308, step: 4e307 }), ["0", "4e+307", "8e+307", "1.2e+308", "1.6e+308"]);
});

test("a step larger than the scale is refused, and a tick label never moves past the error of its arithmetic", () => {
  assert.throws(() => readScale({ from: 0, to: 10, step: 1e12 }, { needStep: true }), /at least one step/);
  const d = 2 ** -46;
  const middle = tickLabels({ from: -1, to: 1 + 2 * d, step: 1 + d })[1];
  assert.ok(Math.abs(Number(middle.replace("−", "-")) - (-1 + (1 + d))) <= 4 * 2 * Number.EPSILON, `the middle tick ${middle} stays within the error`);
});

test("each end of the scale leaves room for its own label, so a long first label does not shorten the other end", () => {
  const { phone } = renderDiagram({ id: "long-first", kind: "range", label: "A long first label.", scale: { from: -0.0000100000000000001, to: 0, step: 0.0000100000000000001 }, rows: [{ name: "A", at: -0.000005 }, { name: "B", at: -0.000002 }] });
  assert.equal(phone.notes.filter((n) => n.cls === "val" && !n.knock).length, 2);
});

test("endpoints whose rounding is more than 1% of a step are refused", () => {
  // Refused either as too small a step for its numbers, or as not a whole number of steps.
  assert.throws(() => readScale({ from: 99999999.999999, to: 100000000, step: 4.5e-7 }, { needStep: true }), /too small for numbers this large|a whole number of steps/);
  assert.doesNotThrow(() => readScale({ from: 2000000.1, to: 2000000.2, step: 0.1 }, { needStep: true }));
});

test("a step too small for the size of its numbers is refused, because the labels could not tell the ticks apart", () => {
  assert.throws(() => readScale({ from: 1e21, to: 1e21 + 1048576, step: 262144 }, { needStep: true }), /too small for numbers this large/);
});

test("a large offset is refused only when two tick labels would be the same", () => {
  assert.doesNotThrow(() => readScale({ from: 10000000000000, to: 10000000000004, step: 1 }, { needStep: true }));
});

test("a scale with far too many steps is refused at once by the step limit", () => {
  assert.throws(() => readScale({ from: 0, to: 4294967296, step: 1 }, { needStep: true }), /at most 20/);
});
