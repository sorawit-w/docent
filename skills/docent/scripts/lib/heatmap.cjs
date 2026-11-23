// Heat maps: one number for each pair of a row and a column, such as sign-ups by weekday and hour, as a grid of cells. Each
// cell is filled with the heat step of its number, one of five grays from the least (1) to the most (5), on a scale that the
// author fixes. A legend above the grid names each step's edges and the unit; the table in words gives every number.
// The phone form keeps the grid: each row name stands on its own line above its row of cells, and the columns still line up.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrapName, WIDE, PHONE } = require("./range.cjs");
const { readScale, tickAt, valueWidth, fmt, isNum, num } = require("./scale.cjs");

const MOST = { rows: 12, columns: 24, name: 20, label: 10 };
const LEAST = { rows: 2, columns: 3 };
const HEAT = { 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] }; // the heat step of each scale step: the least and the most look the same in every heat map
const EVERY = [2, 3, 4, 6, 12]; // they divide 24 and 12, so hours and months keep their round labels
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ordinal = (n) => `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** Checks heat map data and returns the model, with the step of each value. */
function readHeatmap(data) {
  if (data.place != null && data.place !== "flow") fail(`a heat map sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a heat map has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  if (data.groups != null) fail(`a heat map has no "groups"; each row is one row of cells`);
  if (data.areas != null) fail(`a heat map has no "areas"; for the areas of a page, write a plan, and its counts in a table`);
  if (data.scale && typeof data.scale === "object" && data.scale.marks != null) fail(`the scale of a heat map has no "marks"; say a value that matters in the label or the text`);
  const scale = readScale(data.scale, { needStep: true });
  if (scale.count < 3 || scale.count > 5) fail(`the scale has ${scale.count} step${scale.count === 1 ? "" : "s"}; a heat map has 3 to 5, one for each heat step. Use a ${scale.count > 5 ? "larger" : "smaller"} "step"`);
  if (!scale.unit) fail(`the scale of a heat map needs a "unit", such as "sign-ups"; the legend names it`);
  const edges = Array.from({ length: scale.count + 1 }, (_, k) => tickAt(scale, scale.count, k));

  if (!Array.isArray(data.columns)) fail(`"columns" must be a list of ${LEAST.columns} to ${MOST.columns} labels, one for each column`);
  if (data.columns.length < LEAST.columns || data.columns.length > MOST.columns) fail(`a heat map has ${LEAST.columns} to ${MOST.columns} columns; this one has ${data.columns.length}`);
  const columns = data.columns.map((c, i) => words(c, `the label of column ${i + 1}`, MOST.label));
  columns.forEach((c, i) => { if (columns.indexOf(c) !== i) fail(`two columns have the label "${c}"`); });

  const shape = `"rows" must be a list of ${LEAST.rows} to ${MOST.rows} rows, top to bottom, each with a "name" and its "values"`;
  if (!Array.isArray(data.rows)) fail(shape);
  if (data.rows.length < LEAST.rows || data.rows.length > MOST.rows) fail(`a heat map has ${LEAST.rows} to ${MOST.rows} rows; this one has ${data.rows.length}`);
  const rows = data.rows.map((r, i) => {
    if (!r || typeof r !== "object" || Array.isArray(r)) fail(shape);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const what = `row ${i + 1} ("${name}")`;
    if (!Array.isArray(r.values)) fail(`${what} needs "values": a list with one value for each column`);
    if (r.values.length !== columns.length) fail(`${what} has ${r.values.length} value${r.values.length === 1 ? "" : "s"}, and "columns" has ${columns.length}`);
    const cells = r.values.map((v, c) => {
      if (v === null) return null;
      if (!isNum(v)) fail(`${what} has the value ${JSON.stringify(v)} in column "${columns[c]}"; a value is a number, or null for no data`);
      if (v < scale.from || v > scale.to) fail(`${what} has the value ${fmt(v)} in column "${columns[c]}"; it must be on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}`);
      // A value on an edge takes the higher step; the value "to" takes the top step.
      let step = 0;
      while (step < scale.count - 1 && v >= edges[step + 1]) step++;
      return { v, written: fmt(v), step, heat: HEAT[scale.count][step] };
    });
    return { name, cells };
  });
  rows.forEach((r, i) => { if (rows.findIndex((o) => o.name === r.name) !== i) fail(`two rows have the name "${r.name}"`); });
  if (rows.every((r) => r.cells.every((c) => c === null))) fail(`every cell has no data; a heat map needs at least one number`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "heatmap", scale, edges, columns, rows };
}

/** The legend's swatches and edge numbers, the same in both forms. They must fit a phone, the narrowest form; the unit and the
 * "no data" key can move to a second line, so only the swatches and their numbers can make a legend too wide. */
function legendOf(model) {
  const { scale, edges } = model;
  const labels = edges.map(fmt), widths = labels.map((l) => valueWidth(l));
  const sw = Math.max(32, Math.ceil(Math.max(...widths) + 8));
  const lx = Math.max(20, Math.ceil(12 + widths[0] / 2));
  const right = lx + scale.count * (sw + 2) - 2;
  const end = right + widths[scale.count] / 2;
  if (end > PHONE - 12) fail(`the legend needs ${Math.ceil(end - 12)}px on a phone, and a phone has ${PHONE - 24}px; its widest number is "${labels[widths.indexOf(Math.max(...widths))]}". Write the values in a larger unit, such as thousands`);
  return { labels, sw, lx, right };
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

/** The drawing: 640px wide with the row names in a column at the left, or 264px wide with each name above its row of cells. */
function drawHeatmap(model, phone = false) {
  const { scale, columns, rows } = model;
  const W = phone ? PHONE : WIDE, n = columns.length;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form: "heatmap", w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [], numbers: false, labels: null };

  // The legend: one swatch for each step with its edge numbers under it, then the unit and, when a cell has no data, a hollow
  // key. Each of the two stands at the right of the swatches when it fits there, or on a second line under the edge numbers.
  const lg = legendOf(model);
  let legend = "";
  for (let k = 0; k < scale.count; k++) legend += `<rect x="${num(lg.lx + k * (lg.sw + 2))}" y="12" width="${lg.sw}" height="12" rx="2" class="h${HEAT[scale.count][k]}"/>`;
  lg.labels.forEach((l, k) => s.notes.push({ x: k === scale.count ? lg.right : lg.lx + k * (lg.sw + 2) - (k ? 1 : 0), y: 38, s: l, cls: "val", anchor: "middle" }));
  const after = [{ w: textWidth(scale.unit, 12), gap: 8, unit: true }];
  if (rows.some((r) => r.cells.includes(null))) after.push({ w: 22 + textWidth("no data", 12), gap: 16 });
  let x = lg.right, line = 0, top = 42;
  for (const it of after) {
    if (line === 0 && x + it.gap + it.w > W - 12) { line = 1; x = lg.lx - it.gap; top = 64; }
    const at = x + it.gap, y = line ? 46 : 12;
    if (it.unit) s.notes.push({ x: at, y: y + 10, s: scale.unit, cls: "sub", anchor: "start" });
    else {
      legend += `<rect x="${num(at + 0.5)}" y="${num(y + 0.5)}" width="15" height="11" rx="2" class="h0"/>`;
      s.notes.push({ x: at + 22, y: y + 10, s: "no data", cls: "sub", anchor: "start" });
    }
    x = at + it.w;
  }
  s.parts.push({ id: "legend", svg: legend, texts: [] });

  // The columns share the grid's width equally. Cells are 2px apart, or 1px when they are narrower than 16px.
  const nameW = phone ? 0 : Math.max(...rows.map((r) => textWidth(r.name, 14)));
  const x0 = phone ? 20 : Math.ceil(20 + nameW + 16), x1 = W - 20;
  const pitch = (x1 - x0) / n, gap = pitch - 2 < 16 ? 1 : 2, cellW = pitch - gap;
  const center = (c) => x0 + (c + 0.5) * pitch;

  // Every number shows in its cell when every number fits (its width at 12px plus 4px on each side), or none does.
  s.numbers = rows.every((r) => r.cells.every((c) => !c || valueWidth(c.written) + 8 <= cellW));

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
      // A cell with no data shows the band inside a 1px muted outline, so it never looks like the palest step.
      if (!c) svg += `<rect x="${num(cx + 0.5)}" y="${num(cy + 0.5)}" width="${num(cellW - 1)}" height="${num(cellH - 1)}" rx="2" class="h0"/>`;
      else {
        svg += `<rect x="${num(cx)}" y="${num(cy)}" width="${num(cellW)}" height="${cellH}" rx="2" class="h${c.heat}"/>`;
        if (s.numbers) texts.push({ x: center(k), y: cy + cellH / 2 + 4, s: c.written, cls: c.heat >= 4 ? "hv hi" : "hv", anchor: "middle" });
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

/** What render says about the numbers in the cells and the column labels, for each form. */
function scaleNote(model, scene, phone) {
  const out = [];
  if (scene.numbers && phone.numbers) out.push("numbers in the cells");
  else if (scene.numbers) out.push("numbers in the cells on a desktop only");
  else if (phone.numbers) out.push("numbers in the cells on a phone only");
  for (const [sc, where] of [[scene, "on a desktop"], [phone, "on a phone"]]) {
    if (sc.labels.every > 1) out.push(`every ${ordinal(sc.labels.every)} column label ${where}`);
    else if (sc.labels.lines === 2) out.push(`column labels on two lines ${where}`);
  }
  return out.join("; ");
}

/** The cells that hold one number: "(Thursday, 11)" for one, "in 6 cells" for more. */
function cellsWith(model, value) {
  const at = model.rows.flatMap((r) => r.cells.map((c, k) => (c && c.v === value ? `${r.name}, ${model.columns[k]}` : null)).filter(Boolean));
  return at.length === 1 ? ` (${esc(at[0])})` : `, in ${at.length} cells`;
}

// On paper a grid in words takes 0.875rem text, the smallest the page allows (12.8px in print, headers too), and cannot scroll.
// A grid whose estimate passes 580px is split into tables of fewer columns, each with the row names, so every number prints.
// The sheet leaves 626px.
const PAPER = { size: 12.8, room: 580 };

/** The columns of the words in the fewest tables of equal size that each fit a sheet of paper, so 24 hours become two tables
 * of 12, not 13 and 11. One column always fits, because a label and a value are short. */
function tablesOf(model) {
  const nameW = Math.max(...model.rows.map((r) => textWidth(r.name, PAPER.size, 600))) + 6;
  const colW = model.columns.map((c, k) => Math.max(valueWidth(c, PAPER.size), ...model.rows.map((r) => valueWidth(r.cells[k] ? r.cells[k].written : "no data", PAPER.size))) + 6);
  const n = colW.length;
  for (let parts = 1; parts < n; parts++) {
    const size = Math.ceil(n / parts);
    const groups = Array.from({ length: Math.ceil(n / size) }, (_, g) => Array.from({ length: Math.min(size, n - g * size) }, (_, i) => g * size + i));
    if (groups.every((ks) => ks.reduce((w, k) => w + colW[k], nameW) <= PAPER.room)) return groups;
  }
  return colW.map((_, k) => [k]);
}

/** The numbers in words: a table with the same rows and columns, and lines on the steps, the highest, the lowest and no data. */
function wordsOf(model) {
  const { scale, columns, rows } = model;
  const parts = tablesOf(model);
  // Each table can still be wider than a phone or the text column: its wrapper scrolls, as every wide table of the page does.
  const tables = parts.map((ks) => {
    const head = `<tr><td></td>${ks.map((k) => `<th scope="col">${esc(columns[k])}</th>`).join("")}</tr>`;
    const body = rows.map((r) => `<tr><th scope="row">${esc(r.name)}</th>${ks.map((k) => `<td>${r.cells[k] ? r.cells[k].written : "no data"}</td>`).join("")}</tr>`).join("");
    const label = parts.length === 1 ? "The numbers of the heat map" : `The numbers of the heat map, columns ${esc(columns[ks[0]])} to ${esc(columns[ks[ks.length - 1]])}`;
    return `<div class="table-wrap" role="region" aria-label="${label}" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  });
  const values = rows.flatMap((r) => r.cells.filter(Boolean).map((c) => c.v));
  const hi = Math.max(...values), lo = Math.min(...values);
  const lines = [`Each cell is shaded by its number, in ${scale.count} steps of ${fmt(scale.step)} ${esc(scale.unit)} from ${fmt(scale.from)} to ${fmt(scale.to)}. A number on the edge of two steps takes the higher step.`];
  lines.push(hi === lo ? `Every number is ${fmt(hi)}.` : `The highest number is ${fmt(hi)}${cellsWith(model, hi)}. The lowest is ${fmt(lo)}${cellsWith(model, lo)}.`);
  const empty = rows.reduce((sum, r) => sum + r.cells.filter((c) => c === null).length, 0);
  if (empty) lines.push(`${empty} cell${empty === 1 ? " has" : "s have"} no data.`);
  return `${tables.join("\n")}\n<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

module.exports = { readHeatmap, drawHeatmap, wordsOf, scaleNote, MOST, HEAT };
