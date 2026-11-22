// One numeric scale for the scale charts (a range chart now, a layout to scale later): it checks the scale data, maps
// numbers to pixels, keeps the ticks whose labels stand at least 48px apart, and finds a free place for a label.
// A scale chart is drawn again at each width with text at its real size, so only the pixels per unit change.
const { fail, words } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");

const MOST = { steps: 20, unit: 12, marks: 2, mark: 20 };
const GAP = 48; // the least distance between two tick labels, as in a timing diagram
const KEEP = [1, 2, 5, 10, 20]; // keep every tick, then every second, every fifth, ...
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** The width of a value or tick label at 12px with tabular figures: each digit is as wide as the widest digit, which is
 * wider than the proportional digit in the text measure (Chrome on macOS: 7.55px at 12px). 0.66em keeps room to spare. */
const valueWidth = (s, size = 12) => textWidth(String(s).replace(/\d/g, ""), size) + (String(s).match(/\d/g) || []).length * 0.66 * size;

// A number as written: the shortest digits that give back the same number, so every digit of the author's value stays
// (also 1000000000000011); a minus sign, not a hyphen. A computed value is cleaned first, as tickAt does.
const fmt = (v) => String(v).replace(/^-/, "−");

/**
 * The value of tick k. The first and the last tick are the author's own "from" and "to". Any other tick is the shortest
 * number within the error of the arithmetic: from + k × step is off by at most about 4 × epsilon × (|from| + |k × step|).
 * So noise goes (-0.35 + 5 × 0.07 is 5.55e-17, and the value is 0), and every digit that means something stays: tiny steps
 * (1e-21), large offsets (1700000000001, 1000000000000011) and real offsets near 0 (1e-14).
 */
function tickAt({ from, to, step }, count, k) {
  if (k === 0) return from;
  if (k === count) return to;
  // Each part is multiplied by epsilon first, so the error of a scale near the largest number does not overflow.
  const v = from + k * step, error = 4 * (Math.abs(from) * Number.EPSILON + Math.abs(k * step) * Number.EPSILON);
  if (Math.abs(v) <= error) return 0;
  // 17 digits always give back the same number, so the loop always returns.
  for (let digits = 1; digits <= 17; digits++) { const short = Number(v.toPrecision(digits)); if (Math.abs(short - v) <= error) return short; }
  return v;
}

/** Checks the scale: from, to, a step (needed or not), a unit and up to two named marks. */
function readScale(scale, { needStep }) {
  if (!scale || typeof scale !== "object" || !isNum(scale.from) || !isNum(scale.to)) fail(`"scale" must be an object with the numbers "from" and "to"${needStep ? ' and "step"' : ""}, and may have a "unit" such as "px"`);
  if (!(scale.to > scale.from)) fail(`"scale" must run forward: "to" is more than "from"`);
  let count = 0;
  if (scale.step != null || needStep) {
    if (!isNum(scale.step) || !(scale.step > 0)) fail(`"scale" needs a "step", a number more than 0, for its ticks`);
    count = Math.round((scale.to - scale.from) / scale.step);
    if (count < 1) fail(`"scale" needs at least one step: "step" must be no more than "to" minus "from"`);
    // The step limit comes before any work for each tick, so a step that is far too small is refused at once.
    if (count > MOST.steps) fail(`the scale has ${count} steps; a scale chart has at most ${MOST.steps}. Use a larger "step"`);
    // A label drops the digits lost in the arithmetic, so a step much smaller than the numbers can give two ticks the same label.
    const written = Array.from({ length: count + 1 }, (_, k) => fmt(tickAt(scale, count, k)));
    if (new Set(written).size < written.length) fail(`"step" is too small for numbers this large: the labels cannot tell the ticks apart. Write the values from a nearer start, such as an offset in a smaller unit`);
    // The error allowed is a billionth of a step, so a scale of tiny steps is checked as closely as a scale of large ones,
    // or the rounding of the endpoints themselves (2000000.2 − 2000000.1 is not exactly 0.1), whichever is larger, but never
    // more than 1% of a step: endpoints too large for their step cannot show a whole number of steps, and are refused.
    const allowed = Math.min(0.01 * scale.step, Math.max(1e-9 * scale.step, 8 * Number.EPSILON * Math.max(Math.abs(scale.from), Math.abs(scale.to))));
    if (Math.abs(count * scale.step - (scale.to - scale.from)) > allowed) fail(`"scale": "to" minus "from" must be a whole number of steps`);
  }
  const unit = words(scale.unit, `the unit of "scale"`, MOST.unit, false);
  if (scale.marks != null && !Array.isArray(scale.marks)) fail(`"marks" in "scale" must be a list`);
  const marks = (scale.marks || []).map((m, i) => {
    const what = `mark ${i + 1} of "scale"`;
    if (!m || typeof m !== "object" || !isNum(m.at) || m.at < scale.from || m.at > scale.to) fail(`${what} needs "at", a number from ${fmt(scale.from)} to ${fmt(scale.to)}`);
    return { at: m.at, name: words(m.name, `the name of ${what}`, MOST.mark) };
  });
  if (marks.length > MOST.marks) fail(`a scale has at most ${MOST.marks} marks`);
  return { from: scale.from, to: scale.to, step: count ? scale.step : null, count, unit, marks };
}

/** The scale laid on the pixels x0 to x1: x(value), and the ticks that keep their labels apart and between lo and hi. */
function makeScale(scale, x0, x1, { lo = -Infinity, hi = Infinity } = {}) {
  const per = (x1 - x0) / (scale.to - scale.from);
  const x = (v) => x0 + (v - scale.from) * per;
  const ticks = [];
  if (scale.count) {
    // A tick stands at its exact value, and its label is the cleaned value (tickAt).
    const raw = (k) => scale.from + k * scale.step;
    const at = (k) => tickAt(scale, scale.count, k);
    const label = (k) => fmt(at(k));
    // A spacing keeps every n-th tick. It works when each two kept labels stand at least 48px apart, and far enough apart
    // for half of each label and 16px between them. Only the labels that a spacing keeps are measured, and only spacings
    // up to the number of steps count, so the last spacing keeps just the first and the last tick.
    const width = Array.from({ length: scale.count + 1 }, (_, k) => valueWidth(label(k)));
    const inside = (k) => x(raw(k)) - width[k] / 2 >= lo && x(raw(k)) + width[k] / 2 <= hi;
    const fits = (n) => {
      for (let k = 0; k <= scale.count; k += n) if (!inside(k)) return false;
      for (let k = n; k <= scale.count; k += n) if (n * scale.step * per < Math.max(GAP, (width[k - n] + width[k]) / 2 + 16)) return false;
      return true;
    };
    const keep = [...KEEP.filter((n) => n < scale.count), scale.count].find(fits);
    // Not even the first and the last label stand apart: the labels are wider than the scale.
    if (!keep) fail(`the first and the last tick labels are ${Math.ceil(width[0])}px and ${Math.ceil(width[scale.count])}px wide, and the scale is ${Math.round(x1 - x0)}px wide, so no two tick labels stand apart; use a larger "step", or values with fewer digits`);
    for (let k = 0; k <= scale.count; k += keep) ticks.push({ v: at(k), x: x(k === 0 || k === scale.count ? at(k) : raw(k)), label: label(k) });
  }
  return { per, x, ticks };
}

const num = (v) => String(Math.round(v * 100) / 100);

/** b minus a without the noise of the subtraction: the shortest number within its rounding error (100.2 − 100.1 is 0.1). */
function diff(a, b) {
  const v = b - a, error = 2 * (Math.abs(a) * Number.EPSILON + Math.abs(b) * Number.EPSILON);
  // 17 digits always give back the same number, so the loop always returns.
  for (let digits = 1; digits <= 17; digits++) { const short = Number(v.toPrecision(digits)); if (Math.abs(short - v) <= error) return short; }
  return v;
}

/**
 * The head of a scale chart, from the top y: the names of the marks, then the tick labels, with the unit at the left of the
 * ticks (on its own line on a phone). A scale with no ticks shows no unit here; its measures carry it. Returns the y below.
 */
function drawHead(s, scale, sc, { W, x0, phone, where }) {
  let y = 12;
  if (scale.marks.length) {
    const boxes = scale.marks.map((m) => {
      const w = textWidth(m.name, 12), cx = Math.min(Math.max(sc.x(m.at), 12 + w / 2), W - 12 - w / 2);
      s.notes.push({ x: cx, y: y + 12, s: m.name, cls: "sub", anchor: "middle" });
      return [cx - w / 2, cx + w / 2, m.name];
    }).sort((a, b) => a[0] - b[0]);
    if (boxes.length === 2 && boxes[1][0] - boxes[0][1] < 12) fail(`the names of the marks "${boxes[0][2]}" and "${boxes[1][2]}" meet ${where}; move a mark, or shorten its name`);
    y += 20;
  }
  if (!sc.ticks.length) return y;
  if (phone && scale.unit) { s.notes.push({ x: x0, y: y + 12, s: scale.unit, cls: "sub", anchor: "start" }); y += 20; }
  for (const t of sc.ticks) s.notes.push({ x: t.x, y: y + 12, s: t.label, cls: "val", anchor: "middle" });
  if (!phone && scale.unit) s.notes.push({ x: x0 - 10 - valueWidth(sc.ticks[0].label) / 2, y: y + 12, s: scale.unit, cls: "sub", anchor: "end" });
  return y + 24;
}

/** The grid: a line for each tick, and a line in the muted color for each named mark, through each span [y0, y1]. */
function drawGrid(s, scale, sc, spans) {
  const lineAt = (x) => scale.marks.some((m) => Math.abs(sc.x(m.at) - x) < 0.5);
  for (const [y0, y1] of spans) {
    for (const t of sc.ticks) if (!lineAt(t.x)) s.tracks.push([t.x, y0, t.x, y1]);
    for (const m of scale.marks) s.under.push(`<line x1="${num(sc.x(m.at))}" y1="${num(y0)}" x2="${num(sc.x(m.at))}" y2="${num(y1)}" class="r-ref"/>`);
  }
}

/**
 * A free place for a label of width w beside a mark from a to b (pixels), between lo and hi, trying the sides in order:
 * "inside" (centred in the mark), "right" or "left" (8px clear of the mark). It returns { x, anchor, side }, or the
 * place on a line above the mark when no side has room ({ side: "above" }, starting at the mark, kept between lo and hi).
 */
function placeLabel({ a, b, w, lo, hi, sides }) {
  for (const side of sides) {
    if (side === "inside" && b - a >= w + 16) return { x: (a + b) / 2, anchor: "middle", side };
    if (side === "right" && b + 8 + w <= hi) return { x: b + 8, anchor: "start", side };
    if (side === "left" && a - 8 - w >= lo) return { x: a - 8, anchor: "end", side };
  }
  if (hi - lo < w) return null;
  return { x: Math.min(Math.max(a, lo), hi - w), anchor: "start", side: "above" };
}

module.exports = { readScale, makeScale, drawHead, drawGrid, placeLabel, valueWidth, fmt, isNum, num, diff, MOST };
