// Bar charts: amounts as horizontal bars from 0, and the dumbbell form for two values in each row.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const bars = () => fixture("bar-reports");
const bells = () => fixture("bar-days");
const FONT = { row: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400] };
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "middle" ? n.x - w / 2 : n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
/** The marks of a scene: each bar, ring and dot, read from its SVG. */
const marks = (scene) => scene.parts.flatMap((p) => [
  ...[...p.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="4" class="([^"]+)"/g)].map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4], cls: m[5], w: +m[3], row: p.id })),
  ...[...p.svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" class="([^"]+)"/g)].map((m) => ({ x0: m[1] - m[3], x1: +m[1] + +m[3], y0: m[2] - m[3], y1: +m[2] + +m[3], cx: +m[1], r: +m[3], cls: m[4], row: p.id })),
]);
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** Two texts, or a text and a mark, that meet; and any text past the edges of the drawing. */
function clashes(scene) {
  const texts = scene.notes.map(box), out = [];
  texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => meet(a, b) && out.push(`${a.s} / ${b.s}`)));
  for (const t of texts) {
    for (const m of marks(scene)) if (meet(t, m)) out.push(`${t.s} / ${m.cls} of ${m.row}`);
    if (t.x0 < 12 || t.x1 > scene.w - 12) out.push(`${t.s} / edge`);
  }
  return out;
}
const words = (d) => renderDiagram(d).svg.split("<details")[1];
const order = (d) => renderDiagram(d).model.rows.map((r) => r.name);

for (const [name, data] of [["bar-reports", bars], ["bar-days", bells]]) {
  test(`${name} matches the stored drawing, in both forms`, () => {
    const { svg, form, warnings } = renderDiagram(data());
    assert.equal(form, "bar");
    assert.deepEqual(warnings, []);
    assert.match(svg, new RegExp(`width="640"[^>]*>[\\s\\S]*id="dg-${data().id}-phone"[^>]*width="264"`), "the 640px form and the 264px form");
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("the bar chart of the proposal has its sizes, in both forms", () => {
  const { scene, phone } = renderDiagram(bars());
  const ticks = (sc) => sc.notes.filter((n) => n.cls === "val" && n.y === sc.notes.find((m) => m.s === "0").y).map((n) => [n.s, Math.round(n.x)]);
  // Desktop: names 83px wide, bars from x = 119 to 588, every tick. Phone: bars from x = 20 to 212, every second tick.
  assert.deepEqual(ticks(scene), [["0", 119], ["100", 213], ["200", 307], ["300", 400], ["400", 494], ["500", 588]]);
  assert.deepEqual(ticks(phone), [["0", 20], ["200", 97], ["400", 174]]);
  assert.deepEqual(marks(scene).map((b) => [b.x0, Math.round(b.w * 10) / 10]), [[119, 386.5], [119, 251.4], [119, 216.7], [119, 91], [119, 60], [119, 16.9]]);
  assert.deepEqual(marks(phone).map((b) => Math.round(b.w * 10) / 10), [158.2, 102.9, 88.7, 37.3, 24.6, 6.9]);
  // A value stands 8px after the end of its bar.
  const v412 = scene.notes.find((n) => n.s === "412");
  assert.deepEqual([Math.round(v412.x * 100) / 100, v412.anchor], [513.46, "start"]);
  // The line above the chart, and each name on its own line above its bar on a phone.
  for (const sc of [scene, phone]) assert.equal(sc.notes[0].s, "Reports, bars from 0. Largest first.");
  const name = phone.notes.find((n) => n.s === "Sign-in"), bar = marks(phone)[0];
  assert.ok(name.y < bar.y0, "the name stands above its bar");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("a null value stays in the chart as no data, and the words name it", () => {
  const { scene, phone } = renderDiagram(bars());
  for (const sc of [scene, phone]) {
    const none = sc.notes.find((n) => n.s === "no data"), row = sc.notes.find((n) => n.s === "Notifications");
    assert.equal(none.cls, "sub");
    assert.equal(none.x, marks(sc)[0].x0, "where the bar would start");
    assert.ok(sc === scene ? none.y === row.y - 1 : none.y > row.y, "on the row of its name");
    assert.equal(sc.parts[6].svg, "", "no bar");
  }
  assert.match(words(bars()), /<th scope="row">Notifications<\/th><td>no data<\/td><\/tr><\/tbody>[\s\S]*<li>No data: Notifications\.<\/li>/);
  // A row with no "value" at all is refused: a missing number must be a choice.
  const d = bars(); delete d.rows[6].value;
  assert.throws(() => renderDiagram(d), /row 7 \("Notifications"\) has no "value"; write its number, or null when it is not known/);
});

test("the diagram in words is a table in the order of the drawing, with the line above the chart", () => {
  const w = words(bars());
  assert.match(w, /aria-label="The rows of the bar chart"/);
  assert.match(w, /<tr><th scope="col">Row<\/th><th scope="col">Value, in reports<\/th><\/tr>/);
  assert.deepEqual([...w.matchAll(/<th scope="row">([^<]+)</g)].map((m) => m[1]), ["Sign-in", "Search", "Checkout", "Settings", "Profile", "Help pages", "Notifications"]);
  assert.match(w, /<li>Reports, bars from 0\. Largest first\.<\/li>/);
  const b = words(bells());
  assert.match(b, /<tr><th scope="col">Row<\/th><th scope="col">2025<\/th><th scope="col">2026<\/th><th scope="col">Change, in days<\/th><\/tr>/);
  assert.match(b, /<th scope="row">Sign-in<\/th><td>9<\/td><td>4<\/td><td>−5<\/td>/);
  assert.match(b, /<th scope="row">Checkout<\/th><td>6<\/td><td>8<\/td><td>\+2<\/td>/);
  assert.match(b, /<th scope="row">Profile<\/th><td>5<\/td><td>5<\/td><td>0<\/td>/);
  assert.match(b, /<li>Days, scale from 0\. As in the app's menu\.<\/li>/);
});

test("a value below 0 runs left of a muted 0 line, with its value on its left", () => {
  const d = bars();
  d.scale = { from: -50, to: 50, step: 25, unit: "points" };
  d.rows = [{ name: "Sign-in", value: 32 }, { name: "Search", value: -41 }, { name: "Checkout", value: 0 }, { name: "Profile", value: null }, { name: "Help", value: -12.5 }];
  const { scene, phone, svg } = renderDiagram(d);
  for (const sc of [scene, phone]) {
    const zero = sc.notes.find((n) => n.s === "0" && n.cls === "val").x;
    const [up, down] = [marks(sc).find((m) => m.row === "Sign-in"), marks(sc).find((m) => m.row === "Search")];
    assert.equal(up.x0, zero, "a bar above 0 starts at 0");
    assert.equal(Math.round(down.x1 * 100) / 100, zero, "a bar below 0 ends at 0");
    const v = sc.notes.find((n) => n.s === "−41");
    assert.deepEqual([v.anchor, v.x], ["end", down.x0 - 8]);
    assert.equal(sc.parts.find((p) => p.id === "Checkout").svg, "", "a value of 0 has no bar");
    assert.equal(sc.notes.find((n) => n.s === "no data").x, zero, "no data stands where the bar would start");
    assert.ok(sc.under.some((u) => u.includes(`x1="${zero}"`) && u.includes('class="r-ref"')), "the 0 line");
    assert.deepEqual(clashes(sc), []);
  }
  assert.match(svg, /\.r-ref\{stroke:var\(--muted,#575d75\)\}/);
  assert.deepEqual(order(d), ["Sign-in", "Checkout", "Help", "Search", "Profile"], "largest first, by value, with no data last");
  // With no value below 0 there is no 0 line.
  assert.deepEqual(renderDiagram(bars()).scene.under, []);
});

test("on a scale that ends at 0, no data stands left of 0 and stays inside the drawing", () => {
  const d = bars();
  d.scale = { from: -100, to: 0, step: 25, unit: "points" };
  d.rows = [{ name: "Sign-in", value: -30 }, { name: "Search", value: null }];
  const { scene, phone } = renderDiagram(d);
  for (const sc of [scene, phone]) {
    const zero = sc.notes.find((n) => n.s === "0" && n.cls === "val").x, none = sc.notes.find((n) => n.s === "no data");
    assert.deepEqual([none.anchor, none.x], ["end", zero - 8]);
    assert.ok(none.knock.x + none.knock.w <= sc.w - 8);
    assert.deepEqual(clashes(sc), []);
  }
});

test("a bar narrower than 2px is drawn 2px wide, and the words say so", () => {
  const d = bars();
  d.rows[5].value = 0.4;
  const { scene, phone, svg } = renderDiagram(d);
  assert.equal(marks(scene)[5].w, 2);
  assert.equal(marks(phone)[5].w, 2);
  assert.ok(scene.clamped && phone.clamped);
  assert.match(svg, /<li>A bar narrower than 2px is drawn 2px wide, so it shows; its number gives the exact value\.<\/li>/);
  assert.doesNotMatch(words(bars()), /narrower than 2px/);
});

test("a dumbbell draws a ring, a dot and a muted line, with its values outside the pair and its series above the first row", () => {
  const { scene, phone } = renderDiagram(bells());
  for (const sc of [scene, phone]) {
    const row = (name) => marks(sc).filter((m) => m.row === name);
    const [ring, dot] = row("Sign-in");
    assert.deepEqual([ring.cls, ring.r, dot.cls, dot.r], ["d-ring", 4.25, "r-pt", 5], "the first value a ring 10px across, the second a dot 10px across");
    assert.match(sc.parts[0].svg, /<line [^>]*class="d-gap"\/>/);
    // 9 to 4: the smaller value left of the left mark, the larger right of the right mark, 8px outside each mark.
    const [four, nine] = ["4", "9"].map((s) => sc.notes.find((n) => n.s === s && n.y > sc.notes.find((m) => m.s === "Sign-in").y - 30));
    assert.deepEqual([four.anchor, four.x], ["end", dot.cx - 13]);
    assert.deepEqual([nine.anchor, nine.x], ["start", ring.cx + 13]);
    // The series names stand above the marks of the first row, centred on them.
    const names = sc.notes.filter((n) => n.s === "2025" || n.s === "2026");
    assert.deepEqual(names.map((n) => [n.s, n.x]), [["2025", ring.cx], ["2026", dot.cx]]);
    assert.ok(names.every((n) => n.y < ring.y0 - 8));
    assert.deepEqual(clashes(sc), []);
  }
});

test("two equal dumbbell values are a smaller dot inside the ring, written once", () => {
  const { scene, phone } = renderDiagram(bells());
  for (const sc of [scene, phone]) {
    const profile = marks(sc).filter((m) => m.row === "Profile");
    assert.deepEqual(profile.map((m) => [m.cls, m.r]), [["d-ring", 4.25], ["r-pt", 3]]);
    assert.equal(profile[0].cx, profile[1].cx);
    assert.doesNotMatch(sc.parts[4].svg, /d-gap/, "no line between equal values");
    assert.equal(sc.notes.filter((n) => n.s === "5" && n.cls === "val" && n.x === profile[0].cx + 13).length, 1);
  }
});

test("marks that touch never move: the dot lies over the ring, and both values are written", () => {
  const d = bells();
  d.rows[2].values = [6, 6.3];
  const { scene, phone } = renderDiagram(d);
  for (const sc of [scene, phone]) {
    const [ring, dot] = marks(sc).filter((m) => m.row === "Checkout");
    assert.ok(dot.cx - ring.cx < 10, "closer than 10px");
    assert.equal(ring.cx, sc.notes.find((n) => n.s === "0").x + 6 * (sc.notes.find((n) => n.s === "20").x - sc.notes.find((n) => n.s === "0").x) / 20, "the ring at its true value");
    assert.ok(sc.parts[2].svg.indexOf("r-pt") > sc.parts[2].svg.indexOf("d-ring"), "the dot is drawn after the ring");
    assert.ok(["6", "6.3"].every((s) => sc.notes.some((n) => n.s === s)));
    assert.deepEqual(clashes(sc), []);
  }
  // Series names over marks that touch move apart, with a thin line to each mark.
  const first = bells();
  first.rows[0].values = [6, 6.3];
  for (const sc of [renderDiagram(first).scene, renderDiagram(first).phone]) {
    const names = sc.notes.filter((n) => n.s === "2025" || n.s === "2026");
    assert.ok(box(names[1]).x0 - box(names[0]).x1 >= 7.99, "8px apart");
    assert.equal((sc.parts[0].svg.match(/class="d-lead"/g) || []).length, 2);
    assert.deepEqual(clashes(sc), []);
  }
});

test("a dumbbell row with one null draws the known mark alone, and the words name it", () => {
  const d = bells();
  d.rows[1].values = [12, null];
  d.rows[3].values = [null, 6];
  d.rows[4].values = [null, null];
  const { scene, phone, svg } = renderDiagram(d);
  for (const sc of [scene, phone]) {
    assert.deepEqual(marks(sc).filter((m) => m.row === "Search").map((m) => m.cls), ["d-ring"]);
    assert.deepEqual(marks(sc).filter((m) => m.row === "Settings").map((m) => m.cls), ["r-pt"]);
    assert.ok(sc.notes.some((n) => n.s === "12; no data for 2026") && sc.notes.some((n) => n.s === "6; no data for 2025"));
    assert.equal(sc.parts[4].svg, "", "a row with no numbers has no mark");
    assert.ok(sc.notes.some((n) => n.s === "no data"));
    assert.deepEqual(clashes(sc), []);
  }
  assert.match(svg, /<li>No data for 2025: Settings, Profile\.<\/li><li>No data for 2026: Search, Profile\.<\/li>/);
  assert.match(svg, /<th scope="row">Search<\/th><td>12<\/td><td>no data<\/td><td>no data<\/td>/);
  // When the first row has one number, the series names stand above the first row with both.
  d.rows[0].values = [9, null];
  const names = renderDiagram(d).scene.notes.filter((n) => n.s === "2025" || n.s === "2026");
  assert.equal(new Set(names.map((n) => n.y)).size, 1);
  assert.ok(names[0].y > renderDiagram(d).scene.notes.find((n) => n.s === "Search").y, "above Checkout, the first row with both");
});

test("each order sorts the rows and says so in the line above the chart", () => {
  const head = (d) => renderDiagram(d).scene.notes[0].s;
  assert.deepEqual(order(bars()), ["Sign-in", "Search", "Checkout", "Settings", "Profile", "Help pages", "Notifications"]);
  const def = bars(); delete def.order;
  assert.deepEqual(order(def), order(bars()), "largest is the default");
  const small = bars(); small.order = "smallest";
  assert.deepEqual(order(small), ["Help pages", "Profile", "Settings", "Checkout", "Search", "Sign-in", "Notifications"], "no data goes last");
  assert.equal(head(small), "Reports, bars from 0. Smallest first.");
  const written = bars(); written.order = "written"; written.orderNote = "as in the app's menu"; written.rows.reverse();
  assert.deepEqual(order(written), ["Notifications", "Help pages", "Profile", "Settings", "Checkout", "Search", "Sign-in"]);
  assert.equal(head(written), "Reports, bars from 0. As in the app's menu.");
  // Equal values keep the order they were written in.
  const tie = bars(); tie.rows[1].value = 231;
  assert.deepEqual(order(tie).slice(1, 3), ["Search", "Checkout"]);
  // A dumbbell: by the second value, or by the size of the change, rise or fall.
  const d = bells(); d.order = "largest"; delete d.orderNote;
  assert.deepEqual(order(d), ["Checkout", "Search", "Settings", "Profile", "Sign-in"]);
  assert.equal(head(d), "Days, scale from 0. Sorted by 2026, largest first.");
  d.order = "smallest";
  assert.deepEqual(order(d), ["Sign-in", "Profile", "Settings", "Search", "Checkout"]);
  assert.equal(head(d), "Days, scale from 0. Sorted by 2026, smallest first.");
  d.order = "change";
  assert.deepEqual(order(d), ["Settings", "Sign-in", "Search", "Checkout", "Profile"]);
  assert.equal(head(d), "Days, scale from 0. Largest change first.");
  d.rows[0].values = [9, null];
  assert.equal(order(d).at(-1), "Sign-in", "a row with no change to sort by goes last");
  // Groups keep their order, and the rows are sorted inside each.
  const g = bars();
  g.groups = [{ id: "web", name: "Web app" }, { id: "phone", name: "Phone app" }];
  g.rows = [{ name: "Help", value: 18, group: "web" }, { name: "Sign-in", value: 412, group: "web" }, { name: "Search", value: 120, group: "phone" }, { name: "Settings", value: 301, group: "phone" }];
  assert.deepEqual(order(g), ["Sign-in", "Help", "Settings", "Search"]);
  const { scene, phone } = renderDiagram(g);
  assert.equal(scene.bands.length, 2);
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
  assert.match(words(g), /<th scope="col">Group<\/th>[\s\S]*<td>Web app<\/td>/);
});

test("a dumbbell's scale may start above 0, and the line above the chart says where", () => {
  const d = bells();
  d.scale = { from: 80, to: 100, step: 5, unit: "percent" };
  d.series = ["Last year", "This year"];
  d.rows = [{ name: "Sign-in", values: [91, 95] }, { name: "Search", values: [88, 90] }, { name: "Checkout", values: [97, 96] }];
  const { scene, phone } = renderDiagram(d);
  assert.equal(scene.notes[0].s, "Percent, scale from 80. As in the app's menu.");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("long names wrap on a phone, and a name without spaces breaks between characters", () => {
  const d = bars();
  d.rows[0].name = "Sign-in with a single key";
  d.rows[1].name = "打开注册页面并填写表格然后确认电子邮件选择";
  const { scene, phone } = renderDiagram(d);
  assert.ok(phone.notes.filter((n) => n.cls === "row" && /\p{Script=Han}/u.test(n.s)).length >= 2);
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("wrong bar data is refused with a plain reason", () => {
  const broken = (make, change, reason) => { const d = make(); change(d); assert.throws(() => renderDiagram(d), reason); };
  broken(bars, (d) => (d.scale = { from: 40, to: 440, step: 100 }), /a bar starts at 0; a scale from 40 cuts every bar short, so their lengths no longer compare\. Start the scale at 0, or use a range chart to show where values fall/);
  broken(bars, (d) => (d.scale = { from: -100, to: -10, step: 10 }), /a bar starts at 0; a scale that ends at −10 does not reach 0\. End the scale at 0 or above/);
  broken(bars, (d) => (d.scale = { from: -100, to: 500, step: 100 }), /the scale starts at −100, but no value is below 0; a bar starts at 0, so start the scale at 0/);
  broken(bars, (d) => (d.scale.marks = [{ at: 300, name: "Goal" }]), /a bar chart has no "marks" in its scale; say a target or a limit in the text beside the figure/);
  broken(bars, (d) => delete d.scale.step, /"scale" needs a "step"/);
  broken(bars, (d) => (d.rows[0].value = 600), /row 1 \("Sign-in"\) has "value": 600; it must be a number on the scale, from 0 to 500, or null when it is not known/);
  broken(bars, (d) => (d.rows[0].value = "412"), /row 1 \("Sign-in"\) has "value": "412"; it must be a number on the scale/);
  broken(bars, (d) => delete d.rows[2].value, /row 3 \("Checkout"\) has no "value"; write its number, or null when it is not known/);
  broken(bars, (d) => (d.rows[2].values = [1, 2]), /row 3 \("Checkout"\) has "values", but the chart has no "series"; give each row one "value", or name the two series in "series" to draw a dumbbell/);
  broken(bars, (d) => (d.rows = d.rows.slice(0, 1)), /a bar chart has 2 to 16 rows; this one has 1/);
  broken(bars, (d) => (d.rows = Array.from({ length: 17 }, (_, i) => ({ name: `R${i}`, value: i }))), /a bar chart has 2 to 16 rows; this one has 17/);
  broken(bars, (d) => (d.rows = "x"), /"rows" must be a list/);
  broken(bars, (d) => (d.rows[1] = 4), /row 2 must be an object with a "name" and its "value"/);
  broken(bars, (d) => (d.rows[1].name = "The search box at the top of every page"), /the name of row 2 is 39 characters long; the most is 28/);
  broken(bars, (d) => d.rows.forEach((r) => (r.value = null)), /every value is null, so the chart has nothing to draw/);
  broken(bars, (d) => (d.order = "biggest"), /"order" must be "largest", "smallest" or "written", or "change" for a chart with "series"/);
  broken(bars, (d) => (d.order = "change"), /"order": "change" sorts the rows of a dumbbell by how much each changed; a chart with one value in each row has no change/);
  broken(bars, (d) => (d.order = "written"), /"order": "written" needs "orderNote", which says how the rows are sorted, such as "oldest release first"/);
  broken(bars, (d) => (d.orderNote = "by area"), /"orderNote" is only for "order": "written"; for the order "largest", render says the order itself/);
  broken(bells, (d) => (d.orderNote = "as in the menu of the app, top to bottom"), /"orderNote" is 40 characters long; the most is 32/);
  broken(bells, (d) => (d.series = ["2026"]), /"series" must be a list of two names, one for each value of a row, such as \["2025", "2026"\]/);
  broken(bells, (d) => (d.series = ["2026", "2026"]), /the two series have the same name, "2026"/);
  broken(bells, (d) => (d.series = ["The year before last", "2026"]), /series name 1 is 20 characters long; the most is 16/);
  broken(bells, (d) => (d.rows[0] = { name: "Sign-in", value: 4 }), /row 1 \("Sign-in"\) has "value"; with "series", each row has "values", a list of two numbers, one for each series/);
  broken(bells, (d) => (d.rows[0].values = [9]), /row 1 \("Sign-in"\) needs "values", a list of two numbers, one for "2025" and one for "2026"; write null for a number that is not known/);
  broken(bells, (d) => (d.rows[0].values = [9, 25]), /row 1 \("Sign-in"\) has "2026": 25; it must be a number on the scale, from 0 to 20, or null when it is not known/);
  broken(bells, (d) => (d.series = ["WWWWWWWWWWWWWWWW", "MMMMMMMMMMMMMMMM"]), /the series names "WWWWWWWWWWWWWWWW" and "MMMMMMMMMMMMMMMM" do not fit side by side on a phone; shorten them/);
  broken(bars, (d) => (d.groups = [{ id: "a", name: "A" }]), /row 1 \("Sign-in"\) names no group; when a chart has groups, every row names one in "group"/);
  broken(bars, (d) => (d.rows[0].group = "a"), /row 1 \("Sign-in"\) names a group, but the chart has no "groups"/);
  broken(bars, (d) => { d.groups = [{ id: "a", name: "A" }, { id: "b", name: "B" }]; d.rows.forEach((r, i) => (r.group = i % 2 ? "a" : "b")); }, /the rows of the group "a" do not stand together; put them one after another/);
  broken(bars, (d) => { d.groups = [1, 2, 3, 4].map((n) => ({ id: `g${n}`, name: `G${n}` })); }, /a bar chart has at most 3 groups; this one has 4/);
  broken(bars, (d) => (d.form = "wide"), /a bar chart has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  broken(bars, (d) => (d.place = "walk"), /a bar chart sits in the text flow; "place" must be "flow"/);
});

test("the fit warnings name a sentence when a bar chart shows little", () => {
  const two = bars(); two.rows = two.rows.slice(0, 2);
  assert.deepEqual(renderDiagram(two).warnings, ["the bar chart has 2 rows; a sentence says this more simply"]);
  const same = bars(); same.rows.forEach((r) => r.value != null && (r.value = 50));
  assert.deepEqual(renderDiagram(same).warnings, ["every value is the same; a sentence says this more simply"]);
  const still = bells(); still.rows.forEach((r) => (r.values = [5, 5]));
  assert.deepEqual(renderDiagram(still).warnings, ["no row changes; a sentence says this more simply"]);
});

test("a bar chart takes every color from the page tokens, and has no state, no moving dot and nothing dashed", () => {
  for (const d of [bars(), bells()]) {
    const { svg } = renderDiagram(d);
    assert.doesNotMatch(svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, ""), /#[0-9a-f]{6}\b|rgb\(|hsl\(/i);
    assert.doesNotMatch(svg, /is-(ok|warn|err)|class="pulse|dasharray|--primary/);
  }
  assert.match(renderDiagram(bells()).svg, /\.d-ring\{fill:var\(--bg,#fbfbfe\);stroke:var\(--text,#1c1f2e\);stroke-width:1\.5\}/);
});

test("check accepts a bar chart that render drew, and reports one that was changed by hand", () => {
  const block = (d) => `<figure><div class="fig" role="region" aria-label="Figure 1, ${d.id}" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(d, null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Reports.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block(bars())}${block(bells())}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace(">412<", ">512<")).errors.join("\n"), /\("reports-by-area"\): the drawing does not match its data; run render/);
});
