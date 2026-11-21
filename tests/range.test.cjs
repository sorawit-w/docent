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
  assert.equal(fmt(0.1 + 0.2), "0.3");
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
