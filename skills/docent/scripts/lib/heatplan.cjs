// Heat plans: how much happens in each area of a page or a screen, such as the clicks on each part of a product page. It is a
// plan (a grid of named areas, from plan.cjs) whose boxes each hold a number, and each box with a number is filled with its heat
// step, on a scale that the author fixes, with the legend of a heat map above it (from heatmap.cjs). A plan keeps its rule that
// every box looks the same; this kind is the one that fills them. The rules come from docs/proposals/heat-maps.md, section 8.
const { fail } = require("./blocks.cjs");
const { readPlan, drawPlan, wordsOf: planWords, scaleNote, WIDE, PHONE } = require("./plan.cjs");
const { readHeatScale, stepOf, drawLegend, heatLines } = require("./heatmap.cjs");
const { isNum, fmt } = require("./scale.cjs");

/** Checks heat plan data and returns the model: a plan's model, with the scale, and on each box its value and heat step. */
function readHeatplan(data) {
  // The plan's checks, with the scale set aside: in a plan "scale" is refused, and here it is the heat scale.
  const model = readPlan({ ...data, scale: null }, "heat plan");
  const { scale, edges } = readHeatScale(data.scale, "a heat plan", "clicks");
  const raw = new Map(data.boxes.map((b) => [b.id, b]));
  for (const b of model.boxes) {
    const r = raw.get(b.id);
    if (!Object.hasOwn(r, "value")) fail(`the box "${b.id}" needs a "value": a number on the scale, or null for no data`);
    if (r.value === null) { Object.assign(b, { value: null, shown: "no data", heat: 0 }); continue; }
    if (!isNum(r.value)) fail(`the box "${b.id}" has the value ${JSON.stringify(r.value)}; a value is a number, or null for no data`);
    if (r.value < scale.from || r.value > scale.to) fail(`the box "${b.id}" has the value ${fmt(r.value)}; it must be on the scale, from ${fmt(scale.from)} to ${fmt(scale.to)}`);
    const c = stepOf(r.value, scale, edges);
    Object.assign(b, { value: c.v, shown: c.written, step: c.step, heat: c.heat });
  }
  if (model.boxes.every((b) => b.value === null)) fail(`every box has no data; a heat plan needs at least one number`);
  return { ...model, kind: "heatplan", scale, edges };
}

/** The drawing: the legend at the top, then the plan's grid form (640px, or 264px on a phone) or, on a phone where the grid
 * cannot fit, its stack form. A box with no data says so in words, so the legend has no "no data" key. */
function drawHeatplan(model, phone = false) {
  const legend = { notes: [], parts: [] };
  // The swatches start at the left edge of the boxes (14px). 8px more stand between the legend's numbers and the line on the
  // widths, so the two never read as one.
  const top = drawLegend(model, legend, phone ? PHONE : WIDE, false, 14) + 8;
  const s = drawPlan(model, phone, top);
  s.form = "heatplan";
  s.notes.unshift(...legend.notes);
  s.parts.unshift(...legend.parts);
  return s;
}

/** The boxes in words: the plan's table with a Value column, then the lines on the steps, the highest, the lowest and no data. */
function wordsOf(model, scene, phone) {
  const found = model.boxes.filter((b) => b.value !== null).map((b) => ({ v: b.value, at: b.name }));
  const empty = model.boxes.length - found.length;
  return `${planWords(model, scene, phone)}\n${heatLines(model.scale, found, empty, ["box", "boxes"])}`;
}

module.exports = { readHeatplan, drawHeatplan, wordsOf, scaleNote };
