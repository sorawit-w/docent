// Status grids: the state of each pair of a row and a column, OK, Warning or Error, from thresholds or written directly.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = (name = "uptime") => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `statusgrid-${name}.json`), "utf8"));
const FONT = { row: [14, 400], val: [12, 400], sub: [12, 400] };
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "end" ? n.x - w : n.anchor === "middle" ? n.x - w / 2 : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
/** Every cell of the grid (not the legend), with its state ("none" for no data) and the strokes of its mark. */
const cellsOf = (scene) => scene.parts.slice(1).flatMap((p) => [...p.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="2" class="(?:s-(\w+)|h0)"\/>(?:<path d="([^"]+)" class="sm sm-(\w+)"\/>)?/g)].map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4], w: +m[3], h: +m[4], state: m[5] || "none", mark: m[6] ? m[6].split(" M").length : 0, d: m[6], markState: m[7] })));
const keysOf = (scene) => [...scene.parts[0].svg.matchAll(/class="(?:s-(\w+)|h0)"/g)].map((m) => m[1] || "none");
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
const count = (cells) => cells.reduce((n, c) => ({ ...n, [c.state]: (n[c.state] || 0) + 1 }), {});
const words = (d) => renderDiagram(d).svg.split("<details")[1];
const lines = (d) => [...words(d).matchAll(/<li>(.*?)<\/li>/g)].map((m) => m[1]);

test("the three worked examples match their stored drawings, with no warning", () => {
  for (const name of ["uptime", "calendar", "builds"]) {
    const { svg, form, warnings } = renderDiagram(fixture(name));
    assert.equal(form, "statusgrid");
    assert.deepEqual(warnings, []);
    const file = path.join(__dirname, "expected", `statusgrid-${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `statusgrid-${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  }
});

test("the uptime example has the sizes of the proposal, in both forms", () => {
  const { scene, phone, note } = renderDiagram(fixture());
  const desk = cellsOf(scene), small = cellsOf(phone);
  assert.equal(desk[0].x0, 115, "the grid starts 16px after Email alerts (78px), at 114, and a cell sits 1px inside its column");
  assert.deepEqual([desk[0].w, desk[0].h], [34.14, 22]);
  assert.deepEqual([small[0].w, small[0].h], [15, 15], "14 columns of 16px on a phone, 1px apart");
  assert.deepEqual(count(desk), { ok: 64, warn: 3, err: 2, none: 1 });
  assert.deepEqual(count(small), count(desk));
  assert.equal(note, "column labels on two lines on a phone");
  assert.ok(scene.h >= 200 && scene.h <= 230 && phone.h >= 330 && phone.h <= 360, `about 220px and 350px tall: ${scene.h}, ${phone.h}`);
  // The legend: one line on a desktop; on a phone three lines, with "No data" beside "Error".
  const keys = (sc) => sc.notes.filter((n) => n.cls === "sub").map((n) => [n.s, n.y]);
  assert.deepEqual(keys(scene), [["OK: 99.9% or more", 22], ["Warning: 99% to below 99.9%", 22], ["Error: below 99%", 22], ["No data", 22]]);
  assert.deepEqual(keys(phone), [["OK: 99.9% or more", 22], ["Warning: 99% to below 99.9%", 42], ["Error: below 99%", 62], ["No data", 62]]);
  assert.deepEqual(keysOf(scene), ["ok", "warn", "err", "none"], "each key is a cell of its state");
  assert.equal(phone.notes.filter((n) => n.cls === "row").length, 5, "each row name stands on its own line on a phone");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("an OK cell has no mark, a Warning cell a slash, and an Error cell a cross, 3px smaller than the cell and at most 10px", () => {
  const { scene, phone } = renderDiagram(fixture());
  for (const sc of [scene, phone]) {
    for (const c of cellsOf(sc)) {
      assert.equal(c.mark, { ok: 0, warn: 1, err: 2, none: 0 }[c.state], `${c.state} has ${c.mark} strokes`);
      if (c.mark) assert.equal(c.markState, c.state);
    }
  }
  const warn = cellsOf(scene).find((c) => c.state === "warn");
  const [x0, y0, x1, y1] = warn.d.match(/[\d.]+/g).map(Number);
  assert.deepEqual([x1 - x0, y0 - y1], [10, 10], "a slash from the lower left to the upper right, 10px");
  assert.ok(Math.abs((x0 + x1) / 2 - (warn.x0 + warn.w / 2)) < 0.02 && Math.abs((y0 + y1) / 2 - (warn.y0 + warn.h / 2)) < 0.02, "in the middle of the cell");
  // One row of 24 cells on a phone: the narrowest cell, 8.3px, has a mark of 5.3px.
  const one = fixture();
  one.columns = Array.from({ length: 24 }, (_, i) => String(i));
  one.rows = [{ name: "Website", values: one.columns.map((_, i) => (i === 3 ? 98 : 100)) }];
  const err = cellsOf(renderDiagram(one).phone).find((c) => c.state === "err");
  const [a, , b] = err.d.match(/[\d.]+/g).map(Number);
  assert.equal(err.w, 8.33);
  assert.equal(Math.round((b - a) * 10) / 10, 5.3);
});

test("the diagram in words has the same rows and columns, a state word in each cell that is not OK, and four lines", () => {
  const w = words(fixture());
  assert.match(w, /<thead><tr><td><\/td><th scope="col">3<\/th><th scope="col">4<\/th>/);
  assert.match(w, /<tr><th scope="row">API<\/th><td>100<\/td><td>99\.99<\/td>(<td>100<\/td>){5}<\/tr>/);
  assert.match(w, /<tr><th scope="row">API<\/th><td>100<\/td><td>98\.6 Error<\/td><td>99\.7 Warning<\/td>/);
  assert.match(w, /<td>no data<\/td>/);
  // The state words make the cells wider, so on paper the two weeks are two tables of 7 days, each with the row names.
  assert.deepEqual(w.match(/aria-label="[^"]+"/g), ['aria-label="The states of the status grid, columns 3 to 9"', 'aria-label="The states of the status grid, columns 10 to 16"']);
  assert.match(words(fixture("builds")), /aria-label="The states of the status grid"/);
  assert.deepEqual(lines(fixture()), [
    "Each number is in %. A cell is OK at 99.9 or more, Warning from 99 to below 99.9, and Error below 99; a value on a threshold takes the better state. A cell with no state word is OK.",
    "64 cells are OK, 3 are Warning and 2 are Error. 1 cell has no data.",
    "Error: API, 11 (98.6); Search, 11 (97.9).",
    "The worst is 97.9 (Search, 11).",
  ]);
  // States written directly: the state name in each cell, and no line on thresholds or the worst value.
  assert.match(words(fixture("builds")), /<tr><th scope="row">Mobile app<\/th><td>Passed<\/td><td>Failed<\/td><td>Failed<\/td>/);
  assert.deepEqual(lines(fixture("builds")), ["25 cells are Passed and 2 are Failed. 1 cell has no data.", "Failed: Mobile app, Tue; Mobile app, Wed."]);
});

test("a calendar has 7 rows, names a cell by the week that starts on its column's label, and lists failures in time order", () => {
  const { scene, warnings } = renderDiagram(fixture("calendar"));
  assert.deepEqual(count(cellsOf(scene)), { ok: 86, warn: 3, err: 2 });
  assert.deepEqual(warnings, []);
  assert.deepEqual(lines(fixture("calendar")), [
    "Each row is a day of the week, and each column is a week, named by its first day.",
    "Each number is in %. A cell is OK at 99.9 or more, Warning from 99 to below 99.9, and Error below 99; a value on a threshold takes the better state. A cell with no state word is OK.",
    "86 cells are OK, 3 are Warning and 2 are Error.",
    "Error: Friday, week of 31 Aug (97.4); Tuesday, week of 12 Oct (98.2).",
    "The worst is 97.4 (Friday, week of 31 Aug).",
  ]);
  // The same grid without "calendar" names a cell by its row and column, as a heat map does.
  const plain = fixture("calendar");
  delete plain.calendar;
  assert.match(words(plain), /<li>Error: Friday, 31 Aug \(97\.4\); Tuesday, 12 Oct \(98\.2\)\.<\/li>/);
  const short = fixture("calendar");
  short.rows.pop();
  assert.throws(() => renderDiagram(short), /a calendar has 7 rows, one for each day of the week; this one has 6/);
});

test("both directions work, and a value exactly on a threshold takes the better state", () => {
  const d = fixture("builds");
  delete d.names;
  d.thresholds = { better: "lower", ok: 1, warn: 5, unit: "%" };
  d.rows = [{ name: "Errors", values: [0.5, 1, 1.01, 5, 5.01, null, 3] }];
  const states = (data) => cellsOf(renderDiagram(data).scene).map((c) => c.state);
  assert.deepEqual(states(d), ["ok", "ok", "warn", "warn", "err", "none", "warn"]);
  assert.deepEqual(renderDiagram(d).scene.notes.filter((n) => n.cls === "sub").map((n) => n.s), ["OK: 1% or less", "Warning: above 1% to 5%", "Error: above 5%", "No data"]);
  assert.match(words(d), /A cell is OK at 1 or less, Warning from above 1 to 5, and Error above 5;/);
  assert.match(words(d), /<li>The worst is 5\.01 \(Errors, Fri\)\.<\/li>/, "when lower is better, the worst is the highest");
  d.thresholds = { better: "higher", ok: 250, warn: 100, unit: "ms" };
  d.rows = [{ name: "Speed", values: [250, 249, 100, 99, -3, 300, 100] }];
  assert.deepEqual(states(d), ["ok", "warn", "warn", "err", "err", "ok", "warn"]);
  assert.match(renderDiagram(d).svg, />OK: 250 ms or more</, "a unit other than % follows after a space");
  assert.match(words(d), /<td>−3 Error<\/td>/);
});

test("without \"warn\" there are two states, and the legend and the lines say so", () => {
  const d = fixture();
  d.thresholds = { better: "higher", ok: 99.9, unit: "%" };
  const { scene } = renderDiagram(d);
  assert.deepEqual(count(cellsOf(scene)), { ok: 64, err: 5, none: 1 });
  assert.deepEqual(scene.notes.filter((n) => n.cls === "sub").map((n) => n.s), ["OK: 99.9% or more", "Error: below 99.9%", "No data"]);
  assert.match(words(d), /A cell is OK at 99\.9 or more, and Error below 99\.9;/);
  d.thresholds.better = "lower";
  assert.match(renderDiagram(d).svg, />Error: above 99\.9%</);
});

test("the author's names for the states are used everywhere, and the colors and marks do not change with them", () => {
  const d = fixture();
  d.names = { ok: "Up", warn: "Degraded", err: "Down" };
  const { scene } = renderDiagram(d);
  assert.deepEqual(scene.notes.filter((n) => n.cls === "sub").map((n) => n.s), ["Up: 99.9% or more", "Degraded: 99% to below 99.9%", "Down: below 99%", "No data"]);
  assert.deepEqual(lines(d).slice(1, 3), ["64 cells are Up, 3 are Degraded and 2 are Down. 1 cell has no data.", "Down: API, 11 (98.6); Search, 11 (97.9)."]);
  assert.deepEqual(count(cellsOf(scene)), { ok: 64, warn: 3, err: 2, none: 1 });
});

test("a legend shows only the states the data can take, and a key too wide for a line wraps instead of being refused", () => {
  // States written directly: OK and Error always, Warning only when a cell has it.
  assert.deepEqual(keysOf(renderDiagram(fixture("builds")).scene), ["ok", "err", "none"]);
  const warned = fixture("builds");
  warned.rows[0].values[0] = "warn";
  assert.deepEqual(keysOf(renderDiagram(warned).scene), ["ok", "warn", "err", "none"]);
  // With thresholds, every state they define, also when no cell is in it.
  const calm = fixture();
  calm.rows.forEach((r) => (r.values = r.values.map((v) => (v === null ? null : 100))));
  assert.deepEqual(keysOf(renderDiagram(calm).scene), ["ok", "warn", "err", "none"]);
  assert.match(words(calm), /<li>No cell is Error\.<\/li>/);
  // The longest names and unit: a key wider than a phone wraps its words at their spaces.
  const long = fixture();
  long.names = { ok: "Fully up now", warn: "Slow at time", err: "Not working" };
  long.thresholds = { better: "lower", ok: 1000.5, warn: 2000.25, unit: "ms per call" };
  long.rows.forEach((r) => (r.values = r.values.map((v) => (v === null ? null : 3000 - v * 20))));
  const { phone, scene } = renderDiagram(long);
  const keyLines = phone.notes.filter((n) => n.cls === "sub");
  assert.ok(keyLines.length > 4, "the Warning key takes two lines on a phone");
  assert.deepEqual(clashes(phone), []);
  assert.deepEqual(clashes(scene), []);
});

test("one row is allowed, and many errors are counted, not listed", () => {
  const d = fixture();
  d.rows = [{ name: "Website", values: [100, 98, 98, 98, 98, 98, 98, 98, 100, 100, 100, 100, 100, 100] }];
  const { scene, phone } = renderDiagram(d);
  assert.equal(cellsOf(scene).length, 14);
  assert.match(words(d), /<li>Error in 7 cells; the table shows each\.<\/li>/);
  assert.match(words(d), /<li>The worst is 98, in 7 cells\.<\/li>/);
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("wrong status grid data is refused with a plain reason", () => {
  const broken = (change, reason, name = "uptime") => { const d = fixture(name); change(d); assert.throws(() => renderDiagram(d), reason); };
  broken((d) => (d.place = "page"), /a status grid sits in the text flow; "place" must be "flow"/);
  broken((d) => (d.form = "wide"), /a status grid has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  broken((d) => (d.groups = []), /a status grid has no "groups"; each row is one row of cells/);
  broken((d) => (d.areas = []), /a status grid has no "areas"; for the areas of a page, write a plan, and its states in a table/);
  broken((d) => (d.scale = { from: 0, to: 100, step: 25, unit: "%" }), /a status grid has no "scale"; write "thresholds" with "better", "ok" and "unit", or write each state as "ok", "warn" or "err"/);
  broken((d) => (d.rows = "x"), /"rows" must be a list of 1 to 12 rows, top to bottom, each with a "name" and its "values"/);
  broken((d) => (d.rows = Array.from({ length: 14 }, (_, i) => ({ name: `R${i}`, values: d.rows[0].values }))), /a status grid has 1 to 12 rows; this one has 14/);
  broken((d) => (d.columns = "x"), /"columns" must be a list of 3 to 24 labels, one for each column/);
  broken((d) => (d.columns = Array.from({ length: 31 }, (_, i) => String(i))), /a status grid has 3 to 24 columns; this one has 31/);
  broken((d) => (d.columns[2] = "Wednesday 2"), /the label of column 3 is 11 characters long; the most is 10: "Wednesday 2"/);
  broken((d) => (d.rows[3].name = "Image upload and resize"), /the name of row 4 is 23 characters long; the most is 20: "Image upload and resize"/);
  broken((d) => (d.rows[1].name = "API"), /two rows have the name "API"/);
  broken((d) => (d.columns[1] = "3"), /two columns have the label "3"/);
  broken((d) => d.rows[2].values.pop(), /row 3 \("API"\) has 13 values, and "columns" has 14/);
  broken((d) => (d.columns = d.columns.map((_, i) => `WWWWWWWW${String(i).padStart(2, "0")}`)), /the column labels do not fit on a phone, even on two lines or with every 12th label; the widest is "WWWWWWWW\d\d", \d+px\. Shorten the labels to about 7 characters, or use fewer columns/);
  broken((d) => (d.thresholds = { better: "higher", ok: 99.9 }), /"thresholds" must have "better", "ok" and "unit", and may have "warn"/);
  broken((d) => (d.thresholds.better = "up"), /"better" must be "higher" or "lower"/);
  broken((d) => (d.thresholds.ok = "99.9"), /"ok" in "thresholds" must be a number/);
  broken((d) => (d.thresholds.warn = "99"), /"warn" in "thresholds" must be a number/);
  broken((d) => Object.assign(d.thresholds, { ok: 99, warn: 99.9 }), /with "better": "higher", "ok" must be above "warn"; here "ok" is 99 and "warn" is 99\.9\. Swap them, or write "better": "lower"/);
  broken((d) => Object.assign(d.thresholds, { better: "lower", ok: 5, warn: 1 }), /with "better": "lower", "ok" must be below "warn"; here "ok" is 5 and "warn" is 1\. Swap them, or write "better": "higher"/);
  broken((d) => (d.thresholds.warn = 99.9), /"ok" and "warn" are both 99\.9; for two states, leave out "warn"/);
  broken((d) => (d.thresholds.unit = "ms per request"), /the unit of the thresholds is 14 characters long; the most is 12: "ms per request"/);
  broken((d) => (d.rows[1].values[8] = "ok"), /row 2 \("Sign-in"\) has the value "ok" in column "11"; with "thresholds" a value is a number, or null for no data/);
  broken((d) => (d.rows[1].values[2] = 99.4), /row 2 \("Web app"\) has the value 99\.4 in column "Wed"; without "thresholds" a value is "ok", "warn" or "err", or null for no data/, "builds");
  broken((d) => (d.rows[1].values[2] = "fail"), /row 2 \("Web app"\) has the value "fail" in column "Wed"; a state is "ok", "warn" or "err", or null for no data/, "builds");
  broken((d) => (d.names = { down: "Down" }), /"names" may name "ok", "warn" and "err"; "down" is not a state/);
  broken((d) => (d.names = ["Up"]), /"names" must give the words for the states/);
  broken((d) => (d.names = { err: "Out of service" }), /the name of the state "err" is 14 characters long; the most is 12: "Out of service"/);
  broken((d) => (d.names = { warn: "Down", err: "Down" }), /two states have the name "Down"/);
  broken((d) => (d.names = { err: "OK" }), /two states have the name "OK"/);
  broken((d) => (d.calendar = "yes"), /"calendar" must be true or false/);
  broken((d) => d.rows.forEach((r) => (r.values = r.values.map(() => null))), /every cell has no data; a status grid needs at least one state/);
});

test("the fit warnings name a sentence, a table or a heat map when a status grid shows little", () => {
  const warn = (change, name = "uptime") => { const d = fixture(name); change(d); return renderDiagram(d).warnings; };
  assert.deepEqual(warn((d) => d.rows.forEach((r) => (r.values = r.values.map((v) => (v === null ? null : 100))))), ['every cell is "OK"; a sentence says this more simply, such as "every part was up every day"']);
  assert.deepEqual(warn((d) => { d.names = { err: "Failed" }; d.rows.forEach((r) => (r.values = r.values.map(() => "err"))); }, "builds"), ['every cell is "Failed"; a sentence says this more simply']);
  assert.deepEqual(warn((d) => { d.columns = d.columns.slice(0, 3); d.rows = d.rows.slice(0, 3).map((r) => ({ ...r, values: r.values.slice(0, 3) })); }, "builds"), ["the status grid has 9 cells; a table with a state column says this more simply"]);
  // A threshold set too high: every cell with a number is Warning or Error.
  assert.deepEqual(warn((d) => (d.thresholds.ok = 100.5)), ["69 of 69 cells are Warning or Error; check the thresholds, or use a heat map when the question is how much, not which cells failed"]);
  assert.deepEqual(warn((d) => (d.thresholds = { better: "higher", ok: 100.5, unit: "%" })), ['every cell is "Error"; a sentence says this more simply', "69 of 69 cells are Error; check the thresholds, or use a heat map when the question is how much, not which cells failed"]);
  assert.deepEqual(warn((d) => d.rows.forEach((r, i) => { if (i !== 2) r.values = r.values.map(() => null); })), ["56 of 70 cells have no data; a table of the cells that have data may say this better"]);
  assert.deepEqual(warn((d) => (d.columns = d.columns.map((c) => `Day ${c} Nov`))), ["only every 2nd column label fits on a desktop; when the columns are names, not a series such as days, turn the grid so that the names are rows"]);
  // 24 weeks: only every 3rd label fits on a desktop. A calendar's columns are weeks, a series, so it gets no such warning.
  const weeks = (d) => { d.columns = Array.from({ length: 24 }, (_, i) => `${i + 1} Sep`); d.rows.forEach((r) => (r.values = [...r.values, ...r.values].slice(0, 24))); };
  assert.deepEqual(warn(weeks, "calendar"), []);
  assert.match(warn((d) => { weeks(d); delete d.calendar; }, "calendar").join(), /^only every 3rd column label fits on a desktop/);
});

test("a status grid takes every color from the page tokens: status fills on screen, look D on paper, and no dot or dash", () => {
  for (const name of ["uptime", "calendar", "builds"]) {
    const { svg } = renderDiagram(fixture(name));
    const bare = svg.replace(/var\(--[a-z0-9-]+,#[0-9a-f]{6}\)/g, "");
    assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(|opacity|gradient|filter/i);
    assert.doesNotMatch(svg, /is-(ok|warn|err)|class="pulse|dasharray|--primary|--heat/);
  }
  const { svg } = renderDiagram(fixture());
  const id = "#dg-tracker-uptime";
  assert.ok(svg.includes(`${id} .s-ok{fill:var(--ok,#1a7f37)}`) && svg.includes(`${id} .s-warn{fill:var(--warn,#7d4e00)}`) && svg.includes(`${id} .s-err{fill:var(--err,#cf222e)}`), "on screen each cell takes its status color");
  assert.ok(svg.includes(`${id} .sm{fill:none;stroke:var(--bg,#fbfbfe);stroke-width:1.5;stroke-linecap:round}`), "the marks are 1.5px with round ends, in the page color");
  const print = svg.match(/@media print\{([^\n]*)\}/)[1];
  assert.ok(print.includes(`${id} .s-ok,${id} .s-warn{fill:var(--line,#d3d6e3)}`) && print.includes(`${id} .sm-warn{stroke:var(--warn,#7d4e00)}`), "on paper OK and Warning take the outline color, and the slash the warning color");
  assert.doesNotMatch(print, /s-err/, "on paper an Error cell keeps its fill and its cross");
});

test("check accepts a status grid that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, uptime" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Uptime by day.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace('class="s-err"/>', 'class="s-ok"/>')).errors.join("\n"), /\("tracker-uptime"\): the drawing does not match its data; run render/);
});
