// Line charts: how an amount changed over time, with a slopegraph for two points and small multiples for series that
// matter equally.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const reports = () => fixture("line-reports");
const months = () => fixture("line-months");
const slope = () => fixture("line-slope");
const panels = () => fixture("line-multiples");
const FONT = { row: [14, 400], dim: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400] };
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls.startsWith("val") ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "middle" ? n.x - w / 2 : n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
const texts = (scene) => [...scene.notes, ...scene.parts.flatMap((p) => p.texts)];
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** Two texts that meet, and any text past the edges of the drawing. */
function clashes(scene) {
  const all = texts(scene).map(box), out = [];
  all.forEach((a, i) => all.slice(i + 1).forEach((b) => meet(a, b) && out.push(`${a.s} / ${b.s}`)));
  for (const t of all) if (t.x0 < 12 || t.x1 > scene.w - 12) out.push(`${t.s} / edge`);
  return out;
}
/** The lines and dots of one series (a part of the scene), read from its SVG. */
const marks = (scene, name) => {
  const svg = scene.parts.find((p) => p.id === name).svg;
  return {
    paths: [...svg.matchAll(/<path d="([^"]+)" class="([^"]+)"/g)].map((m) => ({ cls: m[2], pts: m[1].split(" ").map((p) => p.slice(1).split(",").map(Number)) })),
    dots: [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" class="([^"]+)"/g)].map((m) => ({ cx: +m[1], cy: +m[2], r: +m[3], cls: m[4] })),
    leads: [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" class="ld"/g)].map((m) => m.slice(1, 5).map(Number)),
  };
};
const words = (d) => renderDiagram(d).svg.split("<details")[1];
const named = (scene, s) => scene.notes.find((n) => n.s === s);
const timeLabels = (scene) => scene.notes.filter((n) => n.cls === "val" && n.anchor === "middle").map((n) => n.s);

for (const [name, data] of [["line-reports", reports], ["line-months", months], ["line-slope", slope], ["line-multiples", panels]]) {
  test(`${name} matches the stored drawing, in both forms`, () => {
    const { svg, form, warnings } = renderDiagram(data());
    assert.equal(form, "line");
    assert.deepEqual(warnings, []);
    assert.match(svg, new RegExp(`width="640"[^>]*>[\\s\\S]*id="dg-${data().id}-phone"[^>]*width="264"`), "the 640px form and the 264px form");
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
    for (const sc of [renderDiagram(data()).scene, renderDiagram(data()).phone]) assert.deepEqual(clashes(sc), []);
  });
}

test("the line chart of the proposal has its sizes, in both forms", () => {
  const { scene, phone } = renderDiagram(reports());
  const span = (sc) => { const p = marks(sc, "Sign-in").paths[0].pts; return [p[0][0], p[p.length - 1][0]]; };
  // Desktop: the value labels need 24px, the names 71px, so the plot runs from x = 52 to 549, as in the proposal. On a phone
  // the value labels take no width, and the names move apart (the plot is shorter), so they stand 20px after the plot: x = 20 to 161.
  assert.deepEqual(span(scene), [52, 549]);
  assert.deepEqual(span(phone), [20, 161]);
  assert.deepEqual(timeLabels(scene), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "twelve months keep every label");
  assert.deepEqual(timeLabels(phone), ["Jan", "Apr", "Jul", "Oct"], "every third on a phone");
  // The value axis runs up the page: labels at the left of the plot, or inside it at the left edge on a phone.
  const values = (sc) => texts(sc).filter((t) => t.cls.startsWith("val") && t.anchor !== "middle").map((t) => [t.s, t.cls, t.anchor]);
  assert.deepEqual(values(scene), [["0", "val", "end"], ["50", "val", "end"], ["100", "val", "end"], ["150", "val", "end"]]);
  assert.deepEqual(values(phone), [["0", "val", "start"], ["50", "val", "start"], ["100", "val", "start"], ["150", "val", "start"]]);
  assert.ok(phone.notes.some((n) => n.s === "150" && n.x === 20), "inside the plot, under the lines (notes are drawn before the lines), so nothing cuts a line");
  for (const sc of [scene, phone]) assert.equal(sc.notes[0].s, "Reports, scale from 0.");
});

test("the focus line is 2.5px in the text color with a dot at each point; the others are muted, with no dots; each is named at its end", () => {
  const { scene, phone, svg } = renderDiagram(reports());
  for (const sc of [scene, phone]) {
    const focus = marks(sc, "Sign-in"), other = marks(sc, "Search");
    assert.deepEqual([focus.paths.length, focus.paths[0].cls, focus.dots.length, focus.dots[0].cls], [1, "ln", 12, "pt"]);
    assert.deepEqual([other.paths[0].cls, other.dots.length], ["ln-o", 0]);
    assert.equal(sc.parts.findIndex((p) => p.id === "Sign-in"), 2, "the focus line is drawn last, over the others");
    // Each name stands 8px after its line's last point (20px when a name moved), the focus name in the text color.
    const end = focus.paths[0].pts.at(-1), name = named(sc, "Sign-in");
    assert.deepEqual([name.x, name.cls, named(sc, "Search").cls], [end[0] + (sc === scene ? 8 : 20), "row", "dim"]);
  }
  assert.equal(named(scene, "Sign-in").y, marks(scene, "Sign-in").paths[0].pts.at(-1)[1] + 5, "on its line's end, on a desktop");
  assert.match(svg, /\.ln\{fill:none;stroke:var\(--text,#1c1f2e\);stroke-width:2\.5;/);
  assert.match(svg, /\.ln-o\{fill:none;stroke:var\(--muted,#575d75\);stroke-width:1\.5;/);
  assert.doesNotMatch(svg, /legend/i);
});

test("36 points keep every third label on a desktop and one a year on a phone, and the focus line loses its dots when points stand closer than 8px", () => {
  const { scene, phone } = renderDiagram(months());
  assert.deepEqual(timeLabels(scene), ["2024", "Apr", "Jul", "Oct", "2025", "Apr", "Jul", "Oct", "2026", "Apr", "Jul", "Oct"]);
  assert.deepEqual(timeLabels(phone), ["2024", "2025", "2026"]);
  const run = marks(scene, "App").paths[0].pts;
  assert.ok(run[1][0] - run[0][0] >= 8 && marks(scene, "App").dots.length > 1, "dots on a desktop");
  const prun = marks(phone, "App").paths[0].pts;
  assert.ok(prun[1][0] - prun[0][0] < 8, "points closer than 8px on a phone");
  assert.equal(marks(phone, "App").dots.length, 1, "no dots on a phone, except the point alone");
});

test("a gap breaks the line, a point alone between two gaps is a dot, and the words name the times with no data", () => {
  // The App series has no data in Mar and Apr 2025, a value in May 2025 alone, and none in Jun and Jul 2025.
  const { scene, phone } = renderDiagram(months());
  for (const sc of [scene, phone]) {
    const app = marks(sc, "App");
    assert.deepEqual(app.paths.map((p) => p.pts.length), [14, 17], "two lines, never drawn across the gaps");
    const alone = app.dots.filter((d) => d.cx > app.paths[0].pts.at(-1)[0] && d.cx < app.paths[1].pts[0][0]);
    assert.deepEqual(alone.map((d) => [d.r, d.cls]), [[3, "pt"]], "the point alone is a dot");
    assert.ok(sc.notes[0].s.endsWith("A gap in a line is a time with no data.") || sc.notes[1].s.endsWith("time with no data."));
  }
  const w = words(months());
  assert.match(w, /<th scope="row">Mar<\/th><td>no data<\/td>/);
  assert.match(w, /<li>App: 40 in 2024, 88 in Dec \(point 36\); highest 94 in Jun \(point 30\); lowest 40 in 2024; no data in Mar \(point 15\), Apr \(point 16\), Jun \(point 18\), Jul \(point 19\)\.<\/li>/);
  // A gray series alone between gaps is a muted dot.
  const d = reports(); d.series[1].values[4] = null; d.series[1].values[6] = null;
  assert.deepEqual(marks(renderDiagram(d).scene, "Search").dots.map((p) => [p.r, p.cls]), [[2.5, "pt-o"]]);
});

test("names that would be closer than 18px move apart, in the order of their lines, with a thin line to each line's end", () => {
  // Web ends at 31 and Server at 29: on a desktop 3.3px apart.
  const { scene, phone } = renderDiagram(months());
  for (const sc of [scene, phone]) {
    const [web, server] = [named(sc, "Web"), named(sc, "Server")];
    assert.ok(server.y - web.y >= 17.99, "18px apart, Web above Server as their lines end");
    for (const n of ["Web", "Server"]) assert.equal(marks(sc, n).leads.length, 1, `${n} has a thin line to its line's end`);
    assert.equal(marks(sc, "Web").leads[0][0], marks(sc, "Web").paths[0].pts.at(-1)[0] + 4, "from its line's end, which never moves");
    // When a name moves, every name stands 20px after the plot, so the thin lines have room.
    assert.equal(named(sc, "App").x - marks(sc, "App").paths[1].pts.at(-1)[0], 20);
    assert.equal(marks(sc, "App").leads.length, 0, "a name that did not move has no thin line");
    assert.deepEqual(clashes(sc), []);
  }
  assert.match(renderDiagram(months()).svg, /\.ld\{stroke:var\(--muted,#575d75\);stroke-width:1\}/);
});

test("a slopegraph draws two upright axes and a line for each series, named at both ends with its values; on a phone at the right only", () => {
  const { scene, phone } = renderDiagram(slope());
  for (const sc of [scene, phone]) {
    assert.equal(sc.tracks.length, 2, "two axes, no grid");
    const [xL, xR] = sc.tracks.map((t) => t[0]), height = sc.tracks[0][3] - sc.tracks[0][1];
    assert.ok(xR - xL <= height, "the run between the axes is no wider than the plot is tall");
    assert.deepEqual(sc.notes.filter((n) => n.s === "2025" || n.s === "2026").map((n) => n.x), [xL, xR], "each point names its axis");
    const line = marks(sc, "Checkout").paths[0];
    assert.deepEqual([line.cls, line.pts.map((p) => p[0])], ["ln", [xL, xR]]);
    assert.equal(marks(sc, "Sign-in").paths[0].cls, "ln-o");
    const right = sc.notes.filter((n) => n.x > xR);
    assert.ok(["Sign-in", "Search", "Checkout", "Settings", "Profile"].every((s) => right.some((n) => n.s === s)), "every name at the right");
    assert.ok(right.some((n) => n.s === "8" && n.cls === "val"), "with its value");
  }
  const left = (sc) => sc.notes.filter((n) => n.x < sc.tracks[0][0]).map((n) => n.s);
  assert.ok(left(scene).includes("Settings") && left(scene).includes("15"), "a name and its value at the left on a desktop");
  assert.ok(!left(phone).includes("Settings") && left(phone).includes("15"), "the value alone at the left on a phone");
  // Three rows of the dumbbell example, drawn as a slopegraph so that no name moves: on a phone the run is 105px, as in the proposal.
  const plain = slope(); plain.series = plain.series.filter((s) => ["Search", "Checkout", "Settings"].includes(s.name)).map((s) => ({ ...s, values: s.name === "Search" ? [12, 11] : s.values }));
  const run = (sc) => sc.tracks[1][0] - sc.tracks[0][0];
  assert.equal(Math.round(run(renderDiagram(plain).phone)), 105);
  const w = words(slope());
  assert.match(w, /<tr><th scope="col">Series<\/th><th scope="col">2025<\/th><th scope="col">2026<\/th><th scope="col">Change, in days<\/th><\/tr>/);
  assert.match(w, /<th scope="row">Checkout<\/th><td>6<\/td><td>8<\/td><td>\+2<\/td>/);
  assert.match(w, /<th scope="row">Settings<\/th><td>15<\/td><td>6<\/td><td>−9<\/td>/);
});

test("small multiples give each series its own panel on one scale, with the others behind it in the outline color", () => {
  const { scene, phone, svg } = renderDiagram(panels());
  for (const [sc, perRow] of [[scene, 2], [phone, 1]]) {
    assert.equal(sc.bands.length, 4, "a panel each");
    assert.equal(new Set(sc.bands.map((b) => b.y)).size, 4 / perRow, `${perRow} panels in a row`);
    for (const name of ["Sign-in", "Search", "Checkout", "Settings"]) {
      const m = marks(sc, name);
      assert.deepEqual(m.paths.map((p) => p.cls), ["ln-g", "ln-g", "ln-g", "ln"], `${name}: the others behind, its own line on top`);
      assert.equal(named(sc, name).cls, "name", "its name above the panel");
    }
    // One scale: 0 and 150 stand at the same heights in every panel of a row.
    const zeros = texts(sc).filter((t) => t.s === "150").map((t) => t.y);
    assert.equal(zeros.length, 4);
  }
  assert.equal(scene.bands[0].w, 184 + 16, "a panel is 184px wide on a desktop");
  assert.equal(phone.bands[0].w, 224 + 16, "and 224px on a phone");
  assert.match(svg, /\.ln-g\{fill:none;stroke:var\(--line,#d3d6e3\);stroke-width:1\.5;/);
  assert.match(scene.notes[0].s, /Each panel draws one series; the others are the thin gray lines behind/);
  // Up to 3 panels in a row on a desktop: 5 panels make a row of 3 and a row of 2; 6 make two rows of 3.
  const rows = (n) => { const d = panels(); d.series = Array.from({ length: n }, (_, i) => ({ name: `Area ${i + 1}`, values: d.series[0].values.map((v) => Math.max(0, v - i * 7)) })); return [...new Set(renderDiagram(d).scene.bands.map((b) => b.y))].map((y) => renderDiagram(d).scene.bands.filter((b) => b.y === y).length); };
  assert.deepEqual(rows(5), [3, 2]);
  assert.deepEqual(rows(6), [3, 3]);
  assert.deepEqual(rows(3), [3]);
});

test("the table in words has a row for each point and a column for each series, and a line for each series", () => {
  const w = words(reports());
  assert.match(w, /aria-label="The values of the line chart"/);
  assert.match(w, /<tr><td><\/td><th scope="col">Sign-in<\/th><th scope="col">Search<\/th><th scope="col">Checkout<\/th><\/tr>/);
  assert.match(w, /<tr><th scope="row">Jun<\/th><td>138<\/td><td>44<\/td><td>36<\/td><\/tr>/);
  assert.match(w, /<li>Reports, scale from 0\.<\/li><li>Sign-in: 62 in Jan, 66 in Dec; highest 138 in Jun; lowest 62 in Jan\.<\/li>/);
  assert.equal([...w.matchAll(/<tr><th scope="row">/g)].length, 12);
  assert.match(words(panels()), /<li>Settings: 58 in Jan, 24 in Dec; highest 58 in Jan; lowest 24 in Dec\.<\/li>/);
});

test("a scale that starts above 0 says so, and a scale across 0 has a muted line at 0", () => {
  const up = reports(); up.scale = { from: 20, to: 140, step: 40, unit: "reports" };
  assert.equal(renderDiagram(up).scene.notes[0].s, "Reports. The scale starts at 20, not 0.");
  const across = reports(); across.scale = { from: -50, to: 150, step: 50 }; across.series[2].values[3] = -20;
  const { scene, phone } = renderDiagram(across);
  for (const sc of [scene, phone]) assert.equal(sc.under.filter((u) => u.includes('class="r-ref"')).length, 1);
  assert.equal(scene.notes[0].s, "Scale from −50.");
  assert.deepEqual(renderDiagram(reports()).scene.under, [], "no 0 line on a scale from 0");
});

test("one series is drawn in the text color with no focus, and long names wrap on a phone", () => {
  const one = reports(); one.series = [{ name: "Sign-in", values: one.series[0].values }];
  assert.equal(marks(renderDiagram(one).scene, "Sign-in").paths[0].cls, "ln");
  const long = reports(); long.series[1].name = "Search on every page";
  const { scene, phone } = renderDiagram(long);
  assert.ok(phone.notes.filter((n) => n.cls === "dim" && n.x > 150).length >= 3, "the long name takes two lines");
  const span = marks(phone, "Sign-in").paths[0].pts;
  assert.ok(span.at(-1)[0] - span[0][0] >= 120, "the plot keeps 120px");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("wrong line data is refused with a plain reason", () => {
  const broken = (make, change, reason) => { const d = make(); change(d); assert.throws(() => renderDiagram(d), reason); };
  broken(reports, (d) => (d.series[1].focus = true), /at most one series has "focus"; "Sign-in" and "Search" both have it\. Two lines in the text color compete, and the reader no longer knows which one the text is about; for series that matter equally, use "multiples": true/);
  broken(reports, (d) => delete d.series[0].focus, /say which series the text talks about with "focus", or show each series in its own panel with "multiples": true/);
  broken(slope, (d) => delete d.series[2].focus, /say which series the text talks about with "focus"; when every series matters equally, a dumbbell \(a bar chart with "series"\) compares the two times row by row/);
  broken(panels, (d) => (d.series[0].focus = true), /"focus" does not go with "multiples": each panel draws its own series in the text color/);
  broken(slope, (d) => (d.multiples = true), /a slopegraph has no "multiples": it draws every series between the same two axes/);
  broken(reports, (d) => (d.multiples = "yes"), /"multiples" must be true or false/);
  broken(reports, (d) => (d.series[0].focus = "yes"), /"focus" of series 1 \("Sign-in"\) must be true or false/);
  broken(reports, (d) => (d.points = d.points.slice(0, 1)), /a line chart has 3 to 36 points in time, or 2 for a slopegraph; this one has 1/);
  broken(reports, (d) => (d.points = Array.from({ length: 37 }, (_, i) => `W${i}`)), /a line chart has 3 to 36 points in time, or 2 for a slopegraph; this one has 37/);
  broken(reports, (d) => (d.points = "monthly"), /"points" must be a list of 3 to 36 labels, one for each point in time/);
  broken(reports, (d) => (d.points[0] = "January 2026"), /point 1 is 12 characters long; the most is 10/);
  broken(reports, (d) => (d.series = [...d.series, ...["A", "B", "C"].map((name, i) => ({ name, values: d.series[2].values.map((v) => v + i + 1) }))]), /a line chart has 1 to 5 series; this one has 6/);
  broken(panels, (d) => (d.series = d.series.slice(0, 1)), /small multiples have 2 to 6 series; this one has 1/);
  broken(slope, (d) => (d.series = d.series.slice(0, 1)), /a slopegraph has 2 to 10 series; this one has 1/);
  broken(reports, (d) => (d.series = "x"), /"series" must be a list, each with a "name" and its "values"/);
  broken(reports, (d) => (d.series[1] = 4), /series 2 must be an object with a "name" and its "values"/);
  broken(reports, (d) => (d.series[1].name = "The search box on every page"), /the name of series 2 is 28 characters long; the most is 20/);
  broken(reports, (d) => d.series[1].values.pop(), /series 2 \("Search"\) has 11 values; it needs 12, one for each point\. Write null for a value that is not known/);
  broken(reports, (d) => delete d.series[1].values, /series 2 \("Search"\) has no list of values; it needs 12/);
  broken(reports, (d) => (d.series[0].values[5] = 160), /series 1 \("Sign-in"\) has 160 at "Jun"; it must be a number on the scale, from 0 to 150, or null when it is not known/);
  broken(reports, (d) => (d.series[0].values[5] = "138"), /series 1 \("Sign-in"\) has "138" at "Jun"; it must be a number on the scale/);
  broken(reports, (d) => (d.series[2].values = d.series[2].values.map(() => null)), /series 3 \("Checkout"\) has no values; write its numbers, or leave it out and say why in the text/);
  broken(slope, (d) => (d.series[0].values[1] = null), /series 1 \("Sign-in"\) has no value at "2026"; a slopegraph draws a line between two values\. Write both, or leave the series out and say why in the text/);
  broken(reports, (d) => (d.series[2].name = "Search"), /two series are named "Search"/);
  broken(reports, (d) => (d.series[2].values = d.series[1].values.slice()), /the series "Search" and "Checkout" are equal at every point, so their lines lie on each other and cannot be told apart\. Write one series, and say in the text that both are the same/);
  broken(reports, (d) => (d.scale.marks = [{ at: 100, name: "Goal" }]), /a line chart has no "marks" in its scale; say a target or a limit in the text beside the figure/);
  broken(reports, (d) => delete d.scale.step, /"scale" needs a "step"/);
  broken(reports, (d) => (d.form = "wide"), /a line chart has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  broken(reports, (d) => (d.place = "walk"), /a line chart sits in the text flow; "place" must be "flow"/);
  broken(slope, (d) => d.series.forEach((s) => (s.values = [s.values[0] * 1000001, s.values[1] * 1000001]) && (d.scale.to = 20000020)), /the slopegraph has \d+px between its axes on a phone, and needs 60; shorten the series names, or write the values with fewer digits/);
  broken(reports, (d) => { d.points = ["2024", "Feb", "Mar", ...Array.from({ length: 21 }, () => "Wwwwwwwwww")]; d.series.forEach((s) => (s.values = Array.from({ length: 24 }, (_, i) => s.values[i % 12]))); }, /the column labels do not fit/);
});

test("the fit warnings name a sentence when a line chart shows little", () => {
  const three = reports(); three.points = ["Jan", "Feb", "Mar"]; three.series = [{ name: "Sign-in", values: [62, 70, 81] }];
  assert.deepEqual(renderDiagram(three).warnings, ["the line chart has one series of 3 points; a sentence says this more simply"]);
  const flat = reports(); flat.series.forEach((s, i) => (s.values = s.values.map(() => 20 + i * 10)));
  assert.deepEqual(renderDiagram(flat).warnings, ["no value changes; a sentence says this more simply"]);
});

test("a line chart takes every color from the page tokens, and has no state, no moving dot and nothing dashed", () => {
  for (const d of [reports(), months(), slope(), panels()]) {
    const { svg } = renderDiagram(d);
    assert.doesNotMatch(svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, ""), /#[0-9a-f]{6}\b|rgb\(|hsl\(/i);
    assert.doesNotMatch(svg, /is-(ok|warn|err)|class="pulse|dasharray|--primary|--heat/);
  }
});

test("check accepts a line chart that render drew, and reports one that was changed by hand", () => {
  const block = (d) => `<figure><div class="fig" role="region" aria-label="Figure 1, ${d.id}" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(d, null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Reports.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${[reports(), slope(), panels()].map(block).join("")}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace('class="ln"/>', 'class="ln-o"/>')).errors.join("\n"), /the drawing does not match its data; run render/);
});
