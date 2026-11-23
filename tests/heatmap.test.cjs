// Heat maps: one number for each pair of a row and a column, as a grid of cells in five heat steps, with a legend and a table.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = (name = "signups") => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `heatmap-${name}.json`), "utf8"));
const FONT = { row: [14, 400], val: [12, 400], sub: [12, 400] };
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "end" ? n.x - w : n.anchor === "middle" ? n.x - w / 2 : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
const cellsOf = (scene) => scene.parts.slice(1).flatMap((p) => [...p.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="2" class="h(\d)"/g)].map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4], w: +m[3], h: +m[4], heat: +m[5] })));
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** Two texts that meet, a text on a cell, and any text past 12px from the edges of the drawing. */
function clashes(scene) {
  const texts = scene.notes.map(box), cells = cellsOf(scene), out = [];
  texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => meet(a, b) && out.push(`${a.s} / ${b.s}`)));
  for (const t of texts) {
    if (cells.some((c) => meet(t, c))) out.push(`${t.s} / cell`);
    if (t.x0 < 12 - 0.01 || t.x1 > scene.w - 12 + 0.01) out.push(`${t.s} / edge`);
  }
  return out;
}
const labels = (scene) => scene.notes.filter((n) => n.cls === "val" && n.y > 40).map((n) => n.s);
const words = (d) => renderDiagram(d).svg.split("<details")[1];

test("both worked examples match their stored drawings", () => {
  for (const name of ["signups", "errors"]) {
    const { svg, form, warnings } = renderDiagram(fixture(name));
    assert.equal(form, "heatmap");
    assert.deepEqual(warnings, []);
    const file = path.join(__dirname, "expected", `heatmap-${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `heatmap-${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  }
});

test("the sign-ups example has the sizes of the proposal, in both forms", () => {
  const { scene, phone, note } = renderDiagram(fixture());
  const desk = cellsOf(scene), small = cellsOf(phone);
  assert.equal(desk[0].x0, 115, "the grid starts 16px after Wednesday (78px), at 114, and a cell sits 1px inside its column");
  assert.equal(desk[0].w, 19.08);
  assert.equal(desk[0].h, 22);
  assert.equal(small[0].w, 8.33, "24 columns of 9.3px on a phone, 1px apart");
  assert.equal(small[0].h, 15);
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => desk.filter((c) => c.heat === k).length), [69, 44, 34, 17, 4]);
  assert.equal(scene.numbers, false, '"224" needs 31.8px, and a cell is 19.1px');
  assert.deepEqual(labels(scene), fixture().columns, "every hour on a desktop");
  assert.deepEqual(labels(phone), ["0", "3", "6", "9", "12", "15", "18", "21"], "every third hour on a phone");
  assert.equal(note, "every 3rd column label on a phone");
  // The legend: 5 swatches of 32px, 2px apart, and the edge numbers under the edges.
  assert.deepEqual(scene.notes.filter((n) => n.y === 38).map((n) => [n.s, n.x]), [["0", 20], ["50", 53], ["100", 87], ["150", 121], ["200", 155], ["250", 188]]);
  assert.equal(phone.notes.filter((n) => n.cls === "row").length, 7, "each row name stands on its own line on a phone");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("the errors example shows its numbers, and its no-data key takes a second line on a phone", () => {
  const { scene, phone, note, svg } = renderDiagram(fixture("errors"));
  assert.equal(note, "numbers in the cells");
  assert.deepEqual([1, 2, 3, 4, 5].map((k) => cellsOf(scene).filter((c) => c.heat === k).length), [29, 8, 0, 2, 2], "4 steps take heat steps 1, 2, 4 and 5");
  assert.equal(cellsOf(scene)[0].w, 68.29);
  // A number on step 4 or 5 takes the page color.
  const hi = (sc) => sc.parts.flatMap((p) => p.texts).filter((t) => t.cls === "hv hi").map((t) => t.s);
  assert.deepEqual(hi(scene), ["38", "31", "22", "21"]);
  assert.deepEqual(hi(phone), ["38", "31", "22", "21"]);
  assert.equal(scene.parts.flatMap((p) => p.texts).length, 41, "every cell with data shows its number; the cell with no data shows none");
  // The hollow cell: the band inside a 1px muted outline.
  assert.equal(cellsOf(scene).filter((c) => c.heat === 0).length, 1);
  assert.match(svg, /\.h0\{fill:var\(--bg,#fbfbfe\);stroke:var\(--muted,#575d75\);stroke-width:1\}/);
  const key = (sc) => sc.notes.find((n) => n.s === "no data");
  assert.equal(key(scene).y, 22, "the no-data key stands beside the unit on a desktop");
  assert.equal(key(phone).y, 56, "the no-data key takes a second line on a phone");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("the diagram in words has the same rows and columns, and lines on the steps, the highest, the lowest and no data", () => {
  const w = words(fixture("errors"));
  assert.match(w, /<thead><tr><td><\/td><th scope="col">Mon<\/th><th scope="col">Tue<\/th>/);
  assert.match(w, /<tr><th scope="row">Email<\/th><td>1<\/td><td>0<\/td><td>2<\/td><td>no data<\/td><td>1<\/td>/);
  assert.match(w, /<li>Each cell is shaded by its number, in 4 steps of 10 errors from 0 to 40\. A number on the edge of two steps takes the higher step\.<\/li><li>The highest number is 38 \(Checkout, Wed\)\. The lowest is 0, in 3 cells\.<\/li><li>1 cell has no data\.<\/li>/);
  assert.match(words(fixture()), /<li>The highest number is 224 \(Thursday, 11\)\. The lowest is 5, in 6 cells\.<\/li><\/ul>/);
  const two = fixture("errors");
  two.rows[4].values[0] = null;
  assert.match(words(two), /<li>2 cells have no data\.<\/li>/);
});

test("a grid too wide for paper is written as several tables in words, each with the row names", () => {
  const d = fixture();
  d.columns = d.columns.map((h) => `${h.padStart(2, "0")}:00`);
  d.scale = { from: 0, to: 1000, step: 200, unit: "visits" };
  d.rows = d.rows.map((r) => ({ ...r, values: r.values.map((v) => v * 4 + 0.5) }));
  const w = words(d);
  const tables = w.match(/<div class="table-wrap" role="region" aria-label="[^"]+" tabindex="0">/g);
  assert.deepEqual(tables.map((t) => t.match(/aria-label="([^"]+)"/)[1]), ["The numbers of the heat map, columns 00:00 to 07:00", "The numbers of the heat map, columns 08:00 to 15:00", "The numbers of the heat map, columns 16:00 to 23:00"]);
  assert.equal((w.match(/<th scope="row">Monday<\/th>/g) || []).length, 3, "each table has the row names");
  // The sign-ups grid takes two tables of 12 hours on paper; the errors grid fits one.
  assert.deepEqual((words(fixture()).match(/aria-label="[^"]+"/g) || []), ['aria-label="The numbers of the heat map, columns 0 to 11"', 'aria-label="The numbers of the heat map, columns 12 to 23"']);
  assert.deepEqual((words(fixture("errors")).match(/aria-label="[^"]+"/g) || []), ['aria-label="The numbers of the heat map"']);
  // A legend with edges of four digits keeps its unit on a second line on a phone, instead of being refused.
  const { phone } = renderDiagram(d);
  assert.equal(phone.notes.find((n) => n.s === "visits").y, 56);
});

test("a value on an edge takes the higher step; 3 steps take heat steps 1, 3 and 5; values below zero and decimals are written as given", () => {
  const d = fixture("errors");
  d.scale = { from: -30, to: 0, step: 10, unit: "change" };
  d.rows = [{ name: "A", values: [-30, -20, -10.5, -10, 0, -0.5, null] }, { name: "B", values: [-29.9, -21, -5, -15, -25, -1, -2] }];
  const { scene, svg } = renderDiagram(d);
  const heat = (row) => [...scene.parts[row + 1].svg.matchAll(/class="h(\d)"/g)].map((m) => +m[1]);
  assert.deepEqual(heat(0), [1, 3, 3, 5, 5, 5, 0], "−20 takes the middle step, −10 and 0 the top step");
  assert.match(svg, />−10\.5</);
  assert.match(svg, /<td>−0\.5<\/td>/);
  assert.match(svg, /in 3 steps of 10 change from −30 to 0\./);
});

test("numbers that fit on a desktop only, and column labels on two lines, are both said in the note", () => {
  const d = fixture();
  d.columns = d.columns.slice(0, 12);
  d.rows.forEach((r) => (r.values = r.values.slice(0, 12)));
  const { scene, phone, note } = renderDiagram(d);
  assert.equal(scene.numbers, true);
  assert.equal(phone.numbers, false);
  assert.match(note, /^numbers in the cells on a desktop only/);
  const days = fixture("errors");
  days.columns = ["Monday", "Tuesday", "Wednesday", "Thursday"];
  days.rows.forEach((r) => (r.values = r.values.slice(0, 4)));
  const two = renderDiagram(days);
  assert.equal(two.phone.labels.lines, 2);
  assert.equal(two.note, "numbers in the cells; column labels on two lines on a phone");
  assert.deepEqual(labels(two.phone).sort(), [...days.columns].sort(), "two lines keep every label");
  for (const sc of [two.scene, two.phone]) assert.deepEqual(clashes(sc), []);
});

test("labels near an edge move inward, and labels that are thinned on a desktop get a fit warning", () => {
  const d = fixture();
  d.columns = d.columns.map((h) => `Wed ${h}`);
  const { scene, phone, note, warnings } = renderDiagram(d);
  assert.equal(scene.labels.every, 3);
  assert.equal(phone.labels.every, 6);
  assert.equal(note, "every 3rd column label on a desktop; every 6th column label on a phone");
  assert.deepEqual(warnings, ["only every 3rd column label fits on a desktop; when the columns are names, not a series such as hours, turn the grid so that the names are rows"]);
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), [], "the first label moved inward, so it stays 12px inside");
});

test("a long row name wraps above its row on a phone", () => {
  const d = fixture("errors");
  d.rows[5].name = "WWWWWWWWWW WWWWWWWWW";
  const { scene, phone } = renderDiagram(d);
  assert.deepEqual(phone.notes.filter((n) => n.cls === "row" && n.s.startsWith("W")).map((n) => n.s), ["WWWWWWWWWW", "WWWWWWWWW"]);
  assert.equal(cellsOf(scene)[0].x0, Math.ceil(20 + textWidth("WWWWWWWWWW WWWWWWWWW", 14) + 16) + 1, "on a desktop the name stays on one line, and the grid starts after it");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("wrong heat map data is refused with a plain reason", () => {
  const broken = (change, reason, name = "signups") => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), reason); };
  broken((d) => (d.place = "page"), /a heat map sits in the text flow; "place" must be "flow"/);
  broken((d) => (d.form = "wide"), /a heat map has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  broken((d) => (d.groups = []), /a heat map has no "groups"; each row is one row of cells/);
  broken((d) => (d.areas = []), /a heat map has no "areas"; for the areas of a page, write a plan, and its counts in a table/);
  broken((d) => (d.rows = "x"), /"rows" must be a list of 2 to 12 rows, top to bottom, each with a "name" and its "values"/);
  broken((d) => (d.rows = Array.from({ length: 14 }, (_, i) => ({ name: `R${i}`, values: d.rows[0].values }))), /a heat map has 2 to 12 rows; this one has 14/);
  broken((d) => (d.columns = "x"), /"columns" must be a list of 3 to 24 labels, one for each column/);
  broken((d) => (d.columns = Array.from({ length: 31 }, (_, i) => String(i))), /a heat map has 3 to 24 columns; this one has 31/);
  broken((d) => (d.columns[2] = "Wednesday 2"), /the label of column 3 is 11 characters long; the most is 10: "Wednesday 2"/);
  broken((d) => (d.rows[3].name = "Image upload and resize"), /the name of row 4 is 23 characters long; the most is 20: "Image upload and resize"/);
  broken((d) => (d.rows[1].name = "Monday"), /two rows have the name "Monday"/);
  broken((d) => (d.columns[1] = "0"), /two columns have the label "0"/);
  broken((d) => d.rows[2].values.pop(), /row 3 \("Wednesday"\) has 23 values, and "columns" has 24/);
  broken((d) => (d.rows[1].values[14] = "12"), /row 2 \("Tuesday"\) has the value "12" in column "14"; a value is a number, or null for no data/);
  broken((d) => (d.rows[1].values[14] = 312), /row 2 \("Tuesday"\) has the value 312 in column "14"; it must be on the scale, from 0 to 250/);
  broken((d) => (d.scale.step = 25), /the scale has 10 steps; a heat map has 3 to 5, one for each heat step\. Use a larger "step"/);
  broken((d) => (d.scale.step = 125), /the scale has 2 steps; a heat map has 3 to 5, one for each heat step\. Use a smaller "step"/);
  broken((d) => delete d.scale.unit, /the scale of a heat map needs a "unit", such as "sign-ups"; the legend names it/);
  broken((d) => (d.scale.marks = [{ at: 100, name: "Goal" }]), /the scale of a heat map has no "marks"; say a value that matters in the label or the text/);
  broken((d) => d.rows.forEach((r) => (r.values = r.values.map(() => null))), /every cell has no data; a heat map needs at least one number/);
  broken((d) => { d.scale = { from: 0, to: 1000000, step: 200000, unit: "visits" }; }, /the legend needs \d+px on a phone, and a phone has 240px; its widest number is "1000000"\. Write the values in a larger unit, such as thousands/);
  broken((d) => (d.columns = d.columns.map((_, i) => `WWWWWWWW${String(i).padStart(2, "0")}`)), /the column labels do not fit on a phone, even on two lines or with every 12th label; the widest is "WWWWWWWW\d\d", \d+px\. Shorten the labels to about 7 characters, or use fewer columns/);
});

test("the fit warnings name a sentence or a table when a heat map shows little", () => {
  const warn = (change, name = "errors") => { const d = fixture(name); change(d); return renderDiagram(d).warnings; };
  assert.deepEqual(warn((d) => (d.scale = { from: 0, to: 120, step: 40, unit: "errors" })), ["every number is in one step, so the shades show nothing; a sentence or a table says this more simply"]);
  // With steps of 15, seven cells leave the lowest step (38, 31, 22, 17, 15, 19 and 21): 34 of 41 cells stay in it.
  assert.deepEqual(warn((d) => (d.scale = { from: 0, to: 75, step: 15, unit: "errors" })), ['34 of 41 cells are in the lowest step; one large number may set the scale. Check "to", or say the large number in the text']);
  assert.deepEqual(warn((d) => { d.columns = d.columns.slice(0, 3); d.rows = d.rows.slice(2, 5).map((r) => ({ ...r, values: r.values.slice(0, 3) })); }), ["the heat map has 9 cells; a table with the numbers says this more simply"]);
  assert.deepEqual(warn((d) => d.rows.forEach((r, i) => { if (i !== 2) r.values = r.values.map(() => null); })), ["35 of 42 cells have no data; a table of the cells that have data may say this better"]);
});

test("a heat map takes every color from the page tokens, and has no state, no dot and nothing dashed", () => {
  for (const name of ["signups", "errors"]) {
    const { svg } = renderDiagram(fixture(name));
    const bare = svg.replace(/var\(--[a-z0-9-]+,#[0-9a-f]{6}\)/g, "");
    assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(|opacity|gradient|filter/i);
    assert.doesNotMatch(svg, /is-(ok|warn|err)|class="pulse|dasharray|--primary/);
  }
  const { svg } = renderDiagram(fixture());
  assert.match(svg, /\.h1\{fill:var\(--heat-1,#dee2f0\)\}[\s\S]*\.h5\{fill:var\(--heat-5,#3e424d\)\}/);
  assert.match(svg, /\.hv\.hi\{fill:var\(--bg,#fbfbfe\)\}/);
});

test("the kit sets the heat steps in its four places, and check warns when a page sets one", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "kit.css"), "utf8");
  assert.equal((css.match(/--heat-1: #dee2f0;/g) || []).length, 2, "light and print");
  assert.equal((css.match(/--heat-1: #2a2e38;/g) || []).length, 2, "dark by the system and dark by the switch");
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  assert.match(checkDocument(specimen.replace("</head>", "<style>:root{--heat-3:#888888}</style></head>")).warnings.join("\n"), /a style sets --heat-3; the kit sets it in four places/);
});

test("check accepts a heat map that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, errors" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture("errors"), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Errors by day.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace('class="hv hi" text-anchor="middle">38</text>', 'class="hv hi" text-anchor="middle">39</text>')).errors.join("\n"), /\("errors-by-day"\): the drawing does not match its data; run render/);
});
