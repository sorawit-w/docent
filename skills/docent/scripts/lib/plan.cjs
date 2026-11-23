// Plans: where the parts of a page or a screen sit, on both axes. The author writes a grid of named areas, as CSS writes
// grid-template-areas, with optional column widths; row heights are never to scale. Nothing moves. It is drawn twice
// with text at its real size: 640px wide for a desktop and for paper, and 264px wide for a phone, where the same grid is
// drawn again and a narrow column grows until its names fit. Its boxes are also written as a table, in words.
// The rules come from docs/proposals/two-dimensional-layouts.md.
const { DataError, fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrapName, graphemes, NO_SPACES } = require("./range.cjs");
const { onLines } = require("./layout.cjs");
const { valueWidth, fmt, isNum, num, diff } = require("./scale.cjs");

const MOST = { rows: 5, columns: 4, boxes: 8, name: 20, note: 24, unit: 12, nameLines: 3, noteLines: 2 };
const WIDE = 640, PHONE = 264; // as for a scale chart: a desktop and A4 paper, and a 320px screen
const SIDE = 12; // the plan's columns start 12px from each side of the drawing
const NAME = 18, NOTE = 16; // the height of a line of a name (14px) and of a note (12px)
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const and = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")}${list.length > 2 ? "," : ""} and ${list[list.length - 1]}` : list[0]);
const sum = (list) => list.reduce((a, b) => a + b, 0);
const add = (a, b) => diff(-a, b); // a + b without the noise of the sum (0.1 + 0.2 is 0.3)
const span = (word, a, b) => (a === b ? `${word} ${a + 1}` : `${word}s ${a + 1} to ${b + 1}`);

/** Checks plan data and returns the model: the boxes in the order of "areas", each with its first and last row and column. */
function readPlan(data, what = "plan") {
  if (data.place != null && data.place !== "flow") fail(`a ${what} sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a ${what} has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  if (data.scale != null) fail(`a ${what} has no "scale"; write the widths of the columns in "columns", and their unit in "unit"`);
  if (data.rows != null) fail(`a ${what} has no "rows"; write each row as a string in "areas"`);

  const areas = data.areas;
  if (!Array.isArray(areas) || areas.length < 1 || areas.length > MOST.rows || !areas.every((r) => typeof r === "string")) fail(`"areas" must be a list of 1 to ${MOST.rows} strings, one for each row`);
  const grid = areas.map((r) => r.trim().split(/\s+/).filter(Boolean));
  grid.forEach((cells, r) => {
    if (cells.length < 1 || cells.length > MOST.columns) fail(`row ${r + 1} of "areas" has ${cells.length} cells; a ${what} has 1 to ${MOST.columns} columns`);
    if (cells.length !== grid[0].length) fail(`row ${r + 1} of "areas" has ${cells.length} cells, and row 1 has ${grid[0].length}; every row needs the same number of cells`);
    for (const c of cells) if (c !== "." && !/^[a-z][a-z0-9-]{0,39}$/.test(c)) fail(`row ${r + 1} of "areas" has the cell "${c}"; a cell is the id of a box (small letters, digits and "-") or "." for an empty cell`);
  });
  const R = grid.length, C = grid[0].length;

  if (!Array.isArray(data.boxes)) fail(`"boxes" must be a list of ${2} to ${MOST.boxes} boxes`);
  if (data.boxes.length < 2 || data.boxes.length > MOST.boxes) fail(`a ${what} has 2 to ${MOST.boxes} boxes; this one has ${data.boxes.length}`);
  const listed = data.boxes.map((b, i) => {
    if (!b || typeof b !== "object") fail(`box ${i + 1} must be an object with an "id" and a "name"`);
    const bid = id(b.id, `the id of box ${i + 1}`);
    return { id: bid, name: words(b.name, `the name of the box "${bid}"`, MOST.name), note: words(b.note, `the note of the box "${bid}"`, MOST.note, false) };
  });
  listed.forEach((b, i) => { if (listed.findIndex((o) => o.id === b.id) !== i) fail(`two boxes have the id "${b.id}"`); });

  // The boxes in the order of "areas", row by row, left to right, each with the block of cells it takes.
  const byId = new Map(listed.map((b) => [b.id, b]));
  const boxes = [];
  grid.forEach((cells, r) => cells.forEach((c, k) => {
    if (c === ".") return;
    if (!byId.has(c)) fail(`"areas" names "${c}", which is not in "boxes"`);
    let box = boxes.find((b) => b.id === c);
    if (!box) boxes.push((box = { ...byId.get(c), cells: [] }));
    box.cells.push([r, k]);
  }));
  for (const b of listed) if (!boxes.some((o) => o.id === b.id)) fail(`the box "${b.id}" is in "boxes" but not in "areas"`);
  for (const b of boxes) {
    const rs = b.cells.map(([r]) => r), cs = b.cells.map(([, c]) => c);
    [b.r0, b.r1, b.c0, b.c1] = [Math.min(...rs), Math.max(...rs), Math.min(...cs), Math.max(...cs)];
    if (b.cells.length !== (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1)) {
      const parts = [...new Set(cs)].sort((a, z) => a - z).map((c) => {
        const rows = b.cells.filter(([, k]) => k === c).map(([r]) => r + 1);
        return `${rows.length > 1 ? `rows ${and(rows.map(String))}` : `row ${rows[0]}`} in column ${c + 1}`;
      });
      // A comma before the last "and" keeps "rows 2 and 3 in column 1, and row 3 in column 2" readable.
      fail(`the box "${b.id}" does not form one rectangle in "areas": it takes ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}` : parts[0]}. A box takes a block of whole rows and whole columns`);
    }
    delete b.cells;
  }
  for (let r = 0; r < R; r++) if (grid[r].every((c) => c === ".")) fail(`row ${r + 1} of "areas" holds only empty cells; remove it`);
  for (let c = 0; c < C; c++) if (grid.every((cells) => cells[c] === ".")) fail(`column ${c + 1} of "areas" holds only empty cells; remove it`);

  if ((data.columns == null) !== (data.unit == null || data.unit === "")) fail(`"columns" and "unit" go together: a width needs its unit, and a unit needs widths`);
  let columns = null;
  if (data.columns != null) {
    if (!Array.isArray(data.columns)) fail(`"columns" must be a list of widths, one for each column of "areas"`);
    if (data.columns.length !== C) fail(`"columns" has ${data.columns.length} width${data.columns.length === 1 ? "" : "s"}, and "areas" has ${C} column${C === 1 ? "" : "s"}`);
    data.columns.forEach((w, i) => { if (!isNum(w) || !(w > 0)) fail(`width ${i + 1} of "columns" is ${JSON.stringify(w)}; a width is a number more than 0`); });
    columns = data.columns.slice();
  }
  const unit = words(data.unit, '"unit"', MOST.unit, false);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "plan", what, unit, columns, rows: R, cols: C, boxes };
}

/**
 * The widest piece of a text that cannot break, at a size, when the text has at most `lines` lines: a whole word, or for
 * a word of a script written without spaces (Thai, Chinese), the widest of `lines` runs of about equal length.
 */
function pieceOf(text, size, lines) {
  return Math.max(...text.split(" ").map((word) => {
    if (!NO_SPACES.test(word)) return textWidth(word, size);
    const chars = [...graphemes.segment(word)].map((g) => g.segment), n = Math.ceil(chars.length / lines);
    let most = 0;
    for (let i = 0; i < chars.length; i += n) most = Math.max(most, textWidth(chars.slice(i, i + n).join(""), size));
    return most;
  }));
}

/** The room a box needs across: its widest piece, 16px of room and the 4px gap, and at least 40px. The value of a heat plan's
 * box (its number, or "no data") is one more line, which never breaks. */
const needOf = (b) => Math.max(40, Math.max(pieceOf(b.name, 14, MOST.nameLines), b.note ? pieceOf(b.note, 12, MOST.noteLines) : 0, b.shown != null ? valueWidth(b.shown) : 0) + 20);

/**
 * The sizing rule: the width of each column in `room` px, and whether the form is to scale. Each column gets its share of
 * the room by weight (its width, or 1 with no widths); a column below the least width its names need is set to that width,
 * and the others share what is left, until no column is below. It refuses a plan whose least widths add up to more.
 */
function sizeColumns(model, room, where) {
  const C = model.cols, weights = model.columns || Array(C).fill(1);
  const least = Array(C).fill(0);
  const cols = (b) => Array.from({ length: b.c1 - b.c0 + 1 }, (_, k) => b.c0 + k);
  for (const b of model.boxes) if (b.c0 === b.c1) least[b.c0] = Math.max(least[b.c0], needOf(b));
  for (const b of model.boxes.filter((o) => o.c0 !== o.c1).sort((p, q) => (p.c1 - p.c0) - (q.c1 - q.c0))) {
    const short = needOf(b) - sum(cols(b).map((c) => least[c]));
    if (short > 0) { const w = sum(cols(b).map((c) => weights[c])); for (const c of cols(b)) least[c] += (short * weights[c]) / w; }
  }
  if (sum(least) > room + 1e-9) {
    const widest = [...model.boxes].sort((p, q) => needOf(q) - needOf(p)).slice(0, 2).map((b) => `"${b.name}" (${span("column", b.c0, b.c1)})`);
    fail(`the ${model.what} does not fit ${where}: its columns need ${Math.ceil(sum(least))}px, and ${where === "a phone" ? "a phone has" : "the drawing has"} ${room}px. The widest name${widest.length > 1 ? "s are" : " is"} ${and(widest)}. Shorten ${widest.length > 1 ? "them" : "it"}, or use fewer columns`);
  }
  const { widths, fixed } = share(least, weights, room);
  return { widths, toScale: !!model.columns && !fixed.some(Boolean) };
}

/** Each column's share of `room` by weight; a column below its least width is set to that width, and the others share what is left. */
function share(least, weights, room) {
  const fixed = least.map(() => false);
  for (;;) {
    const free = room - sum(least.filter((_, c) => fixed[c])), weight = sum(weights.filter((_, c) => !fixed[c]));
    const widths = least.map((l, c) => (fixed[c] ? l : (free * weights[c]) / weight));
    const low = widths.map((w, c) => !fixed[c] && w < least[c] - 1e-9);
    if (!low.some(Boolean)) return { widths, fixed };
    low.forEach((on, c) => { if (on) fixed[c] = true; });
  }
}

/** The drawing at 640px, and at 264px for a phone; a phone whose grid cannot fit gets the stack form instead. It starts at
 * `top`, which a heat plan moves down to make room for its legend. */
function drawPlan(model, phone = false, top = 12) {
  if (!phone) return gridForm(model, false, top);
  try {
    return gridForm(model, true, top);
  } catch (e) {
    if (!(e instanceof DataError)) throw e;
    return stackForm(model, top);
  }
}

/** The grid form: the grid of boxes on one band, the line that says how to read it, and the widths above the columns. */
function gridForm(model, phone, top = 12) {
  const W = phone ? PHONE : WIDE, room = W - 2 * SIDE;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const { widths, toScale } = sizeColumns(model, room, phone ? "a phone" : "a desktop and paper");
  const xs = [SIDE];
  for (const w of widths) xs.push(xs[xs.length - 1] + w);
  const s = { form: "plan", toScale, w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };

  // The text of each box at the width it gets: a name on at most 3 lines, a note on at most 2.
  const texts = model.boxes.map((b) => {
    const cell = xs[b.c1 + 1] - xs[b.c0], text = cell - 20, boxW = Math.round(cell - 4);
    const name = wrapName(b.name, text, { size: 14, weight: 400, every: false });
    if (name.length > MOST.nameLines) fail(`the name of the box "${b.id}" needs ${name.length} lines in its ${boxW}px box ${where}; a name has at most ${MOST.nameLines}. Shorten it`);
    const note = b.note ? wrapName(b.note, text, { size: 12, weight: 400, every: false }) : [];
    if (note.length > MOST.noteLines) fail(`the note of the box "${b.id}" needs ${note.length} lines in its ${boxW}px box ${where}; a note has at most ${MOST.noteLines}. Shorten it`);
    const small = (b.shown != null ? 1 : 0) + note.length; // the 12px lines under the name: a heat plan's value, then the note
    return { name, note, need: 20 + name.length * NAME + (small ? 2 + small * NOTE : 0) };
  });
  // Row heights: at least 40px; a box in one row raises its row, then a box across rows raises the last of its rows.
  const heights = Array(model.rows).fill(40);
  model.boxes.forEach((b, i) => { if (b.r0 === b.r1) heights[b.r0] = Math.max(heights[b.r0], texts[i].need); });
  model.boxes.forEach((b, i) => {
    if (b.r0 === b.r1) return;
    const short = texts[i].need - sum(heights.slice(b.r0, b.r1 + 1));
    if (short > 0) heights[b.r1] += short;
  });

  // The line that says how to read the plan (it wraps when a long unit meets "not to scale" on a phone), then the widths above the columns.
  let y = top;
  const full = !model.columns ? "Not to scale" : `Widths in ${model.unit}${toScale ? "" : ", not to scale"}`;
  const head = textWidth(full, 12, 400) <= room || toScale || !model.columns ? wrapName(full, room, { size: 12, weight: 400, every: false })
    : [...wrapName(`Widths in ${model.unit},`, room, { size: 12, weight: 400, every: false }), "not to scale"];
  head.forEach((line, k) => s.notes.push({ x: SIDE, y: y + 12 + k * NOTE, s: line, cls: "sub", anchor: "start" }));
  y += 20 + (head.length - 1) * NOTE;
  if (model.columns) {
    const labels = model.columns.map((w, c) => {
      const label = fmt(w), lw = valueWidth(label), cx = (xs[c] + xs[c + 1]) / 2;
      return { c, label, w: lw, x: Math.min(Math.max(cx - lw / 2, SIDE), W - SIDE - lw) };
    });
    const lines = onLines(labels, 4, (p, q) => `the widths ${p.label} and ${q.label} above columns ${p.c + 1} and ${q.c + 1} need a third line ${where}; widen the narrow column, or write the gap in a note`);
    for (const l of labels) s.notes.push({ x: l.x + l.w / 2, y: y + 12 + l.line * NOTE, s: l.label, cls: "val", anchor: "middle" });
    y += lines * NOTE + 4;
  }

  // The band is the page or screen itself; every box sits on it, 2px inside the lines of its cells.
  const gridTop = y + 4, ys = [gridTop];
  for (const h of heights) ys.push(ys[ys.length - 1] + h);
  s.bands.push({ x: SIDE - 4, y, w: room + 8, h: ys[ys.length - 1] + 4 - y });
  model.boxes.forEach((b, i) => {
    const x = xs[b.c0] + 2, by = ys[b.r0] + 2, w = xs[b.c1 + 1] - xs[b.c0] - 4, h = ys[b.r1 + 1] - ys[b.r0] - 4;
    const t = texts[i], lines = [];
    // A heat plan's box with a number is filled with its heat step, and its texts take the text color, or the page color on
    // steps 4 and 5; a note is not muted there, because the muted color is too faint on the darker steps. A plan's box, and a
    // heat plan's box with no data, keep the plan's look.
    const on = b.heat > 0, hi = b.heat >= 4 ? " hi" : "";
    t.name.forEach((line, k) => lines.push({ x: x + 8, y: by + 8 + 14 + k * NAME, s: line, cls: on ? `row${hi}` : "row", anchor: "start" }));
    const small = [...(b.shown != null ? [[b.shown, on ? `hv${hi}` : "sub"]] : []), ...t.note.map((line) => [line, on ? `hn${hi}` : "sub"])];
    const smallTop = by + 8 + t.name.length * NAME + 2;
    small.forEach(([line, cls], k) => lines.push({ x: x + 8, y: smallTop + 12 + k * NOTE, s: line, cls, anchor: "start" }));
    s.parts.push({ id: b.id, svg: `<rect x="${num(x)}" y="${num(by)}" width="${num(w)}" height="${num(h)}" rx="4" class="${on ? `box h${b.heat}` : "box"}"/>`, texts: lines });
  });
  s.h = ys[ys.length - 1] + 4 + 12;
  return s;
}

/**
 * The stack form, for a phone whose grid cannot fit: each box on a band of its own, in the order of "areas". At the left
 * of the band, a map of the whole plan, 40px wide, with this band's box filled; at the right, the box's name, its note and
 * its width, wrapped in 180px. The map is to scale across when the data has widths, but no column is narrower than 3px.
 */
function stackForm(model, top = 12) {
  const W = PHONE, MAP = 40, CELL = 8, LEFT = 16, TEXT = LEFT + MAP + 12, room = W - 8 - TEXT;
  const { widths, fixed } = share(Array(model.cols).fill(3), model.columns || Array(model.cols).fill(1), MAP);
  const toScale = !!model.columns && !fixed.some(Boolean);
  const xs = [0];
  for (const w of widths) xs.push(xs[xs.length - 1] + w);
  const s = { form: "plan", stack: true, toScale, w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  let y = top;
  const head = wrapName(!model.columns ? "Not to scale" : `Widths in ${model.unit}${toScale ? "" : ", maps not to scale"}`, W - 2 * SIDE, { size: 12, weight: 400, every: false });
  head.forEach((line, k) => s.notes.push({ x: SIDE, y: y + 12 + k * NOTE, s: line, cls: "sub", anchor: "start" }));
  y += 20 + (head.length - 1) * NOTE;
  const small = { size: 12, weight: 400 };
  // A heat plan writes each box's value, with the unit of its scale, under the name, in the text color.
  const valueOf = (b) => (b.value == null ? [["no data", "sub"]] : wrapName(`${b.shown} ${model.scale.unit}`, room, small).map((line) => [line, "hv"]));
  for (const b of model.boxes) {
    const bandTop = y, name = wrapName(b.name, room), subs = [...(b.shown != null ? valueOf(b) : []), ...(b.note ? wrapName(b.note, room, small) : []).map((line) => [line, "sub"])];
    if (model.columns) subs.push(...wrapName(`${fmt(model.columns.slice(b.c0, b.c1 + 1).reduce(add))} ${model.unit} wide`, room, small).map((line) => [line, "sub"]));
    const texts = name.map((line, k) => ({ x: TEXT, y: bandTop + 24 + k * NAME, s: line, cls: "name", anchor: "start" }));
    const subTop = bandTop + 10 + name.length * NAME + 2;
    subs.forEach(([line, cls], k) => texts.push({ x: TEXT, y: subTop + 12 + k * NOTE, s: line, cls, anchor: "start" }));
    // This band's box is drawn last, so the outlines of its neighbours do not cut into its fill. In a plan it is filled; in a
    // heat plan every box is filled with its step, so this band's box has a thick outline in the text color instead, with a thin
    // line in the page color inside it: on a step as dark as the outline (or, in dark mode, as light), the inner line still shows.
    const cls = (o) => (b.shown == null ? (o === b ? "m-on" : "m-box") : `m-box${o.heat ? ` h${o.heat}` : ""}${o === b ? " m-at" : ""}`);
    const map = [...model.boxes.filter((o) => o !== b), b].map((o) => {
      const x = LEFT + xs[o.c0] + 0.5, my = bandTop + 10 + o.r0 * CELL + 0.5, w = xs[o.c1 + 1] - xs[o.c0] - 1, h = (o.r1 - o.r0 + 1) * CELL - 1;
      const inner = o === b && b.shown != null && w > 3 ? `<rect x="${num(x + 1.5)}" y="${num(my + 1.5)}" width="${num(w - 3)}" height="${num(h - 3)}" class="m-in"/>` : "";
      return `<rect x="${num(x)}" y="${num(my)}" width="${num(w)}" height="${num(h)}" class="${cls(o)}"/>${inner}`;
    }).join("");
    const h = 20 + Math.max(model.rows * CELL, name.length * NAME + (subs.length ? 2 + subs.length * NOTE : 0));
    s.bands.push({ x: 8, y: bandTop, w: W - 16, h });
    s.parts.push({ id: b.id, svg: map, texts });
    y = bandTop + h + 8;
  }
  s.h = y + 4;
  return s;
}

/** The words for where a box sits: top, middle, bottom or "row 2"; full height; "rows 2 to 3". The same for columns. */
function placeOf(a, b, count, [first, last, all, word]) {
  if (a === 0 && b === count - 1) return all;
  if (a !== b) return span(word, a, b);
  if (a === 0) return first;
  if (a === count - 1) return last;
  return count === 3 ? "middle" : `${word} ${a + 1}`;
}

/** The boxes in words: a table of each box's row, column, width and note, and a line on the unit and the scale of each form. */
function wordsOf(model, scene, phone) {
  const notes = model.boxes.some((b) => b.note);
  const value = model.scale != null; // a heat plan: each box's number, or "no data", next to its name
  const head = `<tr><th scope="col">Box</th>${value ? '<th scope="col">Value</th>' : ""}<th scope="col">Row</th><th scope="col">Column</th>${model.columns ? '<th scope="col">Width</th>' : ""}${notes ? '<th scope="col">Note</th>' : ""}</tr>`;
  const body = model.boxes.map((b) => {
    const row = placeOf(b.r0, b.r1, model.rows, ["top", "bottom", "full height", "row"]);
    const col = placeOf(b.c0, b.c1, model.cols, ["left", "right", "full width", "column"]);
    const width = model.columns ? `<td>${fmt(model.columns.slice(b.c0, b.c1 + 1).reduce(add))}</td>` : "";
    return `<tr><th scope="row">${esc(b.name)}</th>${value ? `<td>${b.shown}</td>` : ""}<td>${row}</td><td>${col}</td>${width}${notes ? `<td>${esc(b.note)}</td>` : ""}</tr>`;
  }).join("");
  let scale;
  if (!model.columns) scale = "The plan is not drawn to scale.";
  else if (scene && !scene.toScale) scale = `Widths are in ${esc(model.unit)}. The rows and the columns are not drawn to scale.`;
  else scale = `Widths are in ${esc(model.unit)}. The rows are not drawn to scale.${phone && !phone.stack && !phone.toScale ? " On a phone the columns are not drawn to scale either." : ""}`;
  if (phone && phone.stack) scale += " On a phone each box stands on its own, beside a small map of the plan.";
  const table = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
  // A heat plan's table has a column more, so on a phone it scrolls inside a wrapper, as a heat map's numbers do, instead of
  // breaking its words inside.
  return `${value ? `<div class="table-wrap is-text" role="region" aria-label="The boxes of the heat plan" tabindex="0">${table}</div>` : table}\n<p>${scale}</p>`;
}

/** What render adds after the form: which forms are not to scale. */
function scaleNote(model, scene, phone) {
  const desk = !model.columns || !scene.toScale ? "not to scale" : "";
  if (phone.stack) return desk ? `${desk}; stacked on a phone` : "stacked on a phone";
  return desk || (phone.toScale ? "" : "not to scale on a phone");
}

module.exports = { readPlan, drawPlan, wordsOf, scaleNote, sizeColumns, MOST, WIDE, PHONE };
