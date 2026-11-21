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

// A number as written: twelve significant digits keep the input's precision and drop float noise; a minus sign, not a hyphen.
const fmt = (v) => String(Number(v.toPrecision(12))).replace(/^-/, "−");

/** Checks the scale: from, to, a step (needed or not), a unit and up to two named marks. */
function readScale(scale, { needStep }) {
  if (!scale || typeof scale !== "object" || !isNum(scale.from) || !isNum(scale.to)) fail(`"scale" must be an object with the numbers "from" and "to"${needStep ? ' and "step"' : ""}, and may have a "unit" such as "px"`);
  if (!(scale.to > scale.from)) fail(`"scale" must run forward: "to" is more than "from"`);
  let count = 0;
  if (scale.step != null || needStep) {
    if (!isNum(scale.step) || !(scale.step > 0)) fail(`"scale" needs a "step", a number more than 0, for its ticks`);
    count = Math.round((scale.to - scale.from) / scale.step);
    if (Math.abs(count * scale.step - (scale.to - scale.from)) > 1e-9 * Math.max(1, Math.abs(scale.to - scale.from))) fail(`"scale": "to" minus "from" must be a whole number of steps`);
    if (count > MOST.steps) fail(`the scale has ${count} steps; a scale chart has at most ${MOST.steps}. Use a larger "step"`);
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

/** The scale laid on the pixels x0 to x1: x(value), and the ticks that keep their labels apart. */
function makeScale(scale, x0, x1) {
  const per = (x1 - x0) / (scale.to - scale.from);
  const x = (v) => x0 + (v - scale.from) * per;
  const ticks = [];
  if (scale.count) {
    const label = (k) => fmt(scale.from + k * scale.step);
    const widest = Math.max(...Array.from({ length: scale.count + 1 }, (_, k) => valueWidth(label(k))));
    const keep = KEEP.find((k) => k * scale.step * per >= Math.max(GAP, widest + 16)) || scale.count;
    for (let k = 0; k <= scale.count; k += keep) ticks.push({ v: scale.from + k * scale.step, x: x(scale.from + k * scale.step), label: label(k) });
  }
  return { per, x, ticks };
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

module.exports = { readScale, makeScale, placeLabel, valueWidth, fmt, isNum, MOST };
