// The grid that a heat map and a status grid share: one cell for each pair of a row and a column, the column labels above
// it, two forms (640px with the row names at the left, 264px with each name above its row), and the table in words that
// splits for paper. Each kind gives its own legend, its own cells and its own words; the rest is here.
const { fail, words } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrapName, WIDE, PHONE } = require("./range.cjs");
const { valueWidth, num } = require("./scale.cjs");

const MOST = { rows: 12, columns: 24, name: 20, label: 10 };
const EVERY = [2, 3, 4, 6, 12]; // they divide 24 and 12, so hours and months keep their round labels
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ordinal = (n) => `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** Refuses the fields that an author who knows the other scale charts may write. `areas` says what to write instead. */
function refuseFields(data, what, areas) {
  if (data.place != null && data.place !== "flow") fail(`${what} sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`${what} has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  if (data.groups != null) fail(`${what} has no "groups"; each row is one row of cells`);
  if (data.areas != null) fail(`${what} has no "areas"; ${areas}`);
}

/**
 * Checks the columns and the rows of a grid and returns them. Each value that is not null is read by `cell(value, row, column)`,
 * where `row` names the row for a message, such as 'row 2 ("Sign-in")'. `least` is the fewest rows; `need` is what one cell
 * must hold, for the message when every cell has no data.
 */
function readGrid(data, { what, least, need, cell }) {
  if (!Array.isArray(data.columns)) fail(`"columns" must be a list of 3 to ${MOST.columns} labels, one for each column`);
  if (data.columns.length < 3 || data.columns.length > MOST.columns) fail(`${what} has 3 to ${MOST.columns} columns; this one has ${data.columns.length}`);
  const columns = data.columns.map((c, i) => words(c, `the label of column ${i + 1}`, MOST.label));
  columns.forEach((c, i) => { if (columns.indexOf(c) !== i) fail(`two columns have the label "${c}"`); });

  const shape = `"rows" must be a list of ${least} to ${MOST.rows} rows, top to bottom, each with a "name" and its "values"`;
  if (!Array.isArray(data.rows)) fail(shape);
  if (data.rows.length < least || data.rows.length > MOST.rows) fail(`${what} has ${least} to ${MOST.rows} rows; this one has ${data.rows.length}`);
  const rows = data.rows.map((r, i) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) fail(shape);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const row = `row ${i + 1} ("${name}")`;
    if (!Array.isArray(r.values)) fail(`${row} needs "values": a list with one value for each column`);
    if (r.values.length !== columns.length) fail(`${row} has ${r.values.length} value${r.values.length === 1 ? "" : "s"}, and "columns" has ${columns.length}`);
    return { name, cells: r.values.map((v, c) => (v === null ? null : cell(v, row, columns[c]))) };
  });
  rows.forEach((r, i) => { if (rows.findIndex((o) => o.name === r.name) !== i) fail(`two rows have the name "${r.name}"`); });
  if (rows.every((r) => r.cells.every((c) => c === null))) fail(`every cell has no data; ${what} needs at least one ${need}`);
  return { columns, rows };
}

/** Two labels on one line stand at least 4px apart. A label goes to the first line where it keeps 4px from the label before. */
function onLines(items, most) {
  const ends = [];
  for (const it of items) {
    let k = ends.findIndex((e) => it.x0 >= e + 4);
    if (k < 0) { if (ends.length === most) return false; k = ends.length; }
    it.line = k;
    ends[k] = it.x0 + it.w;
  }
  return ends.length;
}

/** The column labels: every label on one line, then on two lines, then every 2nd to 12th label, never fewer than three. */
function labelsOf(model, center, W, where) {
  const all = model.columns.map((s, i) => {
    const w = valueWidth(s), cx = Math.min(Math.max(center(i), 12 + w / 2), W - 12 - w / 2);
    return { s, w, cx, x0: cx - w / 2, line: 0 };
  });
  if (onLines(all, 1)) return { items: all, lines: 1, every: 1 };
  if (onLines(all, 2)) return { items: all, lines: 2, every: 1 };
  for (const every of EVERY) {
    const kept = all.filter((_, i) => i % every === 0);
    if (kept.length < 3) break;
    if (onLines(kept, 1)) return { items: kept, lines: 1, every };
  }
  const widest = all.reduce((a, b) => (b.w > a.w ? b : a));
  fail(`the column labels do not fit ${where}, even on two lines or with every 12th label; the widest is "${widest.s}", ${Math.ceil(widest.w)}px. Shorten the labels to about 7 characters, or use fewer columns`);
}

/**
 * The drawing: 640px wide with the row names in a column at the left, or 264px wide with each name above its row of cells.
 * The kind gives `legend(scene, W)`, which draws the legend at the top and returns the y under it; `cell(c, box, numbers)`,
 * which returns { svg, text } for a cell with data in the box { x, y, w, h, cx }; and, when its cells can show numbers,
 * `fits(c, w)`, which says whether the number of c fits a cell w px wide.
 */
function drawGrid(model, phone, { form, legend, cell, fits }) {
  const { rows } = model;
  const W = phone ? PHONE : WIDE, n = model.columns.length;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form, w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [], numbers: false, labels: null };
  const top = legend(s, W);

  // The columns share the grid's width equally. Cells are 2px apart, or 1px when they are narrower than 16px.
  const nameW = phone ? 0 : Math.max(...rows.map((r) => textWidth(r.name, 14)));
  const x0 = phone ? 20 : Math.ceil(20 + nameW + 16), x1 = W - 20;
  const pitch = (x1 - x0) / n, gap = pitch - 2 < 16 ? 1 : 2, cellW = pitch - gap;
  const center = (c) => x0 + (c + 0.5) * pitch;

  // Every number shows in its cell when every number fits, or none does.
  s.numbers = Boolean(fits) && rows.every((r) => r.cells.every((c) => !c || fits(c, cellW)));

  const lb = labelsOf(model, center, W, where);
  s.labels = { every: lb.every, lines: lb.lines };
  // 12px more stand between the legend and the column labels than between the labels and the grid, so a reader takes the
  // legend's numbers and the labels for two things, also when both are numbers.
  for (const it of lb.items) s.notes.push({ x: it.cx, y: top + 28 + it.line * 16, s: it.s, cls: "val", anchor: "middle" });
  const bandTop = top + 12 + 16 * lb.lines + 8;

  let y = bandTop + 8;
  const strip = phone ? (s.numbers ? 24 : 16) : 24, cellH = phone && !s.numbers ? 15 : 22;
  rows.forEach((r) => {
    if (phone) {
      for (const line of wrapName(r.name, x1 - x0, { size: 14, weight: 400 })) { s.notes.push({ x: 20, y: y + 14, s: line, cls: "row", anchor: "start" }); y += 18; }
    } else s.notes.push({ x: 20, y: y + 17, s: r.name, cls: "row", anchor: "start" });
    let svg = "";
    const texts = [];
    r.cells.forEach((c, k) => {
      const cx = x0 + k * pitch + gap / 2, cy = y + (strip - cellH) / 2;
      // A cell with no data shows the band inside a 1px muted outline, so it never looks like a filled cell.
      if (!c) svg += hollow(cx, cy, cellW, cellH);
      else {
        const made = cell(c, { x: cx, y: cy, w: cellW, h: cellH, cx: center(k) }, s.numbers);
        svg += made.svg;
        if (made.text) texts.push(made.text);
      }
    });
    s.parts.push({ id: r.name, svg, texts });
    y += strip + (phone ? 6 : 0);
  });
  if (phone) y -= 6;
  s.bands.push({ x: 8, y: bandTop, w: W - 16, h: y + 8 - bandTop });
  s.h = y + 8 + 16;
  return s;
}

/** A cell with no data, or its key in a legend: the band inside a 1px muted outline. */
const hollow = (x, y, w, h) => `<rect x="${num(x + 0.5)}" y="${num(y + 0.5)}" width="${num(w - 1)}" height="${num(h - 1)}" rx="2" class="h0"/>`;

/** What render says about how the column labels fit, for each form. */
function labelNote(scene, phone) {
  const out = [];
  for (const [sc, where] of [[scene, "on a desktop"], [phone, "on a phone"]]) {
    if (sc.labels.every > 1) out.push(`every ${ordinal(sc.labels.every)} column label ${where}`);
    else if (sc.labels.lines === 2) out.push(`column labels on two lines ${where}`);
  }
  return out;
}

/** Where a value is: in one place, "(Thursday, 11)"; in more, how many, ", in 6 cells". `found` holds { v, at } for each value. */
function cellsWith(found, value, many) {
  const at = found.filter((f) => f.v === value).map((f) => f.at);
  return at.length === 1 ? ` (${esc(at[0])})` : `, in ${at.length} ${many}`;
}

// On paper a grid in words takes 0.875rem text, the smallest the page allows (12.8px in print, headers too), and cannot scroll.
// A grid whose estimate passes 580px is split into tables of fewer columns, each with the row names, so every cell prints.
// The sheet leaves 626px.
const PAPER = { size: 12.8, room: 580 };

/** The columns of the words in the fewest tables of equal size that each fit a sheet of paper, so 24 hours become two tables
 * of 12, not 13 and 11. One column always fits, because a label and a cell are short. `text(c)` writes a cell. */
function tablesOf(model, text) {
  const nameW = Math.max(...model.rows.map((r) => textWidth(r.name, PAPER.size, 600))) + 6;
  const colW = model.columns.map((c, k) => Math.max(valueWidth(c, PAPER.size), ...model.rows.map((r) => valueWidth(text(r.cells[k]), PAPER.size))) + 6);
  const n = colW.length;
  for (let parts = 1; parts < n; parts++) {
    const size = Math.ceil(n / parts);
    const groups = Array.from({ length: Math.ceil(n / size) }, (_, g) => Array.from({ length: Math.min(size, n - g * size) }, (_, i) => g * size + i));
    if (groups.every((ks) => ks.reduce((w, k) => w + colW[k], nameW) <= PAPER.room)) return groups;
  }
  return colW.map((_, k) => [k]);
}

/** The grid in words: one table with the same rows and columns, or several for paper. `text(c)` writes a cell, and `name`
 * names the tables for a screen reader, such as "The numbers of the heat map". */
function gridTables(model, text, name) {
  const { columns, rows } = model;
  const parts = tablesOf(model, text);
  // Each table can still be wider than a phone or the text column: its wrapper scrolls, as every wide table of the page does.
  return parts.map((ks) => {
    const head = `<tr><td></td>${ks.map((k) => `<th scope="col">${esc(columns[k])}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th>${ks.map((k) => `<td>${esc(text(r.cells[k]))}</td>`).join("")}</tr>`).join("");
    const label = parts.length === 1 ? name : `${name}, columns ${esc(columns[ks[0]])} to ${esc(columns[ks[ks.length - 1]])}`;
    return `<div class="table-wrap" role="region" aria-label="${label}" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  }).join("\n");
}

module.exports = { refuseFields, readGrid, drawGrid, hollow, labelsOf, labelNote, cellsWith, tablesOf, gridTables, esc, ordinal, MOST };
