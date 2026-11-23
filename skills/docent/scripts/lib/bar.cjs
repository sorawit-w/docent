// Bar charts: one amount for each named thing, as horizontal bars from 0 on one scale, so their lengths compare. With
// "series", each row has two values and is drawn as a dumbbell: a ring for the first, a dot for the second, joined by a
// muted line; its scale may start above 0, because a gap does not change when the scale moves. The rows are sorted, and the
// line above the chart says how and where the scale starts. A number that is not known is null, and its row stays in the
// chart with "no data". It is drawn twice with text at its real size: 640px wide for a desktop and for paper, and 264px wide
// for a phone, where each row name stands on its own line above its bar. Its rows are also written as a table, in words.
// The rules against a cut scale, for a stated order and for rows with no data follow diagram-design's chart guides (MIT).
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { WIDE, PHONE, esc, wrapName, headLines, apart, readScale, makeScale, drawHead, drawGrid, linesIn, placeLabel, valueWidth, fmt, isNum, num, diff } = require("./chart.cjs");

const MOST = { rows: 16, groups: 3, name: 28, group: 20, series: 16, note: 32 };
const ROW = 32; // the height of one bar's strip
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Checks bar data and returns the model, with the rows in the order they are drawn. */
function readBar(data) {
  if (data.place != null && data.place !== "flow") fail(`a bar chart sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a bar chart has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  const scale = readScale(data.scale, { needStep: true });
  if (scale.marks.length) fail(`a bar chart has no "marks" in its scale; say a target or a limit in the text beside the figure`);
  let series = null;
  if (data.series != null) {
    if (!Array.isArray(data.series) || data.series.length !== 2) fail(`"series" must be a list of two names, one for each value of a row, such as ["2025", "2026"]`);
    series = data.series.map((n, k) => words(n, `series name ${k + 1}`, MOST.series));
    if (series[0] === series[1]) fail(`the two series have the same name, "${series[0]}"`);
  }
  if (!series && scale.from > 0) fail(`a bar starts at 0; a scale from ${fmt(scale.from)} cuts every bar short, so their lengths no longer compare. Start the scale at 0, or use a range chart to show where values fall`);
  if (!series && scale.to < 0) fail(`a bar starts at 0; a scale that ends at ${fmt(scale.to)} does not reach 0. End the scale at 0 or above`);
  const order = data.order ?? "largest";
  if (!["largest", "smallest", "written", "change"].includes(order)) fail(`"order" must be "largest", "smallest" or "written", or "change" for a chart with "series"`);
  if (order === "change" && !series) fail(`"order": "change" sorts the rows of a dumbbell by how much each changed; a chart with one value in each row has no change. Use "largest", "smallest" or "written"`);
  const orderNote = words(data.orderNote, `"orderNote"`, MOST.note, false);
  if (order === "written" && !orderNote) fail(`"order": "written" needs "orderNote", which says how the rows are sorted, such as "oldest release first"`);
  if (order !== "written" && orderNote) fail(`"orderNote" is only for "order": "written"; for the order "${order}", render says the order itself`);

  if (data.groups != null && !Array.isArray(data.groups)) fail(`"groups" must be a list`);
  const groups = (data.groups || []).map((g, i) => {
    const what = `group ${i + 1}`;
    if (!g || typeof g !== "object") fail(`${what} must be an object with "id" and "name"`);
    return { id: id(g.id, `the id of ${what}`), name: words(g.name, `the name of ${what}`, MOST.group), rows: [] };
  });
  if (groups.length > MOST.groups) fail(`a bar chart has at most ${MOST.groups} groups; this one has ${groups.length}`);
  groups.forEach((g, i) => { if (groups.findIndex((o) => o.id === g.id) !== i) fail(`two groups have the id "${g.id}"`); });

  if (!Array.isArray(data.rows)) fail(`"rows" must be a list`);
  if (data.rows.length < 2 || data.rows.length > MOST.rows) fail(`a bar chart has 2 to ${MOST.rows} rows; this one has ${data.rows.length}`);
  const onScale = `a number on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}, or null when it is not known`;
  const written = data.rows.map((r, i) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) fail(`row ${i + 1} must be an object with a "name" and its ${series ? '"values"' : '"value"'}`);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const what = `row ${i + 1} ("${name}")`;
    const check = (v, field) => {
      if (v !== null && (!isNum(v) || v < scale.from || v > scale.to)) fail(`${what} has ${field}: ${JSON.stringify(v)}; it must be ${onScale}`);
      return v;
    };
    let values;
    if (series) {
      if (Object.hasOwn(r, "value")) fail(`${what} has "value"; with "series", each row has "values", a list of two numbers, one for each series`);
      if (!Array.isArray(r.values) || r.values.length !== 2) fail(`${what} needs "values", a list of two numbers, one for "${series[0]}" and one for "${series[1]}"; write null for a number that is not known`);
      values = r.values.map((v, k) => check(v, `"${series[k]}"`));
    } else {
      if (Object.hasOwn(r, "values")) fail(`${what} has "values", but the chart has no "series"; give each row one "value", or name the two series in "series" to draw a dumbbell`);
      // A missing number is written as null, so that it is a choice the author made and not a typing mistake.
      if (!Object.hasOwn(r, "value")) fail(`${what} has no "value"; write its number, or null when it is not known`);
      values = [check(r.value, '"value"')];
    }
    let group = null;
    if (groups.length) {
      if (r.group == null) fail(`${what} names no group; when a chart has groups, every row names one in "group"`);
      group = groups.find((g) => g.id === r.group) || fail(`${what} names the group "${r.group}", which does not exist`);
    } else if (r.group != null) fail(`${what} names a group, but the chart has no "groups"`);
    return { name, values, group };
  });
  const known = written.flatMap((r) => r.values).filter((v) => v !== null);
  if (!known.length) fail(`every value is null, so the chart has nothing to draw; write the numbers, or say in the text that they are not known`);
  if (!series && scale.from < 0 && !known.some((v) => v < 0)) fail(`the scale starts at ${fmt(scale.from)}, but no value is below 0; a bar starts at 0, so start the scale at 0`);

  // The order: by the value, or by a dumbbell's second value, or by the size of its change. A row with no number to sort
  // by goes last, and rows with the same number keep the order they were written in.
  const key = (r) => (!series ? r.values[0] : order === "change" ? (r.values.includes(null) ? null : Math.abs(diff(r.values[0], r.values[1]))) : r.values[1]);
  const sorted = (list) => (order === "written" ? list : [...list].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    if (ka === null || kb === null) return (ka === null) - (kb === null);
    return order === "smallest" ? ka - kb : kb - ka;
  }));
  // The rows of one group stand together, so each group is one band; the bands follow the order of the rows, and the rows
  // are sorted inside each band.
  for (const g of groups) {
    const at = written.map((r, i) => (r.group === g ? i : -1)).filter((i) => i >= 0);
    if (!at.length) fail(`the group "${g.id}" has no rows; remove it, or give it a row`);
    if (at[at.length - 1] - at[0] + 1 !== at.length) fail(`the rows of the group "${g.id}" do not stand together; put them one after another`);
    g.rows = sorted(at.map((i) => written[i]));
  }
  groups.sort((a, b) => written.indexOf(a.rows[0]) - written.indexOf(b.rows[0]));
  const rows = groups.length ? groups.flatMap((g) => g.rows) : sorted(written);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "bar", scale, series, order, orderNote, groups, rows };
}

/** The line above the chart: the unit, where the scale starts, and how the rows are sorted. A no-break space keeps "from 0" together. */
function headOf(model) {
  const { scale, series, order } = model;
  const start = series ? `scale from ${fmt(scale.from)}` : "bars from 0";
  const by = { largest: series ? `Sorted by ${series[1]}, largest first.` : "Largest first.", smallest: series ? `Sorted by ${series[1]}, smallest first.` : "Smallest first.", change: "Largest change first.", written: `${cap(model.orderNote)}${/[.!?]$/.test(model.orderNote) ? "" : "."}` }[order];
  return `${scale.unit ? `${cap(scale.unit)}, ${start}` : cap(start)}. ${by}`;
}

/** The drawing: 640px wide with the row names in a column at the left, or 264px wide with each name above its bar. */
function drawBar(model, phone = false) {
  const { scale, rows, series } = model;
  const W = phone ? PHONE : WIDE;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form: "bar", w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [], clamped: false };
  const top = headLines(s, [headOf(model)], W);

  // Room for the values. A bar's value stands 8px after its end: at the right, or at the left for a bar below 0. A
  // dumbbell's values stand 8px outside its marks, which are 5px from their centres, at both ends. Room is kept for the
  // widest value on each side that has one, so every value fits beside its mark.
  const known = rows.flatMap((r) => r.values).filter((v) => v !== null);
  const widest = (list) => Math.max(0, ...list.map((v) => valueWidth(fmt(v))));
  const right = series ? 13 + widest(known) : 8 + widest(known.filter((v) => v >= 0));
  const left = series ? 13 + widest(known) : scale.from < 0 ? 8 + widest(known.filter((v) => v < 0)) : 0;
  // The first and the last tick label are centred on their ticks, so each end of the scale leaves room for half of its label.
  const firstHalf = valueWidth(fmt(scale.from)) / 2, lastHalf = valueWidth(fmt(scale.to)) / 2;
  let x0, lo;
  if (phone) [x0, lo] = [Math.ceil(Math.max(20 + left, 12 + firstHalf)), 12];
  else {
    const nameW = Math.max(...rows.map((r) => textWidth(r.name, 14)), ...model.groups.map((g) => textWidth(g.name, 14, 600)));
    x0 = Math.ceil(Math.max(20 + nameW + 16 + left, 12 + firstHalf));
    lo = 20 + nameW + 8; // a value on the left of its mark stays clear of the row names
  }
  const x1 = Math.floor(Math.min(W - 20 - right, W - 12 - lastHalf));
  const hi = W - 12;
  const sc = makeScale(scale, x0, x1, { lo: 12, hi });
  // The unit is in the line above the chart, so the ticks do not repeat it.
  let y = drawHead(s, { ...scale, unit: "" }, sc, { W, x0, phone, where, top });

  // A dumbbell names its two series above the marks of the first row that has both, or of the first row with each mark.
  const both = series ? rows.findIndex((r) => !r.values.includes(null)) : -1;
  const keyRow = series ? [0, 1].map((k) => (both >= 0 ? both : rows.findIndex((r) => r.values[k] !== null))) : [];
  const value = (x, ty, str, anchor) => {
    const w = valueWidth(str), start = anchor === "end" ? x - w : x;
    s.notes.push({ x, y: ty, s: str, cls: "val", anchor, knock: { x: start - 4, y: ty - 12, w: w + 8, h: 16 } });
  };
  // "no data" starts where the bar would start. On a scale that ends at 0 there is no room after 0, so it stands 8px left of
  // 0, as the value of a bar below 0 does.
  const noData = (x, cy) => {
    const w = textWidth("no data", 12), left = x + w > hi;
    s.notes.push({ x: left ? x - 8 : x, y: cy + 4, s: "no data", cls: "sub", anchor: left ? "end" : "start", knock: { x: (left ? x - 8 - w : x) - 4, y: cy - 8, w: w + 8, h: 16 } });
  };

  const spans = [];
  const groups = model.groups.length ? model.groups : [{ name: "", rows }];
  for (const g of groups) {
    const band = y;
    let yy = band + 8;
    if (g.name) {
      const lines = phone ? wrapName(g.name, W - 40) : [g.name];
      lines.forEach((line, i) => s.notes.push({ x: 20, y: yy + 16 + i * 18, s: line, cls: "name", anchor: "start" }));
      yy += 24 + (lines.length - 1) * 18;
    }
    for (const r of g.rows) {
      const i = rows.indexOf(r);
      if (phone) for (const line of wrapName(r.name, W - 40)) { s.notes.push({ x: 20, y: yy + 16, s: line, cls: "row", anchor: "start" }); yy += 18; }
      const keys = [0, 1].filter((k) => keyRow[k] === i);
      // A dumbbell row with one number: the known mark, and its value with the words for the other on its free side,
      // or on a line above the mark when neither side has room.
      const one = series && r.values.filter((v) => v === null).length === 1 ? r.values.findIndex((v) => v !== null) : -1;
      let place = null, oneText = "";
      if (one >= 0) {
        const xk = sc.x(r.values[one]);
        oneText = `${fmt(r.values[one])}; no data for ${series[1 - one]}`;
        place = placeLabel({ a: xk - 5, b: xk + 5, w: valueWidth(oneText), lo, hi, sides: ["right", "left"] });
        if (!place) fail(`the value "${oneText}" of the row "${r.name}" has no free place ${where}; shorten the series names`);
      }
      const above = place && place.side === "above" ? 16 : 0;
      yy += (keys.length ? 22 : 0) + above;
      const cy = yy + ROW / 2;
      if (!phone) s.notes.push({ x: 20, y: cy + 5, s: r.name, cls: "row", anchor: "start" });
      let svg = "";
      if (!series) {
        const v = r.values[0];
        if (v === null) noData(sc.x(0), cy);
        else {
          let [a, b] = [Math.min(sc.x(0), sc.x(v)), Math.max(sc.x(0), sc.x(v))];
          // A bar narrower than 2px is drawn 2px wide, so it shows; its number gives the exact value. A value of 0 has no bar.
          if (v !== 0 && b - a < 2) { s.clamped = true; if (v > 0) b = a + 2; else a = b - 2; }
          if (v !== 0) svg = `<rect x="${num(a)}" y="${num(cy - 8)}" width="${num(b - a)}" height="16" rx="4" class="r-bar"/>${linesIn(scale, sc, a, cy - 8, b - a, 16)}`;
          if (v < 0) value(a - 8, cy + 4, fmt(v), "end"); else value(b + 8, cy + 4, fmt(v), "start");
        }
      } else if (one < 0 && r.values[0] === null) noData(x0, cy);
      else if (one >= 0) {
        const xk = sc.x(r.values[one]);
        svg = one === 0 ? `<circle cx="${num(xk)}" cy="${num(cy)}" r="4.25" class="d-ring"/>` : `<circle cx="${num(xk)}" cy="${num(cy)}" r="5" class="r-pt"/>`;
        value(place.x, place.side === "above" ? cy - 14 : cy + 4, oneText, place.anchor);
      } else {
        // The line shows the gap, not a path. The dot is drawn after the ring, so when the two marks touch the dot lies over
        // the ring; two equal values are a smaller dot inside the ring. The marks never move.
        const [p, q] = r.values, [xa, xb] = [sc.x(p), sc.x(q)];
        if (p !== q) svg += `<line x1="${num(xa)}" y1="${num(cy)}" x2="${num(xb)}" y2="${num(cy)}" class="d-gap"/>`;
        svg += `<circle cx="${num(xa)}" cy="${num(cy)}" r="4.25" class="d-ring"/>`;
        svg += p === q ? `<circle cx="${num(xa)}" cy="${num(cy)}" r="3" class="r-pt"/>` : `<circle cx="${num(xb)}" cy="${num(cy)}" r="5" class="r-pt"/>`;
        // The smaller value stands left of the left mark, the larger right of the right mark; equal values are written once.
        if (p !== q) value(Math.min(xa, xb) - 13, cy + 4, fmt(Math.min(p, q)), "end");
        value(Math.max(xa, xb) + 13, cy + 4, fmt(Math.max(p, q)), "start");
      }
      if (keys.length) {
        // The series names stand above their marks, 8px apart at least, in tabular figures, as a year often is. A name that moves for the other gets a thin line to its mark.
        const items = keys.map((k) => ({ at: sc.x(r.values[k]), size: valueWidth(series[k]) }));
        const at = apart(items, 12, W - 12, 8);
        if (!at) fail(`the series names "${series[0]}" and "${series[1]}" do not fit side by side ${where}; shorten them`);
        const ny = cy - 18 - above;
        keys.forEach((k, j) => {
          const w = items[j].size;
          s.notes.push({ x: at[j], y: ny, s: series[k], cls: "val", anchor: "middle", knock: { x: at[j] - w / 2 - 4, y: ny - 12, w: w + 8, h: 16 } });
          if (Math.abs(at[j] - items[j].at) > 0.5) svg += `<line x1="${num(at[j])}" y1="${num(ny + 4)}" x2="${num(items[j].at)}" y2="${num(cy - 7)}" class="d-lead"/>`;
        });
      }
      s.parts.push({ id: r.name, svg, texts: [] });
      if (phone) spans.push([cy - 14, cy + 14]);
      yy += ROW;
    }
    yy += 8;
    s.bands.push({ x: 8, y: band, w: W - 16, h: yy - band });
    if (!phone) spans.push([band, yy]);
    y = yy + 8;
  }
  // A scale with values below 0 has a solid muted line at 0, drawn as a named line in place of the grid line there.
  drawGrid(s, { ...scale, marks: !series && scale.from < 0 ? [{ at: 0 }] : [] }, sc, spans);
  s.h = y;
  return s;
}

/** The rows in words: a table in the order of the drawing, the line above the chart, and lines that name the rows with no data. */
function wordsOf(model, scene, phone) {
  const { series, groups, scale } = model;
  const cell = (v) => (v === null ? "no data" : fmt(v));
  const change = (r) => { if (r.values.includes(null)) return "no data"; const d = diff(r.values[0], r.values[1]); return d > 0 ? `+${fmt(d)}` : fmt(d); };
  const unit = scale.unit ? `, in ${esc(scale.unit)}` : "";
  const cols = series ? [...series.map(esc), `Change${unit}`] : [`Value${unit}`];
  const head = `<tr><th scope="col">Row</th>${cols.map((c) => `<th scope="col">${c}</th>`).join("")}${groups.length ? '<th scope="col">Group</th>' : ""}</tr>`;
  const body = model.rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th>${[...r.values.map(cell), ...(series ? [change(r)] : [])].map((c) => `<td>${c}</td>`).join("")}${groups.length ? `<td>${esc(r.group.name)}</td>` : ""}</tr>`).join("");
  const lines = [esc(headOf(model))];
  (series || [""]).forEach((n, k) => {
    const none = model.rows.filter((r) => r.values[k] === null).map((r) => esc(r.name));
    if (none.length) lines.push(`No data${n ? ` for ${esc(n)}` : ""}: ${none.join(", ")}.`);
  });
  if (scene.clamped || phone.clamped) lines.push("A bar narrower than 2px is drawn 2px wide, so it shows; its number gives the exact value.");
  return `<div class="table-wrap is-text" role="region" aria-label="The rows of the bar chart" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>\n<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

module.exports = { readBar, drawBar, wordsOf, headOf, MOST };
