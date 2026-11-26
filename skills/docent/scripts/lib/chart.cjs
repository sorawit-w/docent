// The chart core: the parts that every scale chart shares, so each kind holds only what is its own. It gives the two forms'
// widths, text escaped for SVG, names that wrap (also in scripts written without spaces), counts and shares as written,
// column labels that keep apart (also along a time axis), the value axis that runs up the page, the line above a chart, labels that move apart from their points, and the table in words
// that splits for paper. The numeric scale stays in scale.cjs and the time scale in time.cjs, and
// this file passes both on, so a chart kind needs this one file for its scale, its ticks and the places of its labels.
const { fail } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrap } = require("./graph.cjs");
const { readScale, makeScale, tickAt, drawHead, drawGrid, linesIn, placeLabel, valueWidth, fmt, isNum, num, diff } = require("./scale.cjs");
const { readTimeScale, readTime, makeTimeScale, endLabels } = require("./time.cjs");

const WIDE = 640; // the desktop and paper form: it fits an A4 figure well (about 641.6px) with no shrink
const PHONE = 264; // the phone form: it fits a 320px screen

/** Text escaped for SVG and HTML, in an element or in an attribute. */
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

/** A count as written: a comma every three digits, and every digit. */
const comma = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * part ÷ whole as a whole percent, a half rounded up, in whole-number arithmetic so no rounding error moves a half. A share
 * above 0 that would round to 0%, or below 100 that would round to 100%, keeps one decimal, so a small share stays honest.
 */
function share(part, whole) {
  if (part === 0) return "0%";
  if (part === whole) return "100%";
  const whole100 = Math.floor((part * 200 + whole) / (2 * whole));
  if (whole100 > 0 && whole100 < 100) return `${whole100}%`;
  if (whole100 === 0 && part * 1000 < whole) return "under 0.1%";
  if (whole100 === 100 && part * 1000 > whole * 999) return "over 99.9%";
  return `${Math.floor((part * 2000 + whole) / (2 * whole)) / 10}%`;
}

const EVERY = [2, 3, 4, 6, 12]; // they divide 24 and 12, so hours and months keep their round labels

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

/**
 * The labels along a row of columns, each centred on center(i) and kept 12px inside the drawing W px wide (or between lo and
 * hi): every label on one line, then on two lines, then every 2nd to 12th label, never fewer than `least`. A grid keeps three;
 * a time axis may keep two, because the reader knows that the times between them are there. Returns { items, lines, every },
 * where each item is { s, w, cx, x0, line }; it refuses labels that do not fit, naming `where`.
 */
function labelsOf(labels, center, W, where, { least = 3, lo = 12, hi = W - 12 } = {}) {
  const all = labels.map((s, i) => {
    const w = valueWidth(s), cx = Math.min(Math.max(center(i), lo + w / 2), hi - w / 2);
    return { s, w, cx, x0: cx - w / 2, line: 0 };
  });
  if (onLines(all, 1)) return { items: all, lines: 1, every: 1 };
  if (onLines(all, 2)) return { items: all, lines: 2, every: 1 };
  for (const every of EVERY) {
    const kept = all.filter((_, i) => i % every === 0);
    if (kept.length < least) break;
    if (onLines(kept, 1)) return { items: kept, lines: 1, every };
  }
  const widest = all.reduce((a, b) => (b.w > a.w ? b : a));
  fail(`the column labels do not fit ${where}, even on two lines or with every 12th label; the widest is "${widest.s}", ${Math.ceil(widest.w)}px. Shorten the labels to about 7 characters, or use fewer columns`);
}

/**
 * The value axis that runs up the page: the scale laid from y0 at the bottom ("from") up to y1 at the top ("to"), with the
 * ticks whose labels stand at least 24px apart, since a label is 12px tall: every tick, then every 2nd, 5th, 10th or 20th.
 * Returns { per, y(v), ticks }, each tick { v, y, label }. A scale with no step has no ticks.
 */
function upAxis(scale, y0, y1) {
  const per = (y0 - y1) / (scale.to - scale.from);
  const y = (v) => y0 - (v - scale.from) * per;
  const ticks = [];
  if (scale.count) {
    // The last spacing keeps the first and the last tick, which stand the whole height apart.
    const keep = [...[1, 2, 5, 10, 20].filter((n) => n < scale.count), scale.count].find((n) => n * scale.step * per >= 24) || scale.count;
    for (let k = 0; k <= scale.count; k += keep) {
      const v = tickAt(scale, scale.count, k);
      ticks.push({ v, y: y(k === 0 || k === scale.count ? v : scale.from + k * scale.step), label: fmt(v) });
    }
  }
  return { per, y, ticks };
}

/** The line above a chart: what the numbers count and how to read them. Each sentence starts a line and wraps at its spaces,
 * in 12px muted text from x 20. Returns the y under it, where the chart starts. */
function headLines(s, sentences, W) {
  const lines = sentences.flatMap((t) => wrapName(t, W - 40, { size: 12, weight: 400, every: false }));
  lines.forEach((line, i) => s.notes.push({ x: 20, y: 24 + i * 16, s: line, cls: "sub", anchor: "start" }));
  return 24 + (lines.length - 1) * 16 + 12;
}

/**
 * A label moves; a point never moves. Labels on one axis, each wanting to stand centred on its point (`at`) and `size` px
 * long, are moved apart until each two keep `gap` px between them, and kept between lo and hi. Labels that would meet move
 * as one group, centred where its labels want to be, so each moves as little as it can. Returns the centres in the order of
 * the items, or null when the labels do not fit between lo and hi. The chart draws a thin line from a moved label to its point.
 */
function apart(items, lo, hi, gap) {
  if (items.reduce((t, it) => t + it.size + gap, -gap) > hi - lo) return null;
  const groups = [];
  for (const i of items.map((_, k) => k).sort((a, b) => items[a].at - items[b].at)) {
    // want: where each label of the group wants the group to start
    let g = { ids: [i], size: items[i].size, want: [items[i].at - items[i].size / 2] };
    for (;;) {
      g.start = Math.min(Math.max(g.want.reduce((t, w) => t + w, 0) / g.want.length, lo), hi - g.size);
      const before = groups[groups.length - 1];
      if (!before || before.start + before.size + gap <= g.start) break;
      groups.pop();
      const shift = before.size + gap;
      g = { ids: [...before.ids, ...g.ids], size: shift + g.size, want: [...before.want, ...g.want.map((w) => w - shift)] };
    }
    groups.push(g);
  }
  const out = [];
  for (const g of groups) g.ids.reduce((x, i) => { out[i] = x + items[i].size / 2; return x + items[i].size + gap; }, g.start);
  return out;
}

// On paper a grid in words takes 0.875rem text, the smallest the page allows (12.8px in print, headers too), and cannot scroll.
// A grid whose estimate passes 580px is split into tables of fewer columns, each with the row names, so every cell prints.
// The sheet leaves 626px.
const PAPER = { size: 12.8, room: 580 };

/** The columns of the words in the fewest tables of equal size that each fit a sheet of paper, so 24 hours become two tables
 * of 12, not 13 and 11. One column always fits, because a label and a cell are short. The model has `columns` and `rows`,
 * each row with a `name` and its `cells`; `text(c)` writes a cell. */
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

module.exports = {
  WIDE, PHONE, esc, graphemes, NO_SPACES, wrapName, comma, share, EVERY, onLines, labelsOf, upAxis, headLines, apart, PAPER, tablesOf, gridTables,
  // The numeric scale, from scale.cjs.
  readScale, makeScale, tickAt, drawHead, drawGrid, linesIn, placeLabel, valueWidth, fmt, isNum, num, diff,
  // The time scale, from time.cjs.
  readTimeScale, readTime, makeTimeScale, endLabels,
};
