// Status grids: the state of each pair of a row and a column, such as the uptime of each part of a service on each day. Each
// cell is OK, Warning or Error, from the author's thresholds or written directly. On screen every cell is filled in its status
// color; on paper only the failures stand out (OK and Warning cells take the outline color). A Warning cell has a slash and an
// Error cell a cross, so the states never rest on color alone. The grid, the forms and the table in words are the heat map's
// (grid.cjs). The rules come from docs/proposals/status-grids.md.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { esc, wrapName, gridTables, fmt, isNum, num } = require("./chart.cjs");
const { refuseFields, readGrid, drawGrid, hollow, labelNote, cellsWith } = require("./grid.cjs");

const STATES = ["ok", "warn", "err"];
const NAMES = { ok: "OK", warn: "Warning", err: "Error" };
const MOST = { name: 12, unit: 12, listed: 6 };
const KEY = { w: 16, h: 12, gap: 6, apart: 16, line: 16 }; // a key's cell, the space before its words, between keys, between lines of words

/** Checks "thresholds": which way is better, the edge of OK, the optional edge of Warning, and the unit. */
function readThresholds(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || raw.better == null || raw.ok == null || raw.unit == null) fail(`"thresholds" must have "better", "ok" and "unit", and may have "warn"`);
  if (raw.better !== "higher" && raw.better !== "lower") fail(`"better" must be "higher" or "lower"`);
  for (const k of ["ok", "warn"]) if (raw[k] != null && !isNum(raw[k])) fail(`"${k}" in "thresholds" must be a number`);
  const unit = words(raw.unit, "the unit of the thresholds", MOST.unit);
  const { better, ok } = raw, warn = raw.warn ?? null;
  if (warn !== null) {
    if (warn === ok) fail(`"ok" and "warn" are both ${fmt(ok)}; for two states, leave out "warn"`);
    // The direction is written, not read from the order, so a swap is refused instead of turning every good day red.
    const other = better === "higher" ? "lower" : "higher";
    if (better === "higher" ? ok < warn : ok > warn) fail(`with "better": "${better}", "ok" must be ${better === "higher" ? "above" : "below"} "warn"; here "ok" is ${fmt(ok)} and "warn" is ${fmt(warn)}. Swap them, or write "better": "${other}"`);
  }
  return { better, ok, warn, unit };
}

/** Checks "names", the author's words for the states, and returns the words for all three. */
function readNames(raw) {
  if (raw == null) return { ...NAMES };
  if (typeof raw !== "object" || Array.isArray(raw)) fail(`"names" must give the words for the states, such as {"ok": "Up", "warn": "Degraded", "err": "Down"}`);
  for (const k of Object.keys(raw)) if (!STATES.includes(k)) fail(`"names" may name "ok", "warn" and "err"; "${k}" is not a state`);
  const names = Object.fromEntries(STATES.map((k) => [k, raw[k] == null ? NAMES[k] : words(raw[k], `the name of the state "${k}"`, MOST.name)]));
  STATES.forEach((k, i) => { if (STATES.findIndex((o) => names[o] === names[k]) !== i) fail(`two states have the name "${names[k]}"`); });
  return names;
}

/** The state of a number: a value exactly on a threshold takes the better state. */
function stateOf(v, { better, ok, warn }) {
  const meets = (edge) => (better === "higher" ? v >= edge : v <= edge);
  return meets(ok) ? "ok" : warn !== null && meets(warn) ? "warn" : "err";
}

/** Checks status grid data and returns the model, with the state of each cell. */
function readStatusgrid(data) {
  refuseFields(data, "a status grid", "for the areas of a page, write a plan, and its states in a table");
  if (data.scale != null) fail(`a status grid has no "scale"; write "thresholds" with "better", "ok" and "unit", or write each state as "ok", "warn" or "err"`);
  if (data.calendar != null && typeof data.calendar !== "boolean") fail(`"calendar" must be true or false`);
  const thresholds = data.thresholds == null ? null : readThresholds(data.thresholds);
  const names = readNames(data.names);
  // One grid gives its states one way: all measured with thresholds, or all written directly.
  const { columns, rows } = readGrid(data, {
    what: "a status grid", least: 1, need: "state",
    cell: (v, row, column) => {
      const at = `${row} has the value ${JSON.stringify(v)} in column "${column}"`;
      if (thresholds) {
        if (!isNum(v)) fail(`${at}; with "thresholds" a value is a number, or null for no data`);
        return { state: stateOf(v, thresholds), v, written: fmt(v) };
      }
      if (isNum(v)) fail(`${at}; without "thresholds" a value is "ok", "warn" or "err", or null for no data`);
      if (!STATES.includes(v)) fail(`${at}; a state is "ok", "warn" or "err", or null for no data`);
      return { state: v, v: null, written: null };
    },
  });
  const calendar = data.calendar === true;
  if (calendar && rows.length !== 7) fail(`a calendar has 7 rows, one for each day of the week; this one has ${rows.length}`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "statusgrid", thresholds, names, calendar, columns, rows };
}

/** A value with its unit: "99.9%", or "250 ms" with a space before any other unit. */
const withUnit = (v, unit) => `${fmt(v)}${unit === "%" ? "" : " "}${unit}`;

/** The states that the legend shows, each with its words: with thresholds, the 2 or 3 states they define and their ranges; with
 * states written directly, OK and Error, and Warning when a cell has it. */
function keysOf(model) {
  const { thresholds: t, names } = model;
  if (!t) {
    const seen = new Set(model.rows.flatMap((r) => r.cells.filter(Boolean).map((c) => c.state)));
    return STATES.filter((k) => k !== "warn" || seen.has("warn")).map((k) => ({ state: k, s: names[k] }));
  }
  const u = (v) => withUnit(v, t.unit), worse = t.warn ?? t.ok;
  const range = t.better === "higher"
    ? { ok: `${u(t.ok)} or more`, warn: `${u(t.warn)} to below ${u(t.ok)}`, err: `below ${u(worse)}` }
    : { ok: `${u(t.ok)} or less`, warn: `above ${u(t.ok)} to ${u(t.warn)}`, err: `above ${u(worse)}` };
  return STATES.filter((k) => k !== "warn" || t.warn !== null).map((k) => ({ state: k, s: `${names[k]}: ${range[k]}` }));
}

/** The mark of a state in a box: no mark for OK, a slash for Warning, and a cross (the slash and one more stroke) for Error.
 * The strokes stand in a square 3px smaller than the box, and at most 10px, in its middle. */
function markOf(state, { x, y, w, h }) {
  if (state === "ok") return "";
  const m = Math.min(Math.min(w, h) - 3, 10) / 2, cx = x + w / 2, cy = y + h / 2;
  const slash = `M${num(cx - m)},${num(cy + m)} L${num(cx + m)},${num(cy - m)}`;
  return `<path d="${state === "err" ? `${slash} M${num(cx - m)},${num(cy - m)} L${num(cx + m)},${num(cy + m)}` : slash}" class="sm sm-${state}"/>`;
}

/** A cell with a state: filled with its state's class, and its mark. */
const cellOf = (state, b) => `<rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}" rx="2" class="s-${state}"/>${markOf(state, b)}`;

/**
 * The legend, at the top of a drawing W px wide: one key for each state, a small cell drawn as a cell of that state with its mark,
 * then its words; and a hollow key "No data" when a cell has no data. Keys flow into lines from the left; a key wider than a
 * whole line wraps its words at their spaces. So a legend is never refused. Returns the y under it: 28 for one line. A heat
 * map's legend returns 42, because its edge numbers stand under the swatches; a key has its words beside it, so the column
 * labels stand closer, still further from the legend than from the grid.
 */
function drawKeys(model, s, W) {
  const keys = keysOf(model);
  if (model.rows.some((r) => r.cells.includes(null))) keys.push({ state: null, s: "No data" });
  const left = 20, right = W - 12, room = right - left - KEY.w - KEY.gap;
  let x = left, y = 12, height = KEY.h, svg = "";
  for (const k of keys) {
    const lines = textWidth(k.s, 12) <= room ? [k.s] : wrapName(k.s, room, { size: 12, weight: 400 });
    const w = KEY.w + KEY.gap + Math.max(...lines.map((l) => textWidth(l, 12)));
    if (x > left && x + w > right) { x = left; y += height + 8; height = KEY.h; }
    const box = { x, y, w: KEY.w, h: KEY.h };
    svg += k.state ? cellOf(k.state, box) : hollow(x, y, KEY.w, KEY.h);
    lines.forEach((l, i) => s.notes.push({ x: x + KEY.w + KEY.gap, y: y + 10 + i * KEY.line, s: l, cls: "sub", anchor: "start" }));
    height = Math.max(height, KEY.h + (lines.length - 1) * KEY.line);
    x += w + KEY.apart;
  }
  s.parts.push({ id: "legend", svg, texts: [] });
  return y + height + 4;
}

/** The drawing: the grid of grid.cjs, with the legend of the states, each cell filled with its state and its mark, and no numbers. */
function drawStatusgrid(model, phone = false) {
  return drawGrid(model, phone, { form: "statusgrid", legend: (s, W) => drawKeys(model, s, W), cell: (c, b) => ({ svg: cellOf(c.state, b), text: null }) });
}

/** What render says: how the column labels fit, for each form. */
const scaleNote = (model, scene, phone) => labelNote(scene, phone).join("; ");

/** The name of a cell by its row and its column; in a calendar the column is the week that starts on its label. */
const cellName = (model, r, k) => `${r.name}, ${model.calendar ? "week of " : ""}${model.columns[k]}`;

/** How many cells take each state: "64 cells are OK, 3 are Warning and 2 are Error." Only the states that some cell takes. */
function counted(model, cells) {
  const parts = STATES.map((k) => [cells.filter((c) => c.state === k).length, model.names[k]]).filter(([n]) => n).map(([n, name], i) => `${n} ${i ? (n === 1 ? "is" : "are") : n === 1 ? "cell is" : "cells are"} ${esc(name)}`);
  return `${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0]}.`;
}

/** The states in words: a table with the same rows and columns, then the lines on the thresholds, the counts, the Error cells
 * and the worst value. */
function wordsOf(model) {
  const { thresholds: t, names, rows } = model;
  // A number in an OK cell stands alone, as an OK cell has no mark in the drawing; the first line says so.
  const text = (c) => (!c ? "no data" : !t ? names[c.state] : c.state === "ok" ? c.written : `${c.written} ${names[c.state]}`);
  const tables = gridTables(model, text, "The states of the status grid");
  // Column by column, so the cells come in time order when the columns are times, as they usually are.
  const found = model.columns.flatMap((_, k) => rows.map((r) => r.cells[k] && { ...r.cells[k], at: cellName(model, r, k) }).filter(Boolean));
  const empty = rows.reduce((sum, r) => sum + r.cells.filter((c) => c === null).length, 0);
  const lines = [];
  if (model.calendar) lines.push("Each row is a day of the week, and each column is a week, named by its first day.");
  if (t) {
    const [ok, warn, err] = STATES.map((k) => esc(names[k])), w = t.warn ?? t.ok;
    const states = t.better === "higher"
      ? [`${ok} at ${fmt(t.ok)} or more`, t.warn !== null && `${warn} from ${fmt(t.warn)} to below ${fmt(t.ok)}`, `${err} below ${fmt(w)}`]
      : [`${ok} at ${fmt(t.ok)} or less`, t.warn !== null && `${warn} from above ${fmt(t.ok)} to ${fmt(t.warn)}`, `${err} above ${fmt(w)}`];
    const said = states.filter(Boolean);
    lines.push(`Each number is in ${esc(t.unit)}. A cell is ${said.slice(0, -1).join(", ")}, and ${said[said.length - 1]}; a value on a threshold takes the better state. A cell with no state word is ${ok}.`);
  }
  lines.push(`${counted(model, found)}${empty ? ` ${empty} ${empty === 1 ? "cell has" : "cells have"} no data.` : ""}`);
  const errs = found.filter((c) => c.state === "err"), err = esc(names.err);
  if (!errs.length) lines.push(`No cell is ${err}.`);
  else if (errs.length > MOST.listed) lines.push(`${err} in ${errs.length} cells; the table shows each.`);
  else lines.push(`${err}: ${errs.map((c) => `${esc(c.at)}${t ? ` (${c.written})` : ""}`).join("; ")}.`);
  if (t) {
    const values = found.map((c) => c.v), worst = t.better === "higher" ? Math.min(...values) : Math.max(...values);
    lines.push(`The worst is ${fmt(worst)}${cellsWith(found, worst, "cells")}.`);
  }
  return `${tables}\n<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

module.exports = { readStatusgrid, drawStatusgrid, wordsOf, scaleNote, stateOf, STATES };
