// Heat maps: one number for each pair of a row and a column, such as sign-ups by weekday and hour, as a grid of cells. Each
// cell is filled with the heat step of its number, one of five grays from the least (1) to the most (5), on a scale that the
// author fixes. A legend above the grid names each step's edges and the unit; the table in words gives every number.
// The phone form keeps the grid: each row name stands on its own line above its row of cells, and the columns still line up.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { PHONE, esc, gridTables, readScale, tickAt, valueWidth, fmt, isNum, num } = require("./chart.cjs");
const { refuseFields, readGrid, drawGrid, labelNote, cellsWith, MOST } = require("./grid.cjs");

const LEAST = { rows: 2 };
const HEAT = { 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] }; // the heat step of each scale step: the least and the most look the same in every heat map

/** Checks the scale of a heat map or a heat plan (3 to 5 steps, a unit, no marks) and returns it with the edges of its steps. */
function readHeatScale(raw, what = "a heat map", example = "sign-ups") {
  if (raw && typeof raw === "object" && raw.marks != null) fail(`the scale of ${what} has no "marks"; say a value that matters in the label or the text`);
  const scale = readScale(raw, { needStep: true });
  if (scale.count < 3 || scale.count > 5) fail(`the scale has ${scale.count} step${scale.count === 1 ? "" : "s"}; ${what} has 3 to 5, one for each heat step. Use a ${scale.count > 5 ? "larger" : "smaller"} "step"`);
  if (!scale.unit) fail(`the scale of ${what} needs a "unit", such as "${example}"; the legend names it`);
  return { scale, edges: Array.from({ length: scale.count + 1 }, (_, k) => tickAt(scale, scale.count, k)) };
}

/** A value on the scale with its step: a value on an edge takes the higher step, and the value "to" takes the top step. */
function stepOf(v, scale, edges) {
  let step = 0;
  while (step < scale.count - 1 && v >= edges[step + 1]) step++;
  return { v, written: fmt(v), step, heat: HEAT[scale.count][step] };
}

/** Checks heat map data and returns the model, with the step of each value. */
function readHeatmap(data) {
  refuseFields(data, "a heat map", 'for the areas of a page, write a heat plan, "kind": "heatplan"');
  const { scale, edges } = readHeatScale(data.scale);
  const { columns, rows } = readGrid(data, {
    what: "a heat map", least: LEAST.rows, need: "number",
    cell: (v, row, column) => {
      if (!isNum(v)) fail(`${row} has the value ${JSON.stringify(v)} in column "${column}"; a value is a number, or null for no data`);
      if (v < scale.from || v > scale.to) fail(`${row} has the value ${fmt(v)} in column "${column}"; it must be on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}`);
      return stepOf(v, scale, edges);
    },
  });
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "heatmap", scale, edges, columns, rows };
}

/** The legend's swatches and edge numbers, the same in both forms. They must fit a phone, the narrowest form; the unit and the
 * "no data" key can move to a second line, so only the swatches and their numbers can make a legend too wide. */
function legendOf(model, left = 20) {
  const { scale, edges } = model;
  const labels = edges.map(fmt), widths = labels.map((l) => valueWidth(l));
  const sw = Math.max(32, Math.ceil(Math.max(...widths) + 8));
  const lx = Math.max(left, Math.ceil(12 + widths[0] / 2));
  const right = lx + scale.count * (sw + 2) - 2;
  const end = right + widths[scale.count] / 2;
  if (end > PHONE - 12) fail(`the legend needs ${Math.ceil(end - 12)}px on a phone, and a phone has ${PHONE - 24}px; its widest number is "${labels[widths.indexOf(Math.max(...widths))]}". Write the values in a larger unit, such as thousands`);
  return { labels, sw, lx, right };
}

/**
 * The legend, at the top of a drawing W px wide: one swatch for each step with its edge numbers under it, then the unit and,
 * when `noData`, a hollow key. Each of the two stands at the right of the swatches when it fits there, or on a second line under
 * the edge numbers. Its swatches start at `left`, or further right when the first edge number needs it. It adds its notes and its
 * part to the scene, and returns the y under it: 42, or 64 with a second line.
 */
function drawLegend(model, s, W, noData, left = 20) {
  const { scale } = model;
  const lg = legendOf(model, left);
  let legend = "";
  for (let k = 0; k < scale.count; k++) legend += `<rect x="${num(lg.lx + k * (lg.sw + 2))}" y="12" width="${lg.sw}" height="12" rx="2" class="h${HEAT[scale.count][k]}"/>`;
  lg.labels.forEach((l, k) => s.notes.push({ x: k === scale.count ? lg.right : lg.lx + k * (lg.sw + 2) - (k ? 1 : 0), y: 38, s: l, cls: "val", anchor: "middle" }));
  const after = [{ w: textWidth(scale.unit, 12), gap: 8, unit: true }];
  if (noData) after.push({ w: 22 + textWidth("no data", 12), gap: 16 });
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
  return top;
}

/** The drawing: the grid of grid.cjs, with the legend of the steps, each cell in its heat step, and its number in it when
 * every number fits (its width at 12px plus 4px on each side). */
function drawHeatmap(model, phone = false) {
  return drawGrid(model, phone, {
    form: "heatmap",
    legend: (s, W) => drawLegend(model, s, W, model.rows.some((r) => r.cells.includes(null))),
    fits: (c, w) => valueWidth(c.written) + 8 <= w,
    cell: (c, b, numbers) => ({
      svg: `<rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${b.h}" rx="2" class="h${c.heat}"/>`,
      text: numbers ? { x: b.cx, y: b.y + b.h / 2 + 4, s: c.written, cls: c.heat >= 4 ? "hv hi" : "hv", anchor: "middle" } : null,
    }),
  });
}

/** What render says about the numbers in the cells and the column labels, for each form. */
function scaleNote(model, scene, phone) {
  const out = [];
  if (scene.numbers && phone.numbers) out.push("numbers in the cells");
  else if (scene.numbers) out.push("numbers in the cells on a desktop only");
  else if (phone.numbers) out.push("numbers in the cells on a phone only");
  out.push(...labelNote(scene, phone));
  return out.join("; ");
}

/**
 * The lines under a table in words: the steps, the highest and the lowest number, and how many have no data. `found` holds each
 * number with where it is ({ v, at }); a number in one place says where, "(Thursday, 11)", and in more, how many, "in 6 cells".
 */
function heatLines(scale, found, empty, [one, many]) {
  const where = (value) => cellsWith(found, value, many);
  const values = found.map((f) => f.v), hi = Math.max(...values), lo = Math.min(...values);
  const lines = [`Each ${one} is shaded by its number, in ${scale.count} steps of ${fmt(scale.step)} ${esc(scale.unit)} from ${fmt(scale.from)} to ${fmt(scale.to)}. A number on the edge of two steps takes the higher step.`];
  lines.push(hi === lo ? `Every number is ${fmt(hi)}.` : `The highest number is ${fmt(hi)}${where(hi)}. The lowest is ${fmt(lo)}${where(lo)}.`);
  if (empty) lines.push(`${empty} ${empty === 1 ? `${one} has` : `${many} have`} no data.`);
  return `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

/** The numbers in words: a table with the same rows and columns, and lines on the steps, the highest, the lowest and no data. */
function wordsOf(model) {
  const { scale, columns, rows } = model;
  const tables = gridTables(model, (c) => (c ? c.written : "no data"), "The numbers of the heat map");
  const found = rows.flatMap((r) => r.cells.map((c, k) => c && { v: c.v, at: `${r.name}, ${columns[k]}` }).filter(Boolean));
  const empty = rows.reduce((sum, r) => sum + r.cells.filter((c) => c === null).length, 0);
  return `${tables}\n${heatLines(scale, found, empty, ["cell", "cells"])}`;
}

module.exports = { readHeatmap, drawHeatmap, wordsOf, scaleNote, readHeatScale, stepOf, drawLegend, heatLines, MOST, HEAT };
