// Range charts: values and ranges on one numeric scale, one row each. A row is a range (from and to), a point (at),
// an estimate inside its interval (at, from and to), an upper limit (to alone) or a lower limit (from alone). Nothing moves: a range chart has no order.
// It is drawn twice with text at its real size: 640px wide for a desktop and for paper, and 264px wide for a phone,
// where each row name stands on its own line above its mark. Its rows are also written as a table, in words.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { WIDE, PHONE, esc, wrapName, headLines, readScale, makeScale, drawHead, drawGrid, linesIn, placeLabel, valueWidth, fmt, isNum, num } = require("./chart.cjs");

const MOST = { rows: 12, groups: 3, name: 28, note: 24, group: 20 };
const ROW = 32; // the height of one mark's strip
const ESTIMATE = 16; // px: the narrowest interval that shows its estimate's point inside it

/** Checks range data and returns the model. */
function readRange(data) {
  if (data.place != null && data.place !== "flow") fail(`a range chart sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a range chart has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  const scale = readScale(data.scale, { needStep: true });
  if (data.groups != null && !Array.isArray(data.groups)) fail(`"groups" must be a list`);
  const groups = (data.groups || []).map((g, i) => {
    const what = `group ${i + 1}`;
    if (!g || typeof g !== "object") fail(`${what} must be an object with "id" and "name"`);
    return { id: id(g.id, `the id of ${what}`), name: words(g.name, `the name of ${what}`, MOST.group), rows: [] };
  });
  if (groups.length > MOST.groups) fail(`a range chart has at most ${MOST.groups} groups; this one has ${groups.length}`);
  groups.forEach((g, i) => { if (groups.findIndex((o) => o.id === g.id) !== i) fail(`two groups have the id "${g.id}"`); });
  if (!Array.isArray(data.rows)) fail(`"rows" must be a list`);
  if (data.rows.length < 2 || data.rows.length > MOST.rows) fail(`a range chart has 2 to ${MOST.rows} rows; this one has ${data.rows.length}`);
  // The estimates of one chart keep the same decimals, as a column of numbers does: 0.20 beside 0.25, not 0.2.
  // A number written with an exponent (4e-7) has as many decimals as its digits after the point, plus the exponent's size.
  const decimals = (v) => { const [m, e = 0] = String(v).toLowerCase().split("e"); return Math.max(0, (m.split(".")[1] || "").length - Number(e)); };
  const places = Math.max(0, ...data.rows.filter((r) => r && isNum(r.at) && isNum(r.from) && isNum(r.to)).flatMap((r) => [r.at, r.from, r.to]).map(decimals));
  const est = (v) => (places > 20 ? fmt(v) : fmt(v.toFixed(places))); // shortcut: past 20 decimals, each number keeps its own form
  const rows = data.rows.map((r, i) => {
    if (!r || typeof r !== "object") fail(`row ${i + 1} must be an object with a "name" and its numbers`);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const what = `row ${i + 1} ("${name}")`;
    const has = (k) => r[k] != null;
    for (const k of ["from", "to", "at"]) if (has(k) && (!isNum(r[k]) || r[k] < scale.from || r[k] > scale.to)) fail(`${what} has "${k}": ${JSON.stringify(r[k])}; it must be a number on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}`);
    let type;
    if (has("at") && has("from") && has("to")) {
      if (r.to <= r.from) fail(`${what} has an interval that ends before it starts: "to" must be more than "from"`);
      if (r.at < r.from || r.at > r.to) fail(`${what} has its estimate ${fmt(r.at)} outside its interval, ${fmt(r.from)}–${fmt(r.to)}; an estimate stands inside its interval`);
      type = "estimate";
    } else if (has("at")) {
      if (has("from") || has("to")) fail(`${what} has "at" and one of "from" and "to"; a row has one mark: a point ("at"), an estimate in its interval ("at", "from" and "to"), a range ("from" and "to"), or one limit ("from" or "to" alone)`);
      type = "point";
    } else if (has("from") && has("to")) {
      if (r.to === r.from) fail(`${what} starts and ends at ${fmt(r.from)}; write it as a point, with "at"`);
      if (r.to < r.from) fail(`${what} ends before it starts: "to" must be more than "from"`);
      type = "range";
    } else if (has("to")) type = "upper";
    else if (has("from")) type = "lower";
    else fail(`${what} has no numbers; give it "at" for a point, "from" and "to" for a range, or "from" or "to" alone for a limit`);
    const note = words(r.note, `the note of ${what}`, MOST.note, false);
    let group = null;
    if (groups.length) {
      if (r.group == null) fail(`${what} names no group; when a chart has groups, every row names one in "group"`);
      group = groups.find((g) => g.id === r.group) || fail(`${what} names the group "${r.group}", which does not exist`);
    } else if (r.group != null) fail(`${what} names a group, but the chart has no "groups"`);
    const value = { range: () => `${fmt(r.from)}–${fmt(r.to)}`, point: () => fmt(r.at), estimate: () => `${est(r.at)} (${est(r.from)}–${est(r.to)})`, upper: () => `up to ${fmt(r.to)}`, lower: () => `at least ${fmt(r.from)}` }[type]();
    const shown = type === "estimate" ? { at: est(r.at), from: est(r.from), to: est(r.to) } : null;
    return { name, type, from: r.from, to: r.to, at: r.at, shown, note, group, value: note ? `${value}, ${note}` : value };
  });
  // The rows of one group stand together, so each group is one band; the bands follow the order of the rows.
  for (const g of groups) {
    const at = rows.map((r, i) => (r.group === g ? i : -1)).filter((i) => i >= 0);
    if (!at.length) fail(`the group "${g.id}" has no rows; remove it, or give it a row`);
    if (at[at.length - 1] - at[0] + 1 !== at.length) fail(`the rows of the group "${g.id}" do not stand together; put them one after another`);
    g.rows = at.map((i) => rows[i]);
  }
  groups.sort((a, b) => rows.indexOf(a.rows[0]) - rows.indexOf(b.rows[0]));
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "range", scale, groups, rows };
}

/** The pixels of a row's mark, the sides where its value may stand, and its width check. */
function extent(r, sc, x0, x1, where) {
  if (r.type === "point") return { a: sc.x(r.at) - 5, b: sc.x(r.at) + 5, sides: ["right", "left"] };
  if (r.type === "estimate") {
    // The point (10px across) must show inside its bar, with the bar's outline beside it.
    const a = sc.x(r.from), b = sc.x(r.to);
    if (b - a < ESTIMATE) fail(`the interval ${fmt(r.from)}–${fmt(r.to)} of the row "${r.name}" is ${num(b - a)}px wide ${where}, too narrow to show its estimate inside it; write the estimate as a point, and give its interval in the text`);
    return { a: Math.min(a, sc.x(r.at) - 5), b: Math.max(b, sc.x(r.at) + 5), sides: ["right", "left"] };
  }
  if (r.type === "range") {
    const a = sc.x(r.from), b = sc.x(r.to);
    if (b - a < 4) fail(`the range ${r.value} is ${num(b - a)}px wide ${where}; write it as a point, with "at", or narrow the scale`);
    return { a, b, sides: ["right", "left"] };
  }
  // A limit: a line from the edge of the scale to a cap at the limit. Its value stands on the side of the cap.
  if (r.type === "upper") {
    if (sc.x(r.to) - x0 < 4) fail(`the limit "${r.value}" sits at the start of the scale, so its line shows nothing ${where}; start the scale lower`);
    return { a: x0, b: sc.x(r.to) + 1, sides: ["right"] };
  }
  if (x1 - sc.x(r.from) < 4) fail(`the limit "${r.value}" sits at the end of the scale, so its line shows nothing ${where}; end the scale higher`);
  return { a: sc.x(r.from) - 1, b: x1, sides: ["left"] };
}

/** The mark of one row, as SVG, on the line cy. */
function markSvg(r, sc, x0, x1, cy) {
  if (r.type === "point") return `<circle cx="${num(sc.x(r.at))}" cy="${num(cy)}" r="5" class="r-pt"/>`;
  if (r.type === "estimate") return `<rect x="${num(sc.x(r.from))}" y="${num(cy - 8)}" width="${num(sc.x(r.to) - sc.x(r.from))}" height="16" rx="4" class="r-bar"/>`;
  if (r.type === "range") return `<rect x="${num(sc.x(r.from))}" y="${num(cy - 8)}" width="${num(sc.x(r.to) - sc.x(r.from))}" height="16" rx="4" class="r-bar"/>`;
  if (r.type === "upper") return `<path d="M${num(x0)},${num(cy)} H${num(sc.x(r.to))} M${num(sc.x(r.to))},${num(cy - 8)} V${num(cy + 8)}" class="r-lim"/>`;
  return `<path d="M${num(sc.x(r.from))},${num(cy - 8)} V${num(cy + 8)} M${num(sc.x(r.from))},${num(cy)} H${num(x1)}" class="r-lim"/>`;
}

/**
 * Rows on one scale, drawn the range chart's way: 640px wide with the row names in a column at the left, or 264px wide with
 * each name on its own line above its mark. One band for each group, a value beside each mark (or on a line above it), and the
 * grid. A timeline draws with this code too. `opts` gives what is the kind's own: the scene's `form`, `scaleOn(x0, x1, room)`
 * for the ticks, the labels at the two `ends` of the scale and its `unit`, so both ends leave room for them, the `groups`,
 * `extent` and `markSvg` of a row, `bar(r, sc)` for the pixels of a bar that grid lines pass through (or null), and `head`,
 * the sentences of the line above the chart.
 */
function layoutRows(model, phone, opts) {
  const { scale, rows } = model;
  const { form, scaleOn, ends, unit, extent, markSvg, bar, head = [] } = opts;
  const W = phone ? PHONE : WIDE;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form, w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  // The first and the last tick label are centred on their ticks, so each end of the scale leaves room for half of its own
  // label. The labels between them are checked against the edges when the ticks are chosen.
  const firstHalf = valueWidth(ends[0]) / 2;
  const lastHalf = valueWidth(ends[1]) / 2;
  let x0, x1, lo;
  if (phone) [x0, x1, lo] = [Math.ceil(Math.max(20, 12 + firstHalf)), Math.floor(Math.min(W - 20 - 32, W - 12 - lastHalf)), 12];
  else {
    const nameW = Math.max(...rows.map((r) => textWidth(r.name, 14)), ...opts.groups.map((g) => textWidth(g.name, 14, 600)));
    // The unit stands left of the first tick label, so the scale also leaves room for the unit there.
    const unitRoom = unit ? 12 + textWidth(unit, 12) + 10 + firstHalf : 0;
    [x0, x1] = [Math.ceil(Math.max(20 + nameW + 24, unitRoom, 12 + firstHalf)), Math.floor(Math.min(W - 20 - 40, W - 12 - lastHalf))];
    lo = x0 - 12; // a value on the left of its mark stays clear of the row names
  }
  const hi = W - 12;
  const sc = scaleOn(x0, x1, { lo: 12, hi: W - 12 });
  let y = drawHead(s, scale, sc, { W, x0, phone, where, top: head.length ? headLines(s, head, W) : 12 });

  // One band for each group (or one band for all rows), with the rows in it. Grid lines run through the band on a
  // desktop, and through each row's strip on a phone, where the row names stand in the scale's room.
  const spans = [];
  const groups = opts.groups.length ? opts.groups : [{ name: "", rows }];
  for (const g of groups) {
    const top = y;
    let yy = top + 8;
    if (g.name) {
      const lines = phone ? wrapName(g.name, W - 40) : [g.name];
      lines.forEach((line, i) => s.notes.push({ x: 20, y: yy + 16 + i * 18, s: line, cls: "name", anchor: "start" }));
      yy += 24 + (lines.length - 1) * 18;
    }
    for (const r of g.rows) {
      if (phone) for (const line of wrapName(r.name, W - 40)) { s.notes.push({ x: 20, y: yy + 16, s: line, cls: "row", anchor: "start" }); yy += 18; }
      const { a, b, sides } = extent(r, sc, x0, x1, where);
      // A row may carry a shorter value (r.short), used only when the full one is wider than the drawing; the table keeps the full one.
      let value = r.value, tw = valueWidth(value), place = placeLabel({ a, b, w: tw, lo, hi, sides });
      if (!place && r.short) [value, tw] = [r.short, valueWidth(r.short)], place = placeLabel({ a, b, w: tw, lo, hi, sides });
      if (!place) fail(`the value "${r.value}" of the row "${r.name}" has no free place ${where}; shorten its note`);
      if (place.side === "above") yy += 16;
      const cy = yy + ROW / 2;
      if (!phone) s.notes.push({ x: 20, y: cy + 5, s: r.name, cls: "row", anchor: "start" });
      const ty = place.side === "above" ? cy - 14 : cy + 4;
      const left = place.anchor === "end" ? place.x - tw : place.anchor === "middle" ? place.x - tw / 2 : place.x;
      s.notes.push({ x: place.x, y: ty, s: value, cls: "val", anchor: place.anchor, knock: { x: left - 4, y: ty - 12, w: tw + 8, h: 16 } });
      const px = bar(r, sc);
      const through = px ? linesIn(scale, sc, px[0], cy - 8, px[1] - px[0], 16) : "";
      s.parts.push({ id: r.name, svg: markSvg(r, sc, x0, x1, cy, through), texts: [] });
      if (phone) spans.push([cy - 14, cy + 14]);
      yy += ROW;
    }
    yy += 8;
    s.bands.push({ x: 8, y: top, w: W - 16, h: yy - top });
    if (!phone) spans.push([top, yy]);
    y = yy + 8;
  }
  drawGrid(s, scale, sc, spans);
  s.h = y;
  return s;
}

/** The drawing of a range chart, in either form. */
function layoutRange(model, phone = false) {
  const { scale } = model;
  return layoutRows(model, phone, {
    form: "range",
    scaleOn: (x0, x1, room) => makeScale(scale, x0, x1, room),
    ends: [fmt(scale.from), fmt(scale.to)],
    unit: scale.unit,
    groups: model.groups,
    extent,
    // An estimate's point is drawn last, over its bar and the lines through it.
    markSvg: (r, sc, x0, x1, cy, through) => markSvg(r, sc, x0, x1, cy) + through + (r.type === "estimate" ? `<circle cx="${num(sc.x(r.at))}" cy="${num(cy)}" r="5" class="r-pt"/>` : ""),
    bar: (r, sc) => (r.type === "range" || r.type === "estimate" ? [sc.x(r.from), sc.x(r.to)] : null),
  });
}

/** The rows in words: a table of each row's name, its value and its group, and a line for each named mark. */
function wordsOf(model) {
  const { scale, groups } = model;
  const unit = scale.unit ? ` ${scale.unit}` : "";
  const group = (r) => (groups.length ? `<td>${esc(r.group.name)}</td>` : "");
  const groupHead = groups.length ? '<th scope="col">Group</th>' : "";
  // A chart of estimates only gives each row's estimate, low and high in columns of their own.
  const estimates = model.rows.every((r) => r.type === "estimate");
  const head = estimates
    ? `<tr><th scope="col">Row</th><th scope="col" class="num">${scale.unit ? `Estimate, in ${esc(scale.unit)}` : "Estimate"}</th><th scope="col" class="num">Low</th><th scope="col" class="num">High</th>${model.rows.some((r) => r.note) ? '<th scope="col">Note</th>' : ""}${groupHead}</tr>`
    : `<tr><th scope="col">Row</th><th scope="col">${scale.unit ? `Value, in ${esc(scale.unit)}` : "Value"}</th>${groupHead}</tr>`;
  const body = model.rows.map((r) => (estimates
    ? `<tr><th scope="row">${esc(r.name)}</th><td class="num">${esc(r.shown.at)}</td><td class="num">${esc(r.shown.from)}</td><td class="num">${esc(r.shown.to)}</td>${model.rows.some((x) => x.note) ? `<td>${esc(r.note || "")}</td>` : ""}${group(r)}</tr>`
    : `<tr><th scope="row">${esc(r.name)}</th><td>${esc(r.value)}</td>${group(r)}</tr>`)).join("");
  const marks = scale.marks.map((m) => `<li>A line at ${esc(fmt(m.at))}${esc(unit)}: ${esc(m.name)}.</li>`).join("");
  return `<div class="table-wrap is-text" role="region" aria-label="The rows of the range chart" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>${marks ? `\n<ul>${marks}</ul>` : ""}`;
}

module.exports = { readRange, layoutRange, layoutRows, wordsOf, MOST, ROW };
