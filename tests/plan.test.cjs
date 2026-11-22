// Plans: boxes placed on both axes, as a grid of named areas, a 640px form for a desktop and paper, a 264px form for a phone.
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
const rect = (s, id) => rectOf(s.parts.find((p) => p.id === id).svg);
/** The width of each column, from the boxes that lie in one column: a cell is its box and the 2px on each side. */
const cell = (s, id) => Math.round(rect(s, id).x1 - rect(s, id).x0 + 4);
const head = (s) => s.notes.find((n) => n.cls === "sub").s;
const lines = (s, id) => s.parts.find((p) => p.id === id).texts.filter((t) => t.cls === "row").map((t) => t.s);
const bad = (change, reason, name = "plan-docs") => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), reason); };

for (const name of ["plan-docs", "plan-editor", "plan-none", "plan-dashboard"]) {
  test(`${name} matches the stored drawing`, () => {
    const { svg, form, warnings } = renderDiagram(fixture(name));
    assert.equal(form, "plan");
    assert.deepEqual(warnings, []);
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("the docs page is to scale on a desktop (103, 411, 103) and grows its narrow columns on a phone (90, 97, 53)", () => {
  const { scene, phone } = renderDiagram(fixture("plan-docs"));
  assert.deepEqual(["nav", "text", "toc"].map((id) => cell(scene, id)), [103, 411, 103]);
  assert.equal(scene.toScale, true);
  assert.equal(head(scene), "Widths in px");
  assert.deepEqual(["nav", "text", "toc"].map((id) => cell(phone, id)), [90, 97, 53]);
  assert.equal(phone.toScale, false);
  assert.equal(head(phone), "Widths in px, not to scale");
  // The real widths stay above the columns in both forms.
  for (const s of [scene, phone]) assert.deepEqual(s.notes.filter((n) => n.cls === "val").map((n) => n.s), ["240", "960", "240"]);
});

test("the editor screen is to scale on a phone too (53 and 187), and a box across rows or columns takes its whole block", () => {
  const { scene, phone } = renderDiagram(fixture("plan-editor"));
  assert.deepEqual(["files", "editor"].map((id) => cell(phone, id)), [53, 187]);
  assert.equal(phone.toScale, true);
  for (const s of [scene, phone]) {
    assert.equal(rect(s, "files").y0, rect(s, "editor").y0, "Files starts with the editor");
    assert.equal(rect(s, "files").y1, rect(s, "output").y1, "Files ends with the output");
    assert.equal(rect(s, "toolbar").x0, rect(s, "files").x0);
    assert.equal(rect(s, "toolbar").x1, rect(s, "editor").x1);
    // Boxes that touch in the data stand 4px apart.
    assert.equal(rect(s, "editor").x0 - rect(s, "files").x1, 4);
    assert.equal(rect(s, "output").y0 - rect(s, "editor").y1, 4);
  }
});

test("a plan has two forms, one band, no dot and no ticks, and its boxes as a table in the order of areas", () => {
  const { svg, scene, phone } = renderDiagram(fixture("plan-docs"));
  assert.equal(scene.w, 640);
  assert.equal(phone.w, 264);
  assert.equal(scene.bands.length, 1);
  assert.doesNotMatch(svg, /class="pulse|data-leg|class="tick|class="track/, "nothing moves, and there are no ticks");
  assert.match(svg, /<th scope="col">Box<\/th><th scope="col">Row<\/th><th scope="col">Column<\/th><th scope="col">Width<\/th><\/tr>/);
  assert.match(svg, /<tr><th scope="row">Header<\/th><td>top<\/td><td>full width<\/td><td>1440<\/td><\/tr><tr><th scope="row">Navigation<\/th><td>middle<\/td><td>left<\/td><td>240<\/td><\/tr>/);
  assert.match(svg, /<p>Widths are in px\. The rows are not drawn to scale\. On a phone the columns are not drawn to scale either\.<\/p>/);
  const editor = renderDiagram(fixture("plan-editor")).svg;
  assert.match(editor, /<tr><th scope="row">Files<\/th><td>rows 2 to 3<\/td><td>left<\/td><td>320<\/td><td><\/td><\/tr><tr><th scope="row">Editor<\/th><td>row 2<\/td><td>right<\/td><td>1120<\/td><td><\/td><\/tr>/);
  assert.match(editor, /<td>can be closed<\/td>/);
  assert.match(editor, /<p>Widths are in px\. The rows are not drawn to scale\.<\/p>/);
});

test("a plan with no widths is sized by its names, says it is not to scale, and has no Width column", () => {
  const { svg, scene, phone } = renderDiagram(fixture("plan-none"));
  for (const s of [scene, phone]) {
    assert.equal(head(s), "Not to scale");
    assert.equal(s.notes.filter((n) => n.cls === "val").length, 0);
  }
  // With no widths every column weighs the same, so on a desktop each gets a third of 616px.
  assert.deepEqual(["nav", "text", "toc"].map((id) => cell(scene, id)), [205, 205, 205]);
  assert.doesNotMatch(svg, /Width<\/th>/);
  assert.match(svg, /<p>The plan is not drawn to scale\.<\/p>/);
});

test("render says which forms are not to scale", () => {
  const block = (name) => `<!-- docent:diagram\n${JSON.stringify(fixture(name))}\n-->\n<!-- /docent:diagram -->`;
  const { results } = renderDocument(["plan-docs", "plan-editor", "plan-none"].map(block).join("\n"));
  assert.deepEqual(results.map((r) => r.form), ["plan; not to scale on a phone", "plan", "plan; not to scale"]);
});

test("no text meets another text or a box it does not belong to, and every text stays inside its box and the drawing", () => {
  const longUnit = { ...fixture("plan-docs"), unit: "デバイス非依存ピクセル" };
  for (const [name, data] of [["plan-docs", fixture("plan-docs")], ["plan-editor", fixture("plan-editor")], ["plan-none", fixture("plan-none")], ["a long unit", longUnit]]) {
    const { scene, phone } = renderDiagram(data);
    for (const s of [scene, phone]) {
      const texts = [...s.notes, ...s.parts.flatMap((p) => p.texts)].map(box);
      for (const t of texts) assert.ok(t.x0 >= 12 - 0.01 && t.x1 <= s.w - 12 + 0.01, `"${t.s}" runs past the drawing (${name}, ${s.w}px)`);
      texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => assert.ok(!meet(a, b), `"${a.s}" meets "${b.s}" (${name}, ${s.w}px)`)));
      for (const p of s.parts) {
        const r = rectOf(p.svg);
        for (const t of p.texts.map(box)) assert.ok(t.x0 >= r.x0 + 8 - 0.01 && t.x1 <= r.x1 - 8 + 0.01 && t.y0 >= r.y0 + 8 - 0.01 && t.y1 <= r.y1 - 8 + 0.01, `"${t.s}" stays inside its box (${name}, ${s.w}px)`);
        for (const t of s.notes.map(box)) assert.ok(!meet(t, r), `"${t.s}" meets the box "${p.id}" (${name}, ${s.w}px)`);
      }
      const rects = s.parts.map((p) => [p.id, rectOf(p.svg)]);
      rects.forEach(([a, ra], i) => rects.slice(i + 1).forEach(([b, rb]) => assert.ok(!meet(ra, rb), `the boxes "${a}" and "${b}" meet (${name}, ${s.w}px)`)));
    }
  }
});

test("the line on the scale wraps on a phone when a long unit meets \"not to scale\", and the widths move down a line", () => {
  const plain = renderDiagram(fixture("plan-docs")).phone;
  const { scene, phone } = renderDiagram({ ...fixture("plan-docs"), unit: "デバイス非依存ピクセル" });
  const heads = (s) => s.notes.filter((n) => n.cls === "sub").map((n) => n.s);
  assert.deepEqual(heads(scene), ["Widths in デバイス非依存ピクセル"]);
  assert.deepEqual(heads(phone), ["Widths in デバイス非依存ピクセル,", "not to scale"]);
  const valY = (s) => s.notes.find((n) => n.cls === "val").y;
  assert.equal(valY(phone) - valY(plain), 16);
});

test("a name wraps at its spaces onto at most three lines, and its row grows", () => {
  const { scene, phone } = renderDiagram(fixture("plan-docs"));
  assert.deepEqual(lines(scene, "toc"), ["On this", "page"]);
  assert.deepEqual(lines(phone, "toc"), ["On", "this", "page"]);
  assert.deepEqual(lines(phone, "nav"), ["Navigation"], "a word never breaks");
  assert.ok(rect(phone, "toc").y1 - rect(phone, "toc").y0 > rect(scene, "toc").y1 - rect(scene, "toc").y0);
});

test("a name written without spaces breaks between characters, and needs only a third of its width", () => {
  const d = fixture("plan-editor");
  d.columns = [1, 10000];
  d.boxes.find((b) => b.id === "files").name = "数据数据数据数据数据数据数据数据";
  const { scene } = renderDiagram(d);
  // 16 characters on 3 lines: the widest run is 6 characters, 84px, so the column needs 84 + 20.
  assert.equal(cell(scene, "files"), 104);
  assert.deepEqual(lines(scene, "files"), ["数据数据数据", "数据数据数据", "数据数据"]);
});

test("wrong plan data is refused with the reason and what to change", () => {
  bad((d) => (d.areas = []), /"areas" must be a list of 1 to 5 strings, one for each row/);
  bad((d) => (d.areas = ["header", "nav", "text", "toc", "footer", "header"]), /"areas" must be a list of 1 to 5 strings/);
  bad((d) => (d.areas[1] = "nav text"), /row 2 of "areas" has 2 cells, and row 1 has 3; every row needs the same number of cells/);
  bad((d) => (d.areas = d.areas.map((r) => `${r} toc toc`)), /row 1 of "areas" has 5 cells; a plan has 1 to 4 columns/);
  bad((d) => (d.areas[1] = "Nav text toc"), /row 2 of "areas" has the cell "Nav"; a cell is the id of a box/);
  bad((d) => { d.areas = ["toolbar toolbar", "files editor", "output files", "status status"]; }, /the box "files" does not form one rectangle in "areas": it takes row 2 in column 1, and row 3 in column 2\. A box takes a block of whole rows and whole columns/, "plan-editor");
  bad((d) => { d.areas = ["toolbar toolbar", "files editor", "files files", "status status"]; d.boxes = d.boxes.filter((b) => b.id !== "output"); }, /the box "files" does not form one rectangle in "areas": it takes rows 2 and 3 in column 1, and row 3 in column 2/, "plan-editor");
  bad((d) => (d.areas[1] = "sidebar text toc"), /"areas" names "sidebar", which is not in "boxes"/);
  bad((d) => (d.areas[1] = "nav text text"), /the box "toc" is in "boxes" but not in "areas"/);
  bad((d) => { d.areas = d.areas.map((r) => `${r} .`); d.columns.push(10); }, /column 4 of "areas" holds only empty cells; remove it/);
  bad((d) => (d.areas = [...d.areas, ". . ."]), /row 4 of "areas" holds only empty cells; remove it/);
  bad((d) => (d.boxes = [...d.boxes, ...[1, 2, 3, 4].map((n) => ({ id: `b${n}`, name: "B" }))]), /a plan has 2 to 8 boxes; this one has 9/);
  bad((d) => (d.boxes = [d.boxes[0]]), /a plan has 2 to 8 boxes; this one has 1/);
  bad((d) => d.boxes.push({ id: "nav", name: "Again" }), /two boxes have the id "nav"/);
  bad((d) => (d.boxes[1].name = "A name far too long here"), /the name of the box "nav" is 24 characters long; the most is 20/);
  bad((d) => (d.boxes[1].note = "a note that is far too long"), /the note of the box "nav" is 27 characters long; the most is 24/);
  bad((d) => (d.columns = [240, 960]), /"columns" has 2 widths, and "areas" has 3 columns/);
  bad((d) => (d.columns[1] = -960), /width 2 of "columns" is -960; a width is a number more than 0/);
  bad((d) => (d.columns[1] = "960"), /width 2 of "columns" is "960"; a width is a number more than 0/);
  bad((d) => delete d.unit, /"columns" and "unit" go together: a width needs its unit, and a unit needs widths/);
  bad((d) => delete d.columns, /"columns" and "unit" go together/);
  bad((d) => (d.scale = { from: 0, to: 1440 }), /a plan has no "scale"; write the widths of the columns in "columns", and their unit in "unit"/);
  bad((d) => (d.rows = []), /a plan has no "rows"; write each row as a string in "areas"/);
  bad((d) => (d.form = "wide"), /a plan has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  bad((d) => (d.place = "walk"), /a plan sits in the text flow; "place" must be "flow"/);
});

test("a plan that does not fit a desktop is refused, and the message names the widest names and their columns", () => {
  const d = fixture("plan-dashboard");
  d.boxes[1].name = "W".repeat(20);
  d.boxes[2].name = "M" + "m".repeat(19);
  assert.throws(() => renderDiagram(d), /the plan does not fit a desktop and paper: its columns need \d+px, and the drawing has 616px\. The widest names are "W{20}" \(column 1\) and "Mm{19}" \(column 2\)\. Shorten them, or use fewer columns/);
});

test("a plan whose grid does not fit a phone is stacked there: one band per box, with a map where its box is filled", () => {
  const { scene, phone, note } = renderDiagram(fixture("plan-dashboard"));
  assert.equal(scene.stack, undefined);
  assert.equal(phone.stack, true);
  assert.equal(note, "stacked on a phone");
  assert.deepEqual(phone.parts.map((p) => p.id), ["head", "nav", "revenue", "signups", "tickets"]);
  assert.equal(phone.bands.length, 5);
  assert.equal(head(phone), "Widths in px");
  const texts = (id) => phone.parts.find((p) => p.id === id).texts.map((t) => t.s);
  assert.deepEqual(texts("head"), ["Header", "1440 px wide"]);
  assert.deepEqual(texts("tickets"), ["Open tickets", "the five oldest", "360 px wide"]);
  // Each map holds every box; only the band's own box is filled, and it stands where the box stands in the plan.
  for (const p of phone.parts) {
    assert.equal((p.svg.match(/<rect /g) || []).length, 5);
    assert.equal((p.svg.match(/class="m-on"/g) || []).length, 1);
  }
  const on = (id) => rectOf(phone.parts.find((p) => p.id === id).svg.match(/<rect [^>]*class="m-on"\/>/)[0]);
  assert.deepEqual([on("head").x0, Math.round(on("head").x1 - on("head").x0)], [16.5, 39]);
  assert.deepEqual([on("signups").x0, Math.round(on("signups").x1 - on("signups").x0)], [36.5, 9]);
  assert.ok(on("nav").y0 > on("head").y0 - 1e-9 && on("nav").y0 - phone.bands[1].y === on("head").y0 - phone.bands[0].y + 8, "the second row sits 8px under the first in the map");
  // No text meets another; each text and each map stays inside its band, and the text keeps to the right of the map.
  const all = [...phone.notes, ...phone.parts.flatMap((p) => p.texts)].map(box);
  all.forEach((a, i) => all.slice(i + 1).forEach((b) => assert.ok(!meet(a, b), `"${a.s}" meets "${b.s}"`)));
  phone.parts.forEach((p, i) => {
    const band = phone.bands[i], inBand = (r) => r.x0 >= band.x && r.x1 <= band.x + band.w && r.y0 >= band.y && r.y1 <= band.y + band.h;
    for (const t of p.texts.map(box)) assert.ok(inBand(t) && t.x0 >= 16 + 40 + 12 - 0.01 && t.x1 <= phone.w - 16 + 0.01, `"${t.s}" stays in its band, right of the map`);
    for (const m of p.svg.match(/<rect [^>]*\/>/g)) assert.ok(inBand(rectOf(m)), `the map of "${p.id}" stays in its band`);
  });
  const { svg } = renderDiagram(fixture("plan-dashboard"));
  assert.match(svg, /\.m-box\{fill:var\(--bg[^}]*stroke:var\(--muted/);
  assert.match(svg, /On a phone each box stands on its own, beside a small map of the plan\./);
});

test("in a map no column is narrower than 3px, and then the maps say they are not to scale", () => {
  const d = fixture("plan-dashboard");
  d.columns = [10, 2000, 2000, 2000];
  const { phone, note } = renderDiagram(d);
  assert.equal(phone.stack, true);
  assert.equal(head(phone), "Widths in px, maps not to scale");
  assert.equal(note, "not to scale; stacked on a phone");
  const nav = rectOf(phone.parts.find((p) => p.id === "nav").svg.match(/<rect [^>]*class="m-on"\/>/)[0]);
  assert.equal(Math.round(nav.x1 - nav.x0 + 1), 3);
});

test("a name or a note that needs too many lines in its box is refused, and the message names the box", () => {
  bad((d) => { d.columns = [1, 10000]; d.boxes.find((b) => b.id === "files").name = "Wide Wide Wide Wide"; }, /the name of the box "files" needs 4 lines in its \d+px box on a desktop and on paper; a name has at most 3\. Shorten it/, "plan-editor");
  bad((d) => { d.columns = [1, 10000]; d.boxes.find((b) => b.id === "files").note = "abcde abcde abcde"; }, /the note of the box "files" needs 3 lines in its \d+px box on a desktop and on paper; a note has at most 2\. Shorten it/, "plan-editor");
});

test("widths that would need a third line are refused on a desktop, and stack the plan on a phone", () => {
  const d = {
    id: "narrow", kind: "plan", label: "Four narrow columns.", unit: "mm",
    columns: [1.000000000000001, 1.000000000000002, 1.000000000000003, 1.000000000000004],
    areas: ["a b c d"], boxes: ["a", "b", "c", "d"].map((x) => ({ id: x, name: x.toUpperCase() })),
  };
  const { phone } = renderDiagram(d);
  assert.equal(phone.stack, true);
  assert.deepEqual(phone.parts[1].texts.map((t) => t.s), ["B", "1.000000000000002 mm wide"]);
  d.columns[3] = 1000;
  assert.throws(() => renderDiagram(d), /the widths 1\.000000000000002 and 1\.000000000000003 above columns 2 and 3 need a third line on a desktop and on paper; widen the narrow column, or write the gap in a note/);
});

test("a plan with one row, one column or two boxes gets a fit warning", () => {
  const row = fixture("plan-docs");
  row.areas = ["nav text toc"];
  row.boxes = row.boxes.filter((b) => ["nav", "text", "toc"].includes(b.id));
  assert.deepEqual(renderDiagram(row).warnings, ["the plan has one row; a layout to scale says this more simply"]);
  const column = fixture("plan-none");
  column.areas = ["header", "nav", "footer"];
  column.boxes = column.boxes.filter((b) => ["header", "nav", "footer"].includes(b.id));
  assert.deepEqual(renderDiagram(column).warnings, ["the plan has one column, so its boxes stand one above another; a list says this more simply"]);
  const two = fixture("plan-none");
  two.areas = ["nav text"];
  two.boxes = two.boxes.filter((b) => ["nav", "text"].includes(b.id));
  assert.deepEqual(renderDiagram(two).warnings, ["the plan has one row; a layout to scale says this more simply", "the plan has 2 boxes; a sentence says where they sit"]);
});

test("check accepts a plan that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, a documentation page" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture("plan-docs"), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>A documentation page.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace(">Navigation<", ">Navigator<")).errors.join("\n"), /\("docs-page"\): the drawing does not match its data; run render/);
});

test("a plan takes every color from the page tokens, uses no ultramarine, and is flat", () => {
  const { svg } = renderDiagram(fixture("plan-editor"));
  const bare = svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, "");
  assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(/i, "no color outside a page token");
  assert.doesNotMatch(bare, /(fill|stroke)="(?!none|currentColor)[^"]*"/, "no color written on an element");
  assert.doesNotMatch(svg, /gradient|filter|shadow|stroke-dasharray/i, "flat, and nothing dashed");
  for (const rule of svg.match(/[^{}\n]*\{[^{}]*var\(--(primary|dot),[^{}]*\}/g) || []) assert.match(rule, /pulse/, `ultramarine only for a dot, and a plan draws none: ${rule}`);
});
