// Range charts: values and ranges on one numeric scale, one row each. A row is a range (from and to), a point (at),
// an upper limit (to alone) or a lower limit (from alone). Nothing moves: a range chart has no order.
// It is drawn twice with text at its real size: 640px wide for a desktop and for paper, and 264px wide for a phone,
// where each row name stands on its own line above its mark. Its rows are also written as a table, in words.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrap } = require("./graph.cjs");
const { readScale, makeScale, drawHead, drawGrid, linesIn, placeLabel, valueWidth, fmt, isNum, num } = require("./scale.cjs");

const MOST = { rows: 12, groups: 3, name: 28, note: 24, group: 20 };
const WIDE = 640; // the desktop and paper form: it fits an A4 figure well (about 641.6px) with no shrink
const PHONE = 264; // the phone form: it fits a 320px screen
const ROW = 32; // the height of one mark's strip
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// A name on a phone wraps at its spaces, and inside a word that is wider than the room alone, as in a language without
// spaces. It breaks between whole characters as a reader sees them, so a Thai vowel mark stays with its consonant.
// With every: false (a plan), only a word of a script written without spaces breaks; any other word stays whole.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const wrapName = (str, room, { size = 14, weight = 600, every = true } = {}) => {
  const width = (s) => textWidth(s, size, weight);
  const lines = size === 14 && weight === 600 ? wrap(str, "name", room) : String(str).split(" ").reduce((out, word) => {
    const last = out.length ? `${out[out.length - 1]} ${word}` : word;
    if (out.length && width(last) <= room) out[out.length - 1] = last; else out.push(word);
    return out;
  }, []);
  return lines.flatMap((line) => {
    if (width(line) <= room || (!every && !NO_SPACES.test(line))) return [line];
    const out = [""];
    for (const { segment: ch } of graphemes.segment(line)) {
      const next = out[out.length - 1] + ch;
      if (out[out.length - 1] && width(next) > room) out.push(ch);
      else out[out.length - 1] = next;
    }
    return out;
  });
};

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
  const rows = data.rows.map((r, i) => {
    if (!r || typeof r !== "object") fail(`row ${i + 1} must be an object with a "name" and its numbers`);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const what = `row ${i + 1} ("${name}")`;
    const has = (k) => r[k] != null;
    for (const k of ["from", "to", "at"]) if (has(k) && (!isNum(r[k]) || r[k] < scale.from || r[k] > scale.to)) fail(`${what} has "${k}": ${JSON.stringify(r[k])}; it must be a number on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}`);
    let type;
    if (has("at")) {
      if (has("from") || has("to")) fail(`${what} has "at" and also "from" or "to"; a row has one mark: a point ("at"), a range ("from" and "to"), or one limit ("from" or "to" alone)`);
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
    const value = { range: () => `${fmt(r.from)}–${fmt(r.to)}`, point: () => fmt(r.at), upper: () => `up to ${fmt(r.to)}`, lower: () => `at least ${fmt(r.from)}` }[type]();
    return { name, type, from: r.from, to: r.to, at: r.at, note, group, value: note ? `${value}, ${note}` : value };
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
  if (r.type === "range") return `<rect x="${num(sc.x(r.from))}" y="${num(cy - 8)}" width="${num(sc.x(r.to) - sc.x(r.from))}" height="16" rx="4" class="r-bar"/>`;
  if (r.type === "upper") return `<path d="M${num(x0)},${num(cy)} H${num(sc.x(r.to))} M${num(sc.x(r.to))},${num(cy - 8)} V${num(cy + 8)}" class="r-lim"/>`;
  return `<path d="M${num(sc.x(r.from))},${num(cy - 8)} V${num(cy + 8)} M${num(sc.x(r.from))},${num(cy)} H${num(x1)}" class="r-lim"/>`;
}

/** The drawing: 640px wide with the row names in a column at the left, or 264px wide with each name above its mark. */
function layoutRange(model, phone = false) {
  const { scale, rows } = model;
  const W = phone ? PHONE : WIDE;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form: "range", w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  // The first and the last tick label are centred on their ticks, so each end of the scale leaves room for half of its own
  // label. The labels between them are checked against the edges when the ticks are chosen.
  const firstHalf = valueWidth(fmt(scale.from)) / 2;
  const lastHalf = valueWidth(fmt(scale.to)) / 2;
  let x0, x1, lo;
  if (phone) [x0, x1, lo] = [Math.ceil(Math.max(20, 12 + firstHalf)), Math.floor(Math.min(W - 20 - 32, W - 12 - lastHalf)), 12];
  else {
    const nameW = Math.max(...rows.map((r) => textWidth(r.name, 14)), ...model.groups.map((g) => textWidth(g.name, 14, 600)));
    // The unit stands left of the first tick label, so the scale also leaves room for the unit there.
    const unitRoom = scale.unit ? 12 + textWidth(scale.unit, 12) + 10 + firstHalf : 0;
    [x0, x1] = [Math.ceil(Math.max(20 + nameW + 24, unitRoom, 12 + firstHalf)), Math.floor(Math.min(W - 20 - 40, W - 12 - lastHalf))];
    lo = x0 - 12; // a value on the left of its mark stays clear of the row names
  }
  const hi = W - 12;
  const sc = makeScale(scale, x0, x1, { lo: 12, hi: W - 12 });
  let y = drawHead(s, scale, sc, { W, x0, phone, where });

  // One band for each group (or one band for all rows), with the rows in it. Grid lines run through the band on a
  // desktop, and through each row's strip on a phone, where the row names stand in the scale's room.
  const spans = [];
  const groups = model.groups.length ? model.groups : [{ name: "", rows }];
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
      const tw = valueWidth(r.value);
      const place = placeLabel({ a, b, w: tw, lo, hi, sides });
      if (!place) fail(`the value "${r.value}" of the row "${r.name}" has no free place ${where}; shorten its note`);
      if (place.side === "above") yy += 16;
      const cy = yy + ROW / 2;
      if (!phone) s.notes.push({ x: 20, y: cy + 5, s: r.name, cls: "row", anchor: "start" });
      const ty = place.side === "above" ? cy - 14 : cy + 4;
      const left = place.anchor === "end" ? place.x - tw : place.anchor === "middle" ? place.x - tw / 2 : place.x;
      s.notes.push({ x: place.x, y: ty, s: r.value, cls: "val", anchor: place.anchor, knock: { x: left - 4, y: ty - 12, w: tw + 8, h: 16 } });
      const through = r.type === "range" ? linesIn(scale, sc, sc.x(r.from), cy - 8, sc.x(r.to) - sc.x(r.from), 16) : "";
      s.parts.push({ id: r.name, svg: markSvg(r, sc, x0, x1, cy) + through, texts: [] });
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

/** The rows in words: a table of each row's name, its value and its group, and a line for each named mark. */
function wordsOf(model) {
  const { scale, groups } = model;
  const unit = scale.unit ? ` ${scale.unit}` : "";
  const head = `<tr><th scope="col">Row</th><th scope="col">${scale.unit ? `Value, in ${esc(scale.unit)}` : "Value"}</th>${groups.length ? '<th scope="col">Group</th>' : ""}</tr>`;
  const body = model.rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th><td>${esc(r.value)}</td>${groups.length ? `<td>${esc(r.group.name)}</td>` : ""}</tr>`).join("");
  const marks = scale.marks.map((m) => `<li>A line at ${esc(fmt(m.at))}${esc(unit)}: ${esc(m.name)}.</li>`).join("");
  return `<div class="table-wrap is-text" role="region" aria-label="The rows of the range chart" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>${marks ? `\n<ul>${marks}</ul>` : ""}`;
}

module.exports = { readRange, layoutRange, wordsOf, wrapName, graphemes, NO_SPACES, MOST, WIDE, PHONE };
