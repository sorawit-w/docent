// The UML marks, tested against a stored sheet of every mark. Run with UPDATE=1 to store a new sheet after a wanted change.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const uml = require("../skills/docent/scripts/lib/uml.cjs");

/** A sheet with every mark, in rows, to look at and to compare with the stored one. */
function sheet() {
  const { line, end, nodes, shapes, signs, styles } = uml;
  const id = "uml-marks";
  const out = [];
  // Row 1: each line end on a 60px line, solid and dashed.
  const ends = Object.keys(uml.END);
  ends.forEach((kind, i) => {
    const y = 24 + i * 24, a = [16, y], b = [96, y];
    out.push(line([a, b], { end: kind }) + end(kind, b, a));
    const c = [128, y], d = [208, y];
    out.push(line([c, d], { end: kind, dashed: true }) + end(kind, d, c));
  });
  // Row 2: the nodes.
  const row = 160;
  out.push(nodes.initial([24, row]), nodes.final([64, row]), nodes.flowFinal([104, row]), nodes.decision([152, row]), nodes.junction([192, row]), nodes.history([224, row]), nodes.history([260, row], true), nodes.bar([316, row], 48), nodes.bar([360, row], 32, true), nodes.cross([392, row]));
  // Row 3: the shapes.
  const top = 196;
  out.push(
    shapes.rounded({ x: 16, y: top, w: 72, h: 36 }),
    shapes.compartments({ x: 104, y: top, w: 72, h: 60 }, [top + 20, top + 40]),
    shapes.node({ x: 192, y: top, w: 72, h: 60 }),
    shapes.folder({ x: 288, y: top, w: 88, h: 60 }, 40),
    shapes.oval({ x: 392, y: top, w: 88, h: 36 }),
    shapes.note({ x: 496, y: top, w: 64, h: 40 }),
    shapes.send({ x: 16, y: top + 76, w: 72, h: 32 }),
    shapes.accept({ x: 104, y: top + 76, w: 72, h: 32 }),
    shapes.tab({ x: 192, y: top + 76, w: 40, h: 20 }),
  );
  // Row 4: the signs.
  out.push(signs.actor(272, top + 72), signs.component(304, top + 76), signs.artifact(336, top + 76), signs.port([368, top + 92]), signs.lollipop([400, top + 92], [1, 0]), signs.socket([472, top + 92], [1, 0]));
  const w = 576, h = 336;
  return `<svg id="${id}" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Every UML mark">\n<style>\n${styles(id)}\n</style>\n<rect width="${w}" height="${h}" fill="var(--fig,#f2f3f9)"/>\n${out.join("\n")}\n</svg>\n`;
}

test("the sheet of UML marks matches the stored one", () => {
  const svg = sheet();
  const file = path.join(__dirname, "expected", "uml-marks.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg);
  assert.equal(svg, fs.readFileSync(file, "utf8"), "uml-marks.svg changed; look at the sheet, then run with UPDATE=1");
});

test("a mark is filled in the text color or the page color, never ultramarine", () => {
  const css = uml.styles("x");
  assert.doesNotMatch(css, /primary|#2f3fd0|dot/i);
  assert.match(css, /\.u-ink\{fill:var\(--text,#1c1f2e\)\}/);
  assert.match(css, /\.u-face\{fill:var\(--bg,#fbfbfe\);stroke:var\(--text,#1c1f2e\)/);
  assert.doesNotMatch(sheet(), /fill="#|stroke="#|style="/, "a mark carries no color of its own; it takes the classes");
});

test("a UML line stops where its end mark starts, so it never shows inside a hollow mark", () => {
  const a = [0, 0], b = [100, 0];
  const at = (kind) => Number(uml.line([a, b], { end: kind }).match(/points="0,0 ([\d.]+),0"/)[1]);
  assert.equal(at("open"), 100, "an open head is two strokes; the line runs to the tip");
  assert.equal(at("filled"), 94, "a filled head covers the line's end");
  assert.equal(at("hollow"), 88, "the line stops at the base of a hollow triangle");
  assert.equal(at("diamond"), 84, "the line stops at the back corner of a diamond");
  assert.match(uml.line([a, b], { dashed: true }), /class="u-ln u-dash"/);
  assert.match(uml.end("diamond-filled", b, a), /class="u-face u-ink"/, "a filled diamond keeps the outline of a hollow one");
});

test("a UML line keeps a straight run of 28px behind its end mark", () => {
  assert.throws(() => uml.line([[0, 0], [39, 0]], { end: "hollow" }), /needs a straight run of 40px behind its hollow end; this one has 39px/);
  assert.throws(() => uml.line([[0, 0], [30, 0]], { end: "open" }), /needs a straight run of 36px behind its open end; this one has 30px/);
  assert.doesNotThrow(() => uml.line([[0, 0], [36, 0]], { end: "open" }));
  assert.throws(() => uml.end("arrow", [0, 0], [1, 0]), /"arrow" is not a UML line end/);
});

test("the key names only the marks a drawing uses, in plain sentences", () => {
  assert.equal(uml.keyHtml([]), "");
  const html = uml.keyHtml(["composition", "initial", "composition"]);
  assert.equal(html, "<p>Key to the marks:</p>\n<ul><li>A filled diamond: the whole at the diamond owns the part, and the part cannot exist without it.</li><li>A filled dot: where it starts.</li></ul>");
  assert.match(uml.keyHtml(["final"], { final: "A ring around a filled dot: the order is closed." }), /the order is closed/);
  assert.throws(() => uml.keyHtml(["teleport"]), /the mark "teleport" has no sentence in the key/);
  for (const [k, s] of Object.entries(uml.KEY)) {
    assert.match(s, /^[^a-z].*\.$/, `the sentence for ${k} starts with a capital or a symbol and ends with a full stop`);
    assert.ok(s.length <= 120, `the sentence for ${k} is short: ${s.length} characters`);
  }
});

test("a UML drawing takes every color from the page tokens, and ultramarine only for the current message and the dot", () => {
  const { renderDiagram } = require("../skills/docent/scripts/lib/diagram.cjs");
  for (const name of ["sequence", "sequence-uml", "activity", "state", "interaction-overview", "timing"]) {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
    const svg = renderDiagram(data).svg;
    const bare = svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, "");
    assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(/i, `${name}: no color outside a page token`);
    assert.doesNotMatch(bare, /(fill|stroke)="(?!none|currentColor)[^"]*"/, `${name}: no color written on an element`);
    assert.doesNotMatch(svg, /gradient|filter|shadow/i, `${name}: flat, no gradient or shadow`);
    for (const rule of svg.match(/[^{}\n]*\{[^{}]*var\(--(primary|dot),[^{}]*\}/g) || []) assert.match(rule, /is-current|pulse/, `${name}: ultramarine only marks the current message or the dot: ${rule}`);
  }
});
