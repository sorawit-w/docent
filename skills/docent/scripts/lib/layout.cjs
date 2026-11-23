// Layouts to scale: where each part sits along one measured width (a screen, a page, a time slot), one row each.
// A row holds boxes on one or two tracks; a measured row also writes the length of every stretch between box edges.
// Nothing moves. It is drawn twice with text at its real size: 640px wide for a desktop and for paper, and 264px wide
// for a phone, where each row name stands on a line above its boxes. Its boxes are also written as a table, in words.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const { wrapName } = require("./range.cjs");
const { readScale, makeScale, drawHead, drawGrid, linesIn, valueWidth, fmt, isNum, num, diff } = require("./scale.cjs");

const MOST = { rows: 6, boxes: 6, name: 16, note: 24 };
const WIDE = 640, PHONE = 264; // as for a range chart: a desktop and A4 paper, and a 320px screen
const BOX = 24; // the height of a box
const LINE = 18; // the height of one line of names above a track
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Checks layout data and returns the model. */
function readLayout(data) {
  if (data.place != null && data.place !== "flow") fail(`a layout to scale sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a layout to scale has no "form"; the renderer draws it ${WIDE}px wide, and ${PHONE}px wide on a phone`);
  const scale = readScale(data.scale, { needStep: false });
  if (!Array.isArray(data.rows)) fail(`"rows" must be a list`);
  if (data.rows.length < 1 || data.rows.length > MOST.rows) fail(`a layout to scale has 1 to ${MOST.rows} rows; this one has ${data.rows.length}`);
  const rows = data.rows.map((r, i) => {
    if (!r || typeof r !== "object") fail(`row ${i + 1} must be an object with a "name" and "boxes"`);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const what = `row ${i + 1} ("${name}")`;
    const note = words(r.note, `the note of ${what}`, MOST.note, false);
    if (r.measure != null && r.measure !== true) fail(`"measure" in ${what} must be true, or left out`);
    if (!Array.isArray(r.boxes)) fail(`${what} needs "boxes", a list`);
    if (r.boxes.length < 1 || r.boxes.length > MOST.boxes) fail(`${what} has ${r.boxes.length} boxes; a row has 1 to ${MOST.boxes}`);
    const boxes = r.boxes.map((b, j) => {
      if (!b || typeof b !== "object") fail(`box ${j + 1} of ${what} must be an object with a "name", "from" and "to"`);
      const bname = words(b.name, `the name of box ${j + 1} of ${what}`, MOST.name);
      const bwhat = `the box "${bname}" of ${what}`;
      for (const k of ["from", "to"]) if (!isNum(b[k]) || b[k] < scale.from || b[k] > scale.to) fail(`${bwhat} has "${k}": ${JSON.stringify(b[k])}; it must be a number on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}`);
      if (!(b.to > b.from)) fail(`${bwhat} ends before it starts: "to" must be more than "from"`);
      if (b.track != null && b.track !== 1 && b.track !== 2) fail(`${bwhat} has "track": ${JSON.stringify(b.track)}; it must be 1 or 2`);
      return { name: bname, from: b.from, to: b.to, track: b.track || 1 };
    });
    const tracks = [1, 2].map((t) => boxes.filter((b) => b.track === t).sort((a, b) => a.from - b.from)).filter((t) => t.length);
    if (tracks.length && tracks[0][0].track === 2) fail(`${what} has boxes on track 2 only; put its first boxes on track 1`);
    for (const t of tracks) for (let k = 1; k < t.length; k++) if (t[k].from < t[k - 1].to) fail(`the boxes "${t[k - 1].name}" and "${t[k].name}" of ${what} overlap on track ${t[k].track}; boxes on one track may touch, but not overlap`);
    return { name, note, measure: r.measure === true, boxes, tracks };
  });
  if (!scale.count && !rows.some((r) => r.measure)) fail(`the scale has no "step", so the drawing has no ticks; give it a "step", or give a row "measure": true, so the drawing has numbers`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "layout", scale, rows };
}

/** The stretches of a measured row: from the start of the scale to its end, between every edge of a box on track 1. */
function stretchesOf(row, scale) {
  const edges = [...new Set([scale.from, scale.to, ...row.tracks[0].flatMap((b) => [b.from, b.to])])].sort((a, b) => a - b);
  return edges.slice(1).map((to, k) => ({ from: edges[k], to, label: fmt(diff(edges[k], to)) }));
}

/**
 * Puts labels on lines, left to right: each label goes on the first line where it stays `gap` clear of the label before
 * it. Two lines at most; a third is refused with the message that `third` writes for the two labels that meet.
 */
function onLines(items, gap, third) {
  const ends = [], last = [];
  for (const it of [...items].sort((a, b) => a.x - b.x)) {
    let k = ends.findIndex((end) => it.x >= end + gap);
    if (k < 0) {
      if (ends.length === 2) fail(third(last[ends.length - 1], it));
      k = ends.length;
    }
    it.line = k;
    ends[k] = it.x + it.w;
    last[k] = it;
  }
  return ends.length;
}

/** The drawing: 640px wide with the row names in a column at the left, or 264px wide with each name above its boxes. */
function drawLayout(model, phone = false) {
  const { scale, rows } = model;
  const W = phone ? PHONE : WIDE, hi = W - 12;
  const where = phone ? "on a phone" : "on a desktop and on paper";
  const s = { form: "layout", w: W, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  const ticks = scale.count > 0;
  const firstHalf = ticks ? valueWidth(fmt(scale.from)) / 2 : 0;
  const lastHalf = ticks ? valueWidth(fmt(scale.to)) / 2 : 0;
  let x0, x1;
  if (phone) [x0, x1] = [Math.ceil(Math.max(20, 12 + firstHalf)), Math.floor(Math.min(W - 20, W - 12 - lastHalf))];
  else {
    const nameW = Math.max(...rows.map((r) => Math.max(textWidth(r.name, 14, 600), r.note ? textWidth(r.note, 12) : 0)));
    // The unit stands left of the first tick label, or left of the measures when there are no ticks.
    const unitW = scale.unit ? textWidth(scale.unit, 12) : 0;
    const unitRoom = !scale.unit ? 0 : ticks ? 12 + unitW + 10 + firstHalf : 20 + unitW + 10;
    [x0, x1] = [Math.ceil(Math.max(20 + nameW + 24, unitRoom, 12 + firstHalf)), Math.floor(Math.min(W - 20, W - 12 - lastHalf))];
  }
  const sc = makeScale(scale, x0, x1, { lo: 12, hi });
  let y = drawHead(s, scale, sc, { W, x0, phone, where });
  if (!ticks && !scale.marks.length) y = 8;

  const spans = [];
  for (const row of rows) {
    const top = y;
    let yy = top + 8;
    // The name and the note: a column at the left on a desktop, a line above the boxes on a phone. On a phone a measured
    // row says its unit there, because the measures have no room at their left.
    const note = phone && row.measure && scale.unit ? (row.note ? `${row.note}, in ${scale.unit}` : `in ${scale.unit}`) : row.note;
    if (phone) {
      const lines = wrapName(row.name, W - 40);
      lines.forEach((line, i) => s.notes.push({ x: 20, y: yy + 16 + i * LINE, s: line, cls: "name", anchor: "start" }));
      const base = yy + 16 + (lines.length - 1) * LINE; // the baseline of the name's last line
      yy += 8 + lines.length * LINE;
      if (note) {
        const after = 20 + textWidth(lines[lines.length - 1], 14, 600) + 8;
        if (after + textWidth(note, 12) <= W - 20) s.notes.push({ x: after, y: base, s: note, cls: "sub", anchor: "start" });
        else for (const line of wrapName(note, W - 40)) { s.notes.push({ x: 20, y: yy + 14, s: line, cls: "sub", anchor: "start" }); yy += LINE; }
      }
    } else {
      s.notes.push({ x: 20, y: yy + 16, s: row.name, cls: "name", anchor: "start" });
      if (note) s.notes.push({ x: 20, y: yy + 34, s: note, cls: "sub", anchor: "start" });
    }
    const spanTop = yy;
    for (const track of row.tracks) {
      const boxes = track.map((b) => {
        const a = sc.x(b.from), z = sc.x(b.to);
        if (z - a < 4) fail(`the box "${b.name}" of the row "${row.name}" is ${num(z - a)}px wide ${where}; widen it, or narrow the scale`);
        const w = textWidth(b.name, 14);
        return { ...b, a, z, w, inside: w + 16 <= z - a };
      });
      // A name that does not fit in its box stands above it, from its left edge, and moves left only at the right edge.
      const above = boxes.filter((b) => !b.inside).map((b) => ({ box: b, x: Math.min(b.a, hi - b.w), w: b.w }));
      const lines = onLines(above, 12, (p, q) => `the names above the boxes "${p.box.name}" and "${q.box.name}" of the row "${row.name}" need a third line ${where}; shorten a name, or move a box to track 2`);
      // The tick of a name on the upper line runs down past the lower line, so no name there may stand across it.
      for (const n of above) for (const m of above) if (m.line > n.line && n.box.a >= m.x - 4 && n.box.a <= m.x + m.w + 4) fail(`the tick of the name "${n.box.name}" would cross the name "${m.box.name}" above the boxes of the row "${row.name}" ${where}; shorten a name, or move a box to track 2`);
      const boxTop = yy + (lines ? lines * LINE + 6 : 0);
      for (const n of above) {
        const by = boxTop - 9 - (lines - 1 - n.line) * LINE;
        s.notes.push({ x: n.x, y: by, s: n.box.name, cls: "row", anchor: "start", knock: { x: n.x - 4, y: by - 12, w: n.w + 8, h: 16 } });
        n.box.tick = `<path d="M${num(n.box.a + 0.5)},${num(by + 3)} V${num(boxTop)}" class="tick"/>`;
      }
      for (const b of boxes) {
        s.parts.push({
          id: b.name,
          svg: `${b.tick || ""}<rect x="${num(b.a)}" y="${num(boxTop)}" width="${num(b.z - b.a)}" height="${BOX}" rx="4" class="box"/>${linesIn(scale, sc, b.a, boxTop, b.z - b.a, BOX, b.inside ? [[b.a + 8, b.a + 8 + b.w]] : [])}`,
          texts: b.inside ? [{ x: b.a + 8, y: boxTop + 17, s: b.name, cls: "row", anchor: "start" }] : [],
        });
      }
      yy = boxTop + BOX + 8;
    }
    if (row.measure) {
      // On a desktop the unit and a wide first measure can reach into the name column, so the measures start below the note.
      if (!phone && row.note) yy = Math.max(yy, top + 8 + 34 + 8);
      const marks = stretchesOf(row, scale).map((st) => {
        const w = valueWidth(st.label), cx = sc.x((st.from + st.to) / 2);
        return { st, w, x: Math.min(Math.max(cx - w / 2, 12), hi - w) };
      });
      // On a desktop the unit stands left of the measures, on the first line, so a measure that would meet it moves down.
      const unit = !phone && scale.unit ? { st: { label: scale.unit }, w: textWidth(scale.unit, 12), x: 0 } : null;
      if (unit) unit.x = x0 - 10 - unit.w;
      const lines = onLines(unit ? [unit, ...marks] : marks, 4, (p, q) => `the measures ${p.st.label} and ${q.st.label} of the row "${row.name}" need a third line ${where}; widen the narrow stretches, or narrow the scale`);
      for (const m of marks) {
        const my = yy + 8 + m.line * 16;
        s.notes.push({ x: m.x + m.w / 2, y: my, s: m.st.label, cls: "val", anchor: "middle", knock: { x: m.x - 2, y: my - 11, w: m.w + 4, h: 15 } });
      }
      if (unit) s.notes.push({ x: x0 - 10, y: yy + 8 + unit.line * 16, s: scale.unit, cls: "sub", anchor: "end" });
      yy += lines * 16;
    }
    // On a desktop the name column sets the least height of a row.
    if (!phone) yy = Math.max(yy, top + 8 + 16 + (row.note ? LINE : 0) + 12);
    s.bands.push({ x: 8, y: top, w: W - 16, h: yy - top });
    spans.push([phone ? spanTop : top, yy]);
    y = yy + 8;
  }
  drawGrid(s, scale, sc, spans);
  s.h = y;
  return s;
}

/** The boxes in words: a table of each box's row, name, start, end and width, and a line for each measured row and named mark. */
function wordsOf(model) {
  const { scale, rows } = model;
  const unit = scale.unit ? ` ${scale.unit}` : "";
  const head = '<tr><th scope="col">Row</th><th scope="col">Box</th><th scope="col">From</th><th scope="col">To</th><th scope="col">Width</th></tr>';
  const body = rows.flatMap((r) => r.boxes.map((b) => `<tr><th scope="row">${esc(r.note ? `${r.name} (${r.note})` : r.name)}</th><td>${esc(b.name)}</td><td>${fmt(b.from)}</td><td>${fmt(b.to)}</td><td>${fmt(diff(b.from, b.to))}</td></tr>`)).join("");
  const and = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]);
  const lines = [
    ...rows.filter((r) => r.measure).map((r) => `<li>${esc(r.name)}, measured: ${esc(and(stretchesOf(r, scale).map((st) => st.label)))}${esc(unit)}.</li>`),
    ...scale.marks.map((m) => `<li>A line at ${esc(fmt(m.at))}${esc(unit)}: ${esc(m.name)}.</li>`),
  ].join("");
  const units = scale.unit ? `<p>All numbers are in ${esc(scale.unit)}.</p>\n` : "";
  return `${units}<div class="table-wrap is-text" role="region" aria-label="The boxes of the layout" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>${lines ? `\n<ul>${lines}</ul>` : ""}`;
}

module.exports = { readLayout, drawLayout, wordsOf, stretchesOf, onLines, MOST, WIDE, PHONE };
