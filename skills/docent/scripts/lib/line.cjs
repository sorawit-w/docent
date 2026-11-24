// Line charts: how an amount changed over 3 to 36 equally spaced points in time. The value axis runs up the page; the one
// series that the text talks about (its focus) is a 2.5px line in the text color, and every other series a 1.5px muted line.
// Each line is named at its end, and names that would touch move apart, with a thin line to their line's end; no legend.
// Several series that matter equally get small multiples: one panel each, on one scale, with the others as thin lines in
// the outline color behind it. Two points in time make a slopegraph: two upright axes, and a line for each series between
// them, named at both ends with its values. A null breaks the line, and a point alone between two gaps is a dot. It is drawn
// twice with text at its real size, 640px wide for a desktop and for paper, and 264px wide for a phone, and its values are
// also written as a table, in words. The rules for gaps, unsmoothed lines, names that move and the slopegraph's run follow
// diagram-design's chart guides (MIT).
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { WIDE, PHONE, esc, wrapName, labelsOf, upAxis, headLines, apart, gridTables, readScale, valueWidth, fmt, isNum, num, diff } = require("./chart.cjs");

const MOST = { points: 36, point: 10, series: 5, multiples: 6, slope: 10, name: 20, events: 3, event: 20 };
const EVENT = { row: 16, gap: 8, clear: 4 }; // the rows of event names, the room between two names in one row, and between a name and a line
const PLOT = { wide: 200, phone: 140, panel: 100, slope: 200 }; // the height of a plot, so its shape is the same at each width
const PANEL = { wide: 184, phone: 224, gap: 24 }; // a small multiple's width with its value labels, and the room between two
const ROOM = 96; // on a phone a name may be this wide, so the plot keeps 120px; a longer name wraps
const R = { "": 3, "-o": 2.5, "-g": 2 }; // the dot of a focus line, of a muted line, and of a line behind a panel's series
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Checks line data and returns the model. */
function readLine(data) {
  if (data.place != null && data.place !== "flow") fail(`a line chart sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a line chart has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  if (!Array.isArray(data.points)) fail(`"points" must be a list of 3 to ${MOST.points} labels, one for each point in time, such as "Jan" or "W14"; or of 2 labels for a slopegraph`);
  const n = data.points.length;
  if (n < 2 || n > MOST.points) fail(`a line chart has 3 to ${MOST.points} points in time, or 2 for a slopegraph; this one has ${n}`);
  const slope = n === 2;
  const points = data.points.map((p, i) => words(p, `point ${i + 1}`, MOST.point));
  // A slopegraph writes its values at both ends and draws no grid, so its scale needs no step.
  const scale = readScale(data.scale, { needStep: !slope });
  if (scale.marks.length) fail(`a line chart has no "marks" in its scale; say a target or a limit in the text beside the figure`);
  if (data.multiples != null && typeof data.multiples !== "boolean") fail(`"multiples" must be true or false`);
  const multiples = data.multiples === true;
  if (multiples && slope) fail(`a slopegraph has no "multiples": it draws every series between the same two axes, so they compare at once`);

  if (!Array.isArray(data.series)) fail(`"series" must be a list, each with a "name" and its "values"`);
  const count = data.series.length;
  const [least, most, what] = slope ? [2, MOST.slope, "a slopegraph has"] : multiples ? [2, MOST.multiples, "small multiples have"] : [1, MOST.series, "a line chart has"];
  if (count < least || count > most) fail(`${what} ${least} to ${most} series; this one has ${count}`);
  const onScale = `a number on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}, or null when it is not known`;
  const series = data.series.map((sr, i) => {
    if (!sr || typeof sr !== "object" || Array.isArray(sr)) fail(`series ${i + 1} must be an object with a "name" and its "values"`);
    const name = words(sr.name, `the name of series ${i + 1}`, MOST.name);
    const what = `series ${i + 1} ("${name}")`;
    if (sr.focus != null && typeof sr.focus !== "boolean") fail(`"focus" of ${what} must be true or false`);
    if (!Array.isArray(sr.values) || sr.values.length !== n) fail(`${what} has ${Array.isArray(sr.values) ? sr.values.length : "no list of"} values; it needs ${n}, one for each point. Write null for a value that is not known`);
    sr.values.forEach((v, k) => { if (v !== null && (!isNum(v) || v < scale.from || v > scale.to)) fail(`${what} has ${JSON.stringify(v)} at "${points[k]}"; it must be ${onScale}`); });
    if (sr.values.every((v) => v === null)) fail(`${what} has no values; write its numbers, or leave it out and say why in the text`);
    if (slope && sr.values.includes(null)) fail(`${what} has no value at "${points[sr.values.indexOf(null)]}"; a slopegraph draws a line between two values. Write both, or leave the series out and say why in the text`);
    return { name, values: sr.values.slice(), focus: sr.focus === true };
  });
  series.forEach((sr, i) => { if (series.findIndex((o) => o.name === sr.name) !== i) fail(`two series are named "${sr.name}"`); });
  // Two lines that lie on each other cannot be told apart, and the renderer never nudges one of them.
  series.forEach((sr, i) => series.slice(i + 1).forEach((o) => {
    if (o.values.every((v, k) => v === sr.values[k])) fail(`the series "${sr.name}" and "${o.name}" are equal at every point, so their lines lie on each other and cannot be told apart. Write one series, and say in the text that both are the same`);
  }));
  const focused = series.filter((sr) => sr.focus);
  if (multiples && focused.length) fail(`"focus" does not go with "multiples": each panel draws its own series in the text color`);
  if (focused.length > 1) fail(`at most one series has "focus"; "${focused[0].name}" and "${focused[1].name}" both have it. Two lines in the text color compete, and the reader no longer knows which one the text is about; for series that matter equally, use "multiples": true`);
  if (count > 1 && !multiples && !focused.length) fail(slope
    ? `say which series the text talks about with "focus"; when every series matters equally, a dumbbell (a bar chart with "series") compares the two times row by row`
    : `say which series the text talks about with "focus", or show each series in its own panel with "multiples": true`);
  const focus = multiples ? -1 : count === 1 ? 0 : series.findIndex((sr) => sr.focus);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "line", scale, points, series, focus, multiples, slope, events: readEvents(data.events, points, slope, multiples) };
}

/** The moments that the text explains, each at one of the points, in the order of the points. */
function readEvents(list, points, slope, multiples) {
  if (list == null) return [];
  if (slope || multiples) fail(`${slope ? "a slopegraph has" : "small multiples have"} no "events": their panels have little room above. Say the moment in the text, or draw one line chart`);
  if (!Array.isArray(list) || list.length < 1 || list.length > MOST.events) fail(`"events" is a list of 1 to ${MOST.events} moments, each with "at" and a "name"; more events are a timeline, which stays a table`);
  const events = list.map((e, i) => {
    if (!e || typeof e !== "object" || Array.isArray(e)) fail(`event ${i + 1} must be an object with "at", one of the "points", and a "name"`);
    const name = words(e.name, `the name of event ${i + 1}`, MOST.event);
    const at = points.indexOf(e.at);
    if (at < 0) fail(`the event "${name}" stands at ${JSON.stringify(e.at)}, which is not one of the "points"; an event between two points takes the nearest point, and its name gives the exact time, such as {"at": "08:45", "name": "Alert, 08:44"}`);
    if (points.lastIndexOf(e.at) !== at) fail(`the event "${name}" stands at "${e.at}", a label used more than once in "points", so it could stand at either; give each point its own label, such as "2026"`);
    return { at, name };
  });
  events.forEach((e, i) => { const o = events.findIndex((x) => x.at === e.at); if (o !== i) fail(`the events "${events[o].name}" and "${e.name}" stand at the same point, "${points[e.at]}"; write one event, and name both moments in it`); });
  return events.sort((a, b) => a.at - b.at);
}

/**
 * The rows of the event names above the plot, the lowest row 0. A name stands 4px after its line, running right, or before it,
 * running left, when it would pass the right edge. Two names closer than 8px take separate rows, and a line that a name passes
 * over stops in a row under that name, so no line crosses a name. Every way of giving the names rows is tried, fewest rows first,
 * and the first that keeps every line clear wins. Returns { rows, count, names }, or refuses when no way fits.
 */
function eventRows(events, x, W, where) {
  const names = events.map((e) => {
    const lx = x(e.at), w = textWidth(e.name, 12), right = lx + EVENT.clear + w <= W - 12;
    if (!right && lx - EVENT.clear - w < 12) fail(`the event name "${e.name}" does not fit beside its line ${where}; shorten an event name, or leave one event out`);
    return { lx, right, a: right ? lx + EVENT.clear : lx - EVENT.clear - w, b: right ? lx + EVENT.clear + w : lx - EVENT.clear };
  });
  const n = names.length, meet = (i, j) => names[i].a < names[j].b + EVENT.gap && names[j].a < names[i].b + EVENT.gap;
  const over = (i, j) => names[j].lx >= names[i].a - EVENT.clear && names[j].lx <= names[i].b + EVENT.clear; // name i passes over line j
  const fits = (rows) => rows.every((r, i) => rows.every((q, j) => i === j || ((!meet(i, j) || r !== q) && (!over(i, j) || r > q))));
  for (let count = 1; count <= n; count++) {
    for (let k = 0; k < count ** n; k++) {
      const rows = Array.from({ length: n }, (_, i) => Math.floor(k / count ** i) % count);
      if (Math.max(...rows) === count - 1 && fits(rows)) return { rows, count, names };
    }
  }
  return fail(`the event names cannot stand without crossing another event's line ${where}; shorten an event name, or leave one event out`);
}

/** The line above the chart: the unit, where the scale starts, how to read small multiples, and what a gap means. */
function headOf(model) {
  const { scale } = model;
  const start = scale.from > 0 ? `The scale starts at ${fmt(scale.from)}, not 0.` : "";
  const out = [scale.unit ? (start ? `${cap(scale.unit)}. ${start}` : `${cap(scale.unit)}, scale from ${fmt(scale.from)}.`) : start || `Scale from ${fmt(scale.from)}.`];
  if (model.multiples) out.push("Each panel draws one series; the others are the thin gray lines behind it.");
  if (model.series.some((sr) => sr.values.includes(null))) out.push("A gap in a line is a time with no data.");
  return out.join(" ");
}

/** The runs of known values: a line for each run of two or more, and a dot for a point alone between two gaps. */
function runsOf(values) {
  const runs = [];
  values.forEach((v, i) => {
    if (v === null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i); else runs.push([i]);
  });
  return runs;
}

/** One series as SVG: straight lines between its points, never smoothed, broken at each gap. `cls` is "" for the line the
 * text talks about, "-o" for another series and "-g" for a series behind a panel's own. A focus line has a dot at each point
 * when `dots`. */
function marksOf(values, x, y, cls, dots) {
  const dot = (i) => `<circle cx="${num(x(i))}" cy="${num(y(values[i]))}" r="${R[cls]}" class="pt${cls}"/>`;
  return runsOf(values).map((run) => (run.length > 1 ? `<path d="${run.map((i, k) => `${k ? "L" : "M"}${num(x(i))},${num(y(values[i]))}`).join(" ")}" class="ln${cls}"/>` : "") + (run.length === 1 || dots ? run.map(dot).join("") : "")).join("");
}

/** The index of a series' last known value. */
const lastOf = (values) => values.reduce((k, v, i) => (v === null ? k : i), -1);

/**
 * Names beside points on one upright axis, moved apart so that two stand at least 18px apart, centre to centre, between lo and
 * hi. A name's first line stands at the height of its point. Returns { at, moved }: the centre of each name's first line, and
 * whether it moved.
 */
function placeNames(lines, ys, lo, hi, failure) {
  const items = lines.map((l, i) => ({ at: ys[i] + (l.length - 1) * 9, size: 14 + (l.length - 1) * 18 }));
  const centres = apart(items, lo, hi, 4) || fail(failure);
  const at = centres.map((c, i) => c - (lines[i].length - 1) * 9);
  return { at, moved: at.map((a, i) => Math.abs(a - ys[i]) > 0.5) };
}

/** A name of one or more lines, its first line centred on y; the series the text talks about in the text color. */
function nameAt(s, lines, x, y, anchor, main) {
  lines.forEach((line, k) => s.notes.push({ x, y: y + 5 + k * 18, s: line, cls: main ? "row" : "dim", anchor }));
}

/** The labels along the time axis, under a plot whose bottom is y1, between lo and hi. Returns the y of their last line. */
function timeAxis(s, model, x, y1, W, where, lo, hi) {
  const lb = labelsOf(model.points, x, W, where, { least: 2, lo, hi });
  for (const it of lb.items) s.notes.push({ x: it.cx, y: y1 + 18 + it.line * 16, s: it.s, cls: "val", anchor: "middle" });
  return y1 + 18 + (lb.lines - 1) * 16;
}

/** The grid lines of an upright axis, and a solid muted line at 0 when the scale runs from below 0 to above it. */
function grid(s, model, ax, x0, x1) {
  for (const t of ax.ticks) s.tracks.push([x0, t.y, x1, t.y]);
  if (model.scale.from < 0 && model.scale.to > 0) s.under.push(`<line x1="${num(x0)}" y1="${num(ax.y(0))}" x2="${num(x1)}" y2="${num(ax.y(0))}" class="r-ref"/>`);
}

/** One plot: the value labels at the left (inside the plot on a phone), the points along the bottom, the names at the right. */
function drawPlot(model, s, phone, top, where) {
  const { series, points, focus } = model;
  const W = s.w, n = points.length;
  const H = phone ? PLOT.phone : PLOT.wide;
  let y0 = top + 24, y1 = y0 + H, ax = upAxis(model.scale, y1, y0);
  const widest = Math.max(...series.map((sr) => textWidth(sr.name, 14)));
  const lines = series.map((sr) => (phone && widest > ROOM ? wrapName(sr.name, ROOM, { weight: 400 }) : [sr.name]));
  const nameW = Math.max(...lines.flat().map((l) => textWidth(l, 14)));
  const ends = series.map((sr) => lastOf(sr.values));
  const place = () => placeNames(lines, series.map((sr, i) => ax.y(sr.values[ends[i]])), y0 - 12, y1 + 7, `the names of the ${series.length} series do not fit beside the line ends ${where}; shorten them`);
  let placed = place();
  // A name that moved, or whose line ends before the last point, gets a thin line to its line's end, and every name then
  // stands 20px after the plot, so that each such line has room.
  const lead = placed.moved.map((m, i) => m || ends[i] < n - 1);
  const gap = lead.some(Boolean) ? 20 : 8;
  const labelW = Math.max(0, ...ax.ticks.map((t) => valueWidth(t.label)));
  const x0 = phone ? 20 : Math.ceil(20 + labelW + 8), x1 = Math.floor(W - 20 - nameW - gap);
  const step = (x1 - x0) / (n - 1), x = (i) => x0 + i * step;
  // Event names stand in rows above the plot, under the line above the chart, so the plot moves down by their rows. A move of
  // whole rows moves every series name with it, so the names that moved stay the same.
  const ev = model.events.length ? eventRows(model.events, x, W, where) : null;
  if (ev) { y0 += ev.count * EVENT.row; y1 = y0 + H; ax = upAxis(model.scale, y1, y0); placed = place(); }
  grid(s, model, ax, x0, x1);
  const bottom = timeAxis(s, model, x, y1, W, where, 12, W - 12);
  // Each event: a 1px muted line from the bottom of the plot up to its name, over the grid lines and under the series lines.
  if (ev) {
    const base = (r) => y0 - 18 - r * EVENT.row; // the baseline of row r
    s.parts.push({ id: "", svg: ev.names.map((nm, i) => `<line x1="${num(nm.lx)}" y1="${num(y1)}" x2="${num(nm.lx)}" y2="${num(base(ev.rows[i]) - 9)}" class="ld"/>`).join(""), texts: [] });
    ev.names.forEach((nm, i) => s.notes.push({ x: nm.right ? nm.a : nm.b, y: base(ev.rows[i]), s: model.events[i].name, cls: "sub", anchor: nm.right ? "start" : "end" }));
  }
  const order = series.map((_, i) => i).filter((i) => i !== focus).concat(focus >= 0 ? [focus] : []);
  for (const i of order) {
    const sr = series[i], main = i === focus;
    let svg = marksOf(sr.values, x, ax.y, main ? "" : "-o", main && step >= 8);
    if (lead[i]) svg += `<line x1="${num(x(ends[i]) + 4)}" y1="${num(ax.y(sr.values[ends[i]]))}" x2="${num(x1 + gap - 4)}" y2="${num(placed.at[i])}" class="ld"/>`;
    s.parts.push({ id: sr.name, svg, texts: [] });
    nameAt(s, lines[i], x1 + gap, placed.at[i], "start", main);
  }
  // The value labels: beside their grid lines, or on a phone above them at the left edge, inside the plot, so they take no
  // width. There they lie under the lines: a line may cross a label, but nothing cuts a line, because a break means no data.
  for (const t of ax.ticks) s.notes.push(phone ? { x: x0, y: t.y - 4, s: t.label, cls: "val", anchor: "start" } : { x: x0 - 8, y: t.y + 4, s: t.label, cls: "val", anchor: "end" });
  s.bands.push({ x: 8, y: top, w: W - 16, h: bottom + 10 - top });
  return bottom + 18;
}

/** Small multiples: one panel for each series, on one scale and one set of points, the others behind it in the outline color. */
function drawPanels(model, s, phone, top, where) {
  const { series, points } = model;
  const W = s.w, n = points.length, PW = phone ? PANEL.phone : PANEL.wide;
  const rows = phone ? series.length : Math.ceil(series.length / 3), cols = Math.ceil(series.length / rows);
  // A panel's name wraps within the panel, also in a script written without spaces. The plots of one row start under the
  // longest name of that row, so they stand side by side at one height.
  const titles = series.map((sr) => wrapName(sr.name, PW));
  let py = top;
  for (let r = 0; r < rows; r++) {
    let bottom = 0;
    const extra = Math.max(...titles.slice(r * cols, r * cols + cols).map((t) => t.length)) - 1;
    for (let c = 0; c < cols && r * cols + c < series.length; c++) {
      const i = r * cols + c, sr = series[i], px = 20 + c * (PW + PANEL.gap);
      const y0 = py + 40 + extra * 18, y1 = y0 + PLOT.panel; // the top value label stands clear of the panel's name
      const ax = upAxis(model.scale, y1, y0);
      const x0 = px + Math.ceil(Math.max(0, ...ax.ticks.map((t) => valueWidth(t.label))) + 8), x1 = px + PW;
      const step = (x1 - x0) / (n - 1), x = (k) => x0 + k * step;
      titles[i].forEach((line, k) => s.notes.push({ x: px, y: py + 20 + k * 18, s: line, cls: "name", anchor: "start" }));
      for (const t of ax.ticks) s.notes.push({ x: x0 - 8, y: t.y + 4, s: t.label, cls: "val", anchor: "end" });
      grid(s, model, ax, x0, x1);
      bottom = timeAxis(s, model, x, y1, W, where, px - 4, x1 + 4);
      const svg = series.map((o, k) => (k === i ? "" : marksOf(o.values, x, ax.y, "-g", false))).join("") + marksOf(sr.values, x, ax.y, "", step >= 8);
      s.parts.push({ id: sr.name, svg, texts: [] });
      s.bands.push({ x: px - 8, y: py, w: PW + 16, h: bottom + 10 - py });
    }
    py = bottom + 18;
  }
  return py;
}

/** A slopegraph: two upright axes, one for each point, and a straight line for each series between them, named at both ends
 * with its values (on a phone at the right only). The run between the axes is no wider than the plot is tall. */
function drawSlope(model, s, phone, top, where) {
  const { series, points, focus } = model;
  const W = s.w, y0 = top + 40, y1 = y0 + PLOT.slope;
  const ax = upAxis(model.scale, y1, y0);
  const sideW = (k) => Math.max(...series.map((sr) => valueWidth(fmt(sr.values[k]))));
  const widest = Math.max(...series.map((sr) => textWidth(sr.name, 14)));
  const lines = series.map((sr) => (phone && widest > ROOM ? wrapName(sr.name, ROOM, { weight: 400 }) : [sr.name]));
  const nameW = Math.max(...lines.flat().map((l) => textWidth(l, 14)));
  const failure = `the names of the ${series.length} series do not fit beside the axes ${where}; shorten them`;
  // On a phone the left axis carries the values alone, each a 12px line.
  const left = placeNames(phone ? series.map(() => [""]) : lines, series.map((sr) => ax.y(sr.values[0])), y0 - 12, y1 + 12, failure);
  const right = placeNames(lines, series.map((sr) => ax.y(sr.values[1])), y0 - 12, y1 + 12, failure);
  const gapL = left.moved.some(Boolean) ? 20 : 8, gapR = right.moved.some(Boolean) ? 20 : 8;
  const leftW = (phone ? 0 : nameW + 8) + sideW(0) + gapL, rightW = gapR + sideW(1) + 8 + nameW;
  const run = Math.min(W - 40 - leftW - rightW, PLOT.slope);
  if (run < 60) fail(`the slopegraph has ${Math.max(0, Math.floor(run))}px between its axes ${where}, and needs 60; shorten the series names, or write the values with fewer digits`);
  const xL = Math.round(20 + (W - 40 - leftW - run - rightW) / 2 + leftW), xR = xL + run;
  for (const xa of [xL, xR]) s.tracks.push([xa, y0, xa, y1]);
  // The point labels stand centred over their axes, kept 12px inside the drawing; two that would meet are refused.
  const heads = points.map((p, k) => { const w = valueWidth(p), x = Math.min(Math.max(k ? xR : xL, 12 + w / 2), W - 12 - w / 2); return { p, w, x }; });
  if (heads[1].x - heads[1].w / 2 - (heads[0].x + heads[0].w / 2) < 8) fail(`the point labels "${points[0]}" and "${points[1]}" meet over the axes ${where}; shorten them, such as "2025" and "2026"`);
  for (const h of heads) s.notes.push({ x: h.x, y: top + 20, s: h.p, cls: "val", anchor: "middle" });
  const order = series.map((_, i) => i).filter((i) => i !== focus).concat(focus >= 0 ? [focus] : []);
  for (const i of order) {
    const sr = series[i], main = i === focus, [a, b] = sr.values.map((v) => ax.y(v));
    let svg = `<path d="M${num(xL)},${num(a)} L${num(xR)},${num(b)}" class="ln${main ? "" : "-o"}"/>`;
    if (main) svg += `<circle cx="${num(xL)}" cy="${num(a)}" r="${R[""]}" class="pt"/><circle cx="${num(xR)}" cy="${num(b)}" r="${R[""]}" class="pt"/>`;
    if (left.moved[i]) svg += `<line x1="${num(xL - 4)}" y1="${num(a)}" x2="${num(xL - gapL + 4)}" y2="${num(left.at[i])}" class="ld"/>`;
    if (right.moved[i]) svg += `<line x1="${num(xR + 4)}" y1="${num(b)}" x2="${num(xR + gapR - 4)}" y2="${num(right.at[i])}" class="ld"/>`;
    s.parts.push({ id: sr.name, svg, texts: [] });
    s.notes.push({ x: xL - gapL, y: left.at[i] + 4, s: fmt(sr.values[0]), cls: "val", anchor: "end" });
    if (!phone) nameAt(s, lines[i], xL - gapL - sideW(0) - 8, left.at[i], "end", main);
    s.notes.push({ x: xR + gapR, y: right.at[i] + 4, s: fmt(sr.values[1]), cls: "val", anchor: "start" });
    nameAt(s, lines[i], xR + gapR + sideW(1) + 8, right.at[i], "start", main);
  }
  s.bands.push({ x: 8, y: top, w: W - 16, h: y1 + 24 - top });
  return y1 + 32;
}

/** The drawing: 640px wide for a desktop and for paper, or 264px wide for a phone. */
function drawLine(model, phone = false) {
  const W = phone ? PHONE : WIDE;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form: "line", w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  const top = headLines(s, [headOf(model)], W);
  s.h = (model.slope ? drawSlope : model.multiples ? drawPanels : drawPlot)(model, s, phone, top, where);
  return s;
}

/** The values in words: a table with a row for each point and a column for each series (a slopegraph: a row for each series,
 * with its change), the line above the chart, and a line for each series with its first, last, highest and lowest values. */
function wordsOf(model) {
  const { series, points, scale } = model;
  const cell = (v) => (v === null ? "no data" : fmt(v));
  const unit = scale.unit ? `, in ${esc(scale.unit)}` : "";
  let table;
  if (model.slope) {
    const change = (sr) => { const d = diff(sr.values[0], sr.values[1]); return d > 0 ? `+${fmt(d)}` : fmt(d); };
    const head = `<tr><th scope="col">Series</th>${points.map((p) => `<th scope="col">${esc(p)}</th>`).join("")}<th scope="col">Change${unit}</th></tr>`;
    const body = series.map((sr) => `<tr><th scope="row">${esc(sr.name)}</th>${[...sr.values.map(cell), change(sr)].map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    table = `<div class="table-wrap is-text" role="region" aria-label="The values of the slopegraph" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  } else {
    // Events take a last column, "Event", with each name in the row of its point and nothing in the other rows.
    const event = (k) => (model.events.find((e) => e.at === k) || { name: "" }).name;
    const columns = series.map((sr) => sr.name).concat(model.events.length ? ["Event"] : []);
    const rows = points.map((p, k) => ({ name: p, cells: series.map((sr) => sr.values[k]).concat(model.events.length ? [event(k)] : []) }));
    table = gridTables({ columns, rows }, (c) => (typeof c === "string" ? c : cell(c)), "The values of the line chart");
  }
  // A point whose label is used more than once, such as "Feb" in each of three years, is named with its place.
  const at = (k) => `${points[k]}${points.indexOf(points[k]) !== points.lastIndexOf(points[k]) ? ` (point ${k + 1})` : ""}`;
  const lines = [esc(headOf(model))];
  if (!model.slope) for (const sr of series) {
    const known = sr.values.map((v, k) => [v, k]).filter(([v]) => v !== null);
    const [first, last] = [known[0], known[known.length - 1]];
    const parts = [`${fmt(first[0])} in ${at(first[1])}${last !== first ? `, ${fmt(last[0])} in ${at(last[1])}` : ""}`];
    if (known.length > 2) {
      const hi = known.reduce((a, b) => (b[0] > a[0] ? b : a)), lo = known.reduce((a, b) => (b[0] < a[0] ? b : a));
      parts.push(`highest ${fmt(hi[0])} in ${at(hi[1])}`, `lowest ${fmt(lo[0])} in ${at(lo[1])}`);
    }
    const none = sr.values.map((v, k) => (v === null ? at(k) : null)).filter(Boolean);
    if (none.length) parts.push(`no data in ${none.join(", ")}`);
    lines.push(esc(`${sr.name}: ${parts.join("; ")}.`));
  }
  if (model.events.length) lines.push(esc(`Events: ${model.events.map((e) => `${e.name}, ${at(e.at)}`).join("; ")}.`));
  return `${table}\n<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

module.exports = { readLine, drawLine, wordsOf, headOf, MOST };
