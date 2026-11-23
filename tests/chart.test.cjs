// The chart core: the parts that every scale chart shares, tested on their own so a new chart kind builds on a tested base.
const test = require("node:test");
const assert = require("node:assert/strict");
const chart = require("../skills/docent/scripts/lib/chart.cjs");
const scale = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");
const { WIDE, PHONE, esc, wrapName, comma, share, onLines, labelsOf, tablesOf, gridTables, readScale, makeScale, tickAt, placeLabel, valueWidth } = chart;

const read = (s) => readScale(s, { needStep: true });

test("the core has the two forms, and passes on the numeric scale of scale.cjs unchanged", () => {
  assert.equal(WIDE, 640, "the desktop and paper form fits an A4 figure well");
  assert.equal(PHONE, 264, "the phone form fits a 320px screen");
  for (const name of ["readScale", "makeScale", "tickAt", "drawHead", "drawGrid", "linesIn", "placeLabel", "valueWidth", "fmt", "isNum", "num", "diff"]) assert.equal(chart[name], scale[name], name);
});

test("a scale maps numbers to pixels in both forms, and only the pixels per unit change", () => {
  // The bar chart of the proposal: 0 to 500 reports, on x = 119 to 588 on a desktop and x = 20 to 212 on a phone.
  const s = read({ from: 0, to: 500, step: 100, unit: "reports" });
  const wide = makeScale(s, 119, 588, { lo: 12, hi: WIDE - 12 }), phone = makeScale(s, 20, 212, { lo: 12, hi: PHONE - 12 });
  assert.equal(wide.per, 0.938);
  assert.equal(phone.per, 0.384);
  assert.equal(wide.x(0), 119);
  assert.equal(wide.x(500), 588);
  assert.equal(Math.round(wide.x(412) * 10) / 10, 505.5);
  assert.deepEqual(wide.ticks.map((t) => t.label), ["0", "100", "200", "300", "400", "500"], "every tick fits on a desktop");
  assert.deepEqual(phone.ticks.map((t) => t.label), ["0", "200", "400"], "every second tick on a phone");
  for (const sc of [wide, phone]) for (let i = 1; i < sc.ticks.length; i++) assert.ok(sc.ticks[i].x - sc.ticks[i - 1].x >= 48, "two tick labels stand at least 48px apart");
});

test("ticks keep their labels inside the drawing, drop the noise of the arithmetic, and refuse labels wider than the scale", () => {
  const s = read({ from: 0, to: 0.3, step: 0.1 });
  assert.deepEqual([0, 1, 2, 3].map((k) => tickAt(s, 3, k)), [0, 0.1, 0.2, 0.3]);
  // Below 0, a tick label takes a minus sign, not a hyphen.
  assert.deepEqual(makeScale(read({ from: -20, to: 20, step: 10 }), 20, 600).ticks.map((t) => t.label), ["−20", "−10", "0", "10", "20"]);
  const sc = makeScale(read({ from: 0, to: 1000, step: 100 }), 20, 236, { lo: 12, hi: 252 });
  for (const t of sc.ticks) assert.ok(t.x - valueWidth(t.label) / 2 >= 12 && t.x + valueWidth(t.label) / 2 <= 252, `the tick ${t.label} stays inside`);
  assert.throws(() => makeScale(read({ from: 0, to: 1000000000, step: 500000000 }), 0, 40), /no two tick labels stand apart/);
});

test("a label finds a free place beside its mark, in the order of the sides given, and the mark never moves", () => {
  // Inside needs 8px clear on each side of the label; right and left stand 8px from the mark.
  assert.deepEqual(placeLabel({ a: 100, b: 156, w: 40, lo: 12, hi: 628, sides: ["inside", "right"] }), { x: 128, anchor: "middle", side: "inside" });
  assert.deepEqual(placeLabel({ a: 100, b: 155, w: 40, lo: 12, hi: 628, sides: ["inside", "right"] }), { x: 163, anchor: "start", side: "right" });
  assert.deepEqual(placeLabel({ a: 100, b: 600, w: 40, lo: 12, hi: 628, sides: ["right", "left"] }), { x: 92, anchor: "end", side: "left" });
  // No side has room: the label goes on a line above the mark, starting at the mark and kept between lo and hi.
  assert.deepEqual(placeLabel({ a: 30, b: 610, w: 40, lo: 12, hi: 628, sides: ["right", "left"] }), { x: 30, anchor: "start", side: "above" });
  assert.deepEqual(placeLabel({ a: 610, b: 620, w: 40, lo: 12, hi: 628, sides: ["left"] }).side, "left");
  assert.deepEqual(placeLabel({ a: 600, b: 640, w: 40, lo: 12, hi: 628, sides: ["right"] }), { x: 588, anchor: "start", side: "above" });
  assert.equal(placeLabel({ a: 0, b: 10, w: 700, lo: 12, hi: 628, sides: ["right"] }), null, "a label wider than the room has no place");
});

test("labels on lines keep 4px apart, and a label goes to the first line with room", () => {
  const items = [{ x0: 0, w: 20 }, { x0: 22, w: 20 }, { x0: 48, w: 20 }];
  assert.equal(onLines(items, 2), 2);
  assert.deepEqual(items.map((it) => it.line), [0, 1, 0], "the second label is 2px from the first, so it takes the second line");
  assert.equal(onLines([{ x0: 0, w: 20 }, { x0: 10, w: 20 }, { x0: 20, w: 20 }], 2), false, "three labels over each other need a third line");
});

test("column labels stand on one line, then on two, then every 2nd to 12th, and never fewer than three", () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const at = (x0, x1, n) => (i) => x0 + (i + 0.5) * ((x1 - x0) / n);
  const wide = labelsOf(months, at(52, 549, 12), WIDE, "on a desktop");
  assert.deepEqual([wide.lines, wide.every, wide.items.length], [1, 1, 12]);
  const two = labelsOf(months, at(20, 244, 12), PHONE, "on a phone");
  assert.deepEqual([two.lines, two.every], [2, 1], "12 months on a phone take two lines");
  const hours = Array.from({ length: 24 }, (_, h) => `${h}:00`);
  const kept = labelsOf(hours, at(20, 244, 24), PHONE, "on a phone");
  assert.equal(kept.lines, 1);
  assert.ok(kept.every > 1 && kept.items.every((it, i) => it.s === hours[i * kept.every]), "every n-th label from the first");
  for (const lb of [wide, two, kept]) for (const it of lb.items) assert.ok(it.x0 >= 12 && it.x0 + it.w <= (lb === wide ? WIDE : PHONE) - 12, `the label ${it.s} stays 12px inside`);
  // Five long labels would keep only two at every 2nd or more, so they are refused.
  const long = ["January 2025", "February 2025", "March 2025", "April 2025", "May 2025"];
  assert.throws(() => labelsOf(long, at(20, 244, 5), PHONE, "on a phone"), /the column labels do not fit on a phone, even on two lines or with every 12th label; the widest is "February 2025"/);
});

test("a name wraps at its spaces, and breaks inside a word only when it must", () => {
  assert.deepEqual(wrapName("Open the sign-up page", 120, { size: 14, weight: 400 }), ["Open the sign-up", "page"]);
  for (const line of wrapName("Open the sign-up page", 80)) assert.ok(textWidth(line, 14, 600) <= 80, `"${line}" fits`);
  // A word wider than the room breaks between characters, unless every is false and the word is written with spaces.
  assert.deepEqual(wrapName("Notifications", 60, { size: 14, weight: 400, every: false }), ["Notifications"]);
  assert.ok(wrapName("Notifications", 60, { size: 14, weight: 400 }).length > 1);
  // Thai has no spaces: it breaks between whole characters, so a vowel mark stays with its consonant.
  const thai = wrapName("การแจ้งเตือนทั้งหมด", 60, { size: 14, weight: 400, every: false });
  assert.ok(thai.length > 1);
  assert.equal(thai.join(""), "การแจ้งเตือนทั้งหมด");
  assert.ok(thai.every((line) => !/^[ัิ-ฺ็-๎]/.test(line)), "no line starts with a Thai mark");
});

test("a count has a comma every three digits, and a share stays honest near 0 and 100", () => {
  assert.deepEqual([comma(0), comma(999), comma(1860), comma(999999999)], ["0", "999", "1,860", "999,999,999"]);
  assert.deepEqual([share(0, 9), share(9, 9), share(1, 2), share(1, 8), share(4, 1000), share(1, 2000), share(996, 1000), share(9999, 10000), share(45, 10000)], ["0%", "100%", "50%", "13%", "0.4%", "under 0.1%", "99.6%", "over 99.9%", "0.5%"]);
  assert.deepEqual([share(1, 200), share(3, 200)], ["1%", "2%"], "a half percent is rounded up, in whole numbers, so no rounding error moves it");
});

test("text is escaped for SVG and HTML, also in an attribute", () => {
  assert.equal(esc(`a < b & "c" > d`), "a &lt; b &amp; &quot;c&quot; &gt; d");
  assert.equal(esc(12), "12");
});

test("the table in words splits for paper into the fewest tables of equal size, each with the row names", () => {
  const hours = Array.from({ length: 24 }, (_, h) => `${h}:00`);
  const model = { columns: hours, rows: [{ name: "Monday", cells: hours.map((_, k) => k * 10) }, { name: "Tuesday", cells: hours.map(() => null) }] };
  const text = (c) => (c === null ? "no data" : comma(c));
  const parts = tablesOf(model, text);
  assert.ok(parts.length > 1, "24 hours do not fit one sheet");
  assert.equal(new Set(parts.slice(0, -1).map((p) => p.length)).size, 1, "the tables are of equal size");
  assert.deepEqual(parts.flat(), hours.map((_, k) => k), "every column once, in order");
  const html = gridTables(model, text, "The numbers of the heat map");
  assert.equal((html.match(/<table>/g) || []).length, parts.length);
  assert.equal((html.match(/<th scope="row">Monday<\/th>/g) || []).length, parts.length, "each table has the row names");
  assert.match(html, /aria-label="The numbers of the heat map, columns 0:00 to /);
  const small = { columns: ["A", "B", "C"], rows: [{ name: "R & D", cells: [1, 2, null] }] };
  assert.deepEqual(tablesOf(small, text), [[0, 1, 2]]);
  assert.equal(gridTables(small, text, "The grid"), '<div class="table-wrap" role="region" aria-label="The grid" tabindex="0"><table><thead><tr><td></td><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th></tr></thead><tbody><tr><th scope="row">R &amp; D</th><td>1</td><td>2</td><td>no data</td></tr></tbody></table></div>');
});

test("the line above a chart starts each sentence on a line, wraps at its spaces, and returns the y under it", () => {
  const s = { notes: [] };
  assert.equal(chart.headLines(s, ["Reports, bars from 0. Largest first."], WIDE), 36);
  assert.deepEqual(s.notes, [{ x: 20, y: 24, s: "Reports, bars from 0. Largest first.", cls: "sub", anchor: "start" }]);
  const t = { notes: [] };
  assert.equal(chart.headLines(t, ["Days, scale from 0. As in the app's menu.", "Second."], PHONE), 68);
  assert.deepEqual(t.notes.map((n) => [n.s, n.y]), [["Days, scale from 0. As in the app's", 24], ["menu.", 40], ["Second.", 56]]);
});

test("labels move apart and keep their order; their points never move", () => {
  const { apart } = chart;
  // Far apart: no label moves.
  assert.deepEqual(apart([{ at: 100, size: 30 }, { at: 300, size: 30 }], 12, 628, 8), [100, 300]);
  // At one point: they move apart evenly around it, the first written on the left.
  assert.deepEqual(apart([{ at: 100, size: 30 }, { at: 100, size: 30 }], 12, 252, 8), [81, 119]);
  // Near an edge: the group moves inside, and keeps the gap.
  assert.deepEqual(apart([{ at: 20, size: 30 }, { at: 22, size: 30 }], 12, 252, 8), [27, 65]);
  // Three labels where two meet: only those two move.
  assert.deepEqual(apart([{ at: 200, size: 20 }, { at: 50, size: 20 }, { at: 205, size: 20 }], 0, 400, 8), [188.5, 50, 216.5]);
  // Too long for the room: null, so the chart can refuse with a plain reason.
  assert.equal(apart([{ at: 50, size: 60 }, { at: 60, size: 60 }], 0, 100, 8), null);
});

test("a time axis may keep two labels as its last step, where a grid keeps three", () => {
  // 24 months on a phone plot of 153px: every 12th label is the last step, and it keeps two, January of each year.
  const labels = Array.from({ length: 24 }, (_, i) => (i % 12 ? "Mmm" : `Jan ${25 + i / 12}`));
  const at = (i) => 20 + (i * 153) / 23;
  assert.throws(() => labelsOf(labels, at, PHONE, "on a phone"), /the column labels do not fit on a phone/);
  const time = labelsOf(labels, at, PHONE, "on a phone", { least: 2 });
  assert.deepEqual([time.items.map((it) => it.s), time.every], [["Jan 25", "Jan 26"], 12]);
  // lo and hi keep labels inside a panel instead of the whole drawing.
  const panel = labelsOf(["Jan", "Feb", "Mar"], (i) => 100 + i * 40, WIDE, "in a panel", { lo: 104, hi: 200 });
  assert.equal(panel.items[0].x0, 104);
});

test("the value axis runs up the page, with its labels at least 24px apart", () => {
  const { upAxis } = chart;
  const ax = upAxis(read({ from: 0, to: 150, step: 50 }), 260, 60);
  assert.deepEqual([ax.y(0), ax.y(150), ax.y(75)], [260, 60, 160], "from at the bottom, to at the top");
  assert.deepEqual(ax.ticks.map((t) => [t.label, Math.round(t.y * 100) / 100]), [["0", 260], ["50", 193.33], ["100", 126.67], ["150", 60]]);
  // 20 steps in 100px: a step is 5px, so every 5th tick stands, 25px apart.
  const dense = upAxis(read({ from: 0, to: 100, step: 5 }), 200, 100);
  assert.deepEqual(dense.ticks.map((t) => t.label), ["0", "25", "50", "75", "100"]);
  assert.deepEqual(upAxis(readScale({ from: 0, to: 20 }, { needStep: false }), 300, 100).ticks, [], "a scale with no step has no ticks");
});
