// Route, wide and tall: lanes are tracks, each part is a stop on its track, and each leg runs to the next stop.
// The layout starts from the measures of the hand-drawn sample and adds room, one step at a time, until the
// drawing passes every spacing rule in geometry.cjs. If no amount of room helps, it fails and says why.
const { check, HEAD } = require("./geometry.cjs");
const { textWidth } = require("./text.cjs");

const GAP = 24; // between two lane bands
const LIMIT = 240; // the most extra room one leg may take

class LayoutError extends Error {
  constructor(form, problems) {
    super(`${form === "column" ? "The column form" : `Route ${form}`} cannot be drawn within the spacing rules: ${problems[0].msg}`);
    this.problems = problems;
  }
}

const even = (n) => 2 * Math.ceil(n / 2);
const nameW = (s) => textWidth(s, 14, 600);
const noteW = (s) => textWidth(s, 12, 400);
const labelW = (part) => Math.max(nameW(part.name), part.note ? noteW(part.note) : 0);

/** The lanes that a leg passes between: the gap next to the lane where it starts, on the side of its target. */
const firstGap = (from, to) => (to > from ? from : from - 1);

function wide(model, k) {
  const { lanes, parts, legs, chain, radius: r } = model;
  const edge = r + 2, STUB = 13, DIAG = 70, RUN = 28 + HEAD + 1;
  const count = lanes.length;
  const touches = (part, dir) => legs.some((leg) => (leg.from === part.index ? parts[leg.to].lane : leg.to === part.index ? parts[leg.from].lane : part.lane) * dir > part.lane * dir);
  // A label sits on the side of the track that no leg of its part uses.
  const side = (part) => (count === 1 || part.lane === count - 1 ? "below" : part.lane === 0 ? "above" : !touches(part, 1) ? "below" : !touches(part, -1) ? "above" : "below");

  const bands = [], trackY = [], gaps = [];
  let y = 20;
  lanes.forEach((lane, i) => {
    const mine = parts.filter((p) => p.lane === i);
    const top = mine.some((p) => side(p) === "above") ? 68 : 32;
    const bottom = mine.some((p) => side(p) === "below") ? 68 : 32;
    bands.push({ y, h: top + bottom });
    trackY.push(y + top);
    y += top + bottom + GAP;
  });
  const h = y - GAP + 20;

  const trackStart = even(24 + Math.max(...lanes.map((l) => nameW(l.name))) + 16);
  const x = [trackStart + 50 + k.lead];
  legs.forEach((leg, j) => x.push(x[j] + 2 * edge + STUB + DIAG + RUN + k.stub[j] + k.run[j]));
  const trackEnd = x[x.length - 1] + 56 + k.tail;
  const w = trackEnd + 24;
  bands.forEach((b, i) => {
    Object.assign(b, { x: 8, w: w - 16 });
    if (i) gaps.push({ x: 0, y: bands[i - 1].y + bands[i - 1].h, w, h: GAP });
  });

  const scene = { form: "wide", w, h, bands, gaps, tracks: trackY.map((ty) => [trackStart, ty, trackEnd, ty]), lanes: [], parts: [], legs: [] };
  lanes.forEach((lane, i) => scene.lanes.push({ icon: lane.icon, iconAt: lane.icon ? [32, trackY[i] - 20] : null, text: { x: 24, y: trackY[i] + 5, s: lane.name, cls: "lane", anchor: "start" } }));
  chain.forEach((index, pos) => {
    const part = parts[index], cy = trackY[part.lane], cx = x[pos];
    const above = side(part) === "above";
    const texts = [{ x: cx, y: above ? cy - (part.note ? 42 : 25) : cy + 35, s: part.name, cls: "name", anchor: "middle" }];
    if (part.note) texts.push({ x: cx, y: above ? cy - 25 : cy + 52, s: part.note, cls: "sub", anchor: "middle" });
    scene.parts.push({ id: part.id, shape: "stop", cx, cy, r, icon: part.icon, iconAt: [cx, cy], end: pos === chain.length - 1, texts });
  });
  legs.forEach((leg, j) => {
    const a = parts[leg.from], b = parts[leg.to], ya = trackY[a.lane], yb = trackY[b.lane];
    const from = x[j] + edge, tip = x[j + 1] - edge;
    if (a.lane === b.lane) {
      const mark = [(from + tip - HEAD) / 2, ya];
      // The verb sits above the line. Where the labels of this lane sit above the track, it sits below, on the free side.
      const below = side(a) === "above" && side(b) === "above";
      scene.legs.push({ n: leg.n, from: a.id, to: b.id, sameLane: true, radius: 0, pts: [[from, ya], [tip, ya]], mark, verb: { x: mark[0], y: below ? ya + 27 : ya - 22, s: leg.verb, cls: "verb", anchor: "middle" } });
      return;
    }
    const d0 = from + STUB + k.stub[j], d1 = d0 + DIAG;
    const g = firstGap(a.lane, b.lane), my = bands[g].y + bands[g].h + GAP / 2;
    const mark = [d0 + ((my - ya) / (yb - ya)) * DIAG, my];
    scene.legs.push({ n: leg.n, from: a.id, to: b.id, sameLane: false, radius: 0, pts: [[from, ya], [d0, ya], [d1, yb], [tip, yb]], mark, verb: { x: mark[0] + 16, y: my + 4, s: leg.verb, cls: "verb", anchor: "start" } });
  });
  return scene;
}

function tall(model, k) {
  const { lanes, parts, legs, chain, radius: r } = model;
  const edge = r + 2, STUB = 9, DIAG = 30, RUN = 28 + HEAD;
  const count = lanes.length;
  const left = (part) => count > 1 && part.lane === 0; // the first lane keeps its labels on the outer side
  const inner = 75 + k.margin;

  const bands = [], trackX = [], gaps = [];
  let x = 8;
  lanes.forEach((lane, i) => {
    // The label side of a band holds the labels of its parts and the verbs of the legs that stay inside it.
    const inside = legs.filter((leg) => parts[leg.from].lane === i && parts[leg.to].lane === i).map((leg) => noteW(leg.verb));
    const labels = 21 + Math.max(0, ...parts.filter((p) => p.lane === i).map(labelW), ...inside) + 16;
    let before = count === 1 ? 40 : i === 0 ? labels : inner;
    let after = count === 1 ? labels : i === 0 ? inner : Math.max(labels, i < count - 1 ? inner : 0);
    const header = (lane.icon ? 38 : 22) + nameW(lane.name) + 16;
    if (before + after < header) (count > 1 && i === 0 ? (before = header - after) : (after = header - before));
    bands.push({ x, w: even(before + after) });
    trackX.push(x + before);
    x += even(before + after) + GAP;
  });
  const w = x - GAP + 8;

  const y = [96 + k.lead];
  legs.forEach((leg, j) => y.push(y[j] + 2 * edge + STUB + DIAG + RUN + k.stub[j] + k.run[j]));
  const last = y[y.length - 1];
  const h = last + 52 + k.tail;
  bands.forEach((b, i) => {
    Object.assign(b, { y: 12, h: h - 24 });
    if (i) gaps.push({ x: bands[i - 1].x + bands[i - 1].w, y: 0, w: GAP, h });
  });

  const scene = { form: "tall", w, h, bands, gaps, tracks: trackX.map((tx) => [tx, 62, tx, h - 26]), lanes: [], parts: [], legs: [] };
  lanes.forEach((lane, i) => scene.lanes.push({ icon: lane.icon, iconAt: lane.icon ? [bands[i].x + 22, 37] : null, text: { x: bands[i].x + (lane.icon ? 38 : 22), y: 42, s: lane.name, cls: "lane", anchor: "start" } }));
  chain.forEach((index, pos) => {
    const part = parts[index], cx = trackX[part.lane], cy = y[pos];
    const tx = left(part) ? cx - 21 : cx + 21, anchor = left(part) ? "end" : "start";
    const texts = [{ x: tx, y: cy + 5, s: part.name, cls: "name", anchor }];
    if (part.note) texts.push({ x: tx, y: cy + 22, s: part.note, cls: "sub", anchor });
    scene.parts.push({ id: part.id, shape: "stop", cx, cy, r, icon: part.icon, iconAt: [cx, cy], end: pos === chain.length - 1, texts });
  });
  legs.forEach((leg, j) => {
    const a = parts[leg.from], b = parts[leg.to], xa = trackX[a.lane], xb = trackX[b.lane];
    const from = y[j] + edge, tip = y[j + 1] - edge;
    if (a.lane === b.lane) {
      const mark = [xa, (from + tip - HEAD) / 2];
      scene.legs.push({ n: leg.n, from: a.id, to: b.id, sameLane: true, radius: 0, pts: [[xa, from], [xa, tip]], mark, verb: { x: xa + 21, y: mark[1] + 4, s: leg.verb, cls: "verb", anchor: "start" } });
      return;
    }
    const d0 = from + STUB + k.stub[j], d1 = d0 + DIAG;
    const g = firstGap(a.lane, b.lane), mx = bands[g].x + bands[g].w + GAP / 2;
    const slope = DIAG / (xb - xa);
    const mark = [mx, d0 + (mx - xa) * slope];
    // The verb sits above its mark. It rises when the line would come closer than 6px to either end of the word.
    const half = textWidth(leg.verb, 12, 400) / 2;
    const base = Math.min(mark[1] - 17, mark[1] - half * Math.abs(slope) - 10);
    scene.legs.push({ n: leg.n, from: a.id, to: b.id, sameLane: false, radius: 0, pts: [[xa, from], [xa, d0], [xb, d1], [xb, tip]], mark, verb: { x: mx, y: base, s: leg.verb, cls: "verb", anchor: "middle" } });
  });
  return scene;
}

// Single track, for phones: the route runs straight down. Each visit to a lane is a band, so a leg that changes
// lane crosses the gap between two bands, and its mark sits in that gap.
function track(model, k) {
  const { lanes, parts, legs, chain, radius: r } = model;
  const edge = r + 2, x = 30, textX = x + 21;
  const y = [], bands = [], gaps = [];
  chain.forEach((index, pos) => {
    const extra = pos ? k.stub[pos - 1] + k.run[pos - 1] : 0;
    if (pos && parts[chain[pos - 1]].lane === parts[index].lane) return y.push(y[pos - 1] + 104 + extra);
    const top = pos ? y[pos - 1] + 36 + GAP : 12;
    bands.push({ lane: parts[index].lane, y: top, first: pos });
    y.push(top + 44 + extra);
  });
  const header = (lane) => x + 13 + 16 + (lane.icon ? 24 : 0) + nameW(lane.name);
  const right = Math.max(...parts.map((p) => textX + labelW(p)), ...legs.map((leg) => textX + noteW(leg.verb)), ...bands.map((b) => header(lanes[b.lane])));
  const w = Math.max(264, even(right + 24)) + k.tail;
  bands.forEach((b, i) => {
    const last = (i + 1 < bands.length ? bands[i + 1].first : chain.length) - 1;
    Object.assign(b, { x: 8, w: w - 16, h: y[last] + 36 - b.y });
    if (i) gaps.push({ x: 0, y: b.y - GAP, w, h: GAP });
  });
  const scene = { form: "track", w, h: y[y.length - 1] + 48, bands, gaps, tracks: [], lanes: [], parts: [], legs: [] };
  for (const b of bands) {
    const lane = lanes[b.lane], end = w - 24;
    scene.lanes.push({ icon: lane.icon, iconAt: lane.icon ? [end - nameW(lane.name) - 14, b.y + 15] : null, text: { x: end, y: b.y + 20, s: lane.name, cls: "lane", anchor: "end" } });
  }
  const bandOf = (pos) => bands.findLast((b) => b.first <= pos);
  chain.forEach((index, pos) => {
    const part = parts[index], cy = y[pos];
    const texts = [{ x: textX, y: cy + 5, s: part.name, cls: "name", anchor: "start" }];
    if (part.note) texts.push({ x: textX, y: cy + 22, s: part.note, cls: "sub", anchor: "start" });
    scene.parts.push({ id: part.id, shape: "stop", cx: x, cy, r, icon: part.icon, iconAt: [x, cy], end: pos === chain.length - 1, texts });
  });
  legs.forEach((leg, j) => {
    const from = y[j] + edge, tip = y[j + 1] - edge;
    const sameLane = bandOf(j) === bandOf(j + 1);
    const my = sameLane ? (from + tip - HEAD) / 2 : bandOf(j + 1).y - GAP / 2;
    scene.legs.push({ n: leg.n, from: parts[leg.from].id, to: parts[leg.to].id, sameLane, radius: 0, pts: [[x, from], [x, tip]], mark: [x, my], verb: { x: textX, y: my + 4, s: leg.verb, cls: "verb", anchor: "start" } });
  });
  return scene;
}

// Column, for phones, for data that is not a route: the parts stand in one column, in the order of Plates. Each visit
// to a lane is a band, as in the single track. A leg to the next part in the column is an arrow straight down. Every
// other leg (a skip, a branch, an arrow back) is a go-to row under the part where it starts: its numbered mark, its
// verb, and the name of the part where it goes. So no line crosses another, and the drawing fits a phone.
const JUMP = 40; // the height of one go-to row
function column(model) {
  const { lanes, parts, legs, radius: r } = model;
  const edge = r + 2, x = 30, textX = x + 21;
  const order = model.chain || [...new Set([...legs.flatMap((leg) => [leg.from, leg.to]), ...parts.map((p) => p.index)])];
  const pos = new Map(order.map((index, i) => [index, i]));
  // The leg to the next part in the column is drawn; the first one wins when two legs join the same pair.
  const next = order.map((index, i) => legs.find((leg) => leg.from === index && leg.to === order[i + 1]) || null);
  const jumps = order.map((index, i) => legs.filter((leg) => leg.from === index && leg !== next[i]));
  const y = [], bands = [], gaps = [];
  order.forEach((index, i) => {
    const extra = i ? jumps[i - 1].length * JUMP : 0;
    if (i && parts[order[i - 1]].lane === parts[index].lane) return y.push(y[i - 1] + 104 + extra);
    const top = i ? y[i - 1] + 36 + extra + GAP : 12;
    bands.push({ lane: parts[index].lane, y: top, first: i });
    y.push(top + 44);
  });
  const header = (lane) => x + 13 + 16 + (lane.icon ? 24 : 0) + nameW(lane.name);
  const target = (leg) => `${pos.get(leg.to) > pos.get(leg.from) ? "to" : "back to"} ${parts[leg.to].name}`;
  const right = Math.max(...parts.map((p) => textX + labelW(p)), ...legs.map((leg) => textX + 26 + Math.max(noteW(leg.verb), noteW(target(leg)))), ...bands.map((b) => header(lanes[b.lane])));
  const w = Math.max(264, even(right + 24));
  bands.forEach((b, i) => {
    const last = (i + 1 < bands.length ? bands[i + 1].first : order.length) - 1;
    Object.assign(b, { x: 8, w: w - 16, h: y[last] + 36 + jumps[last].length * JUMP - b.y });
    if (i) gaps.push({ x: 0, y: b.y - GAP, w, h: GAP });
  });
  const lastPos = order.length - 1;
  const scene = { form: "column", w, h: y[lastPos] + 48 + jumps[lastPos].length * JUMP, bands, gaps, tracks: [], lanes: [], parts: [], legs: [], jumps: [] };
  for (const b of bands) {
    const lane = lanes[b.lane], end = w - 24;
    scene.lanes.push({ icon: lane.icon, iconAt: lane.icon ? [end - nameW(lane.name) - 14, b.y + 15] : null, text: { x: end, y: b.y + 20, s: lane.name, cls: "lane", anchor: "end" } });
  }
  const bandOf = (i) => bands.findLast((b) => b.first <= i);
  order.forEach((index, i) => {
    const part = parts[index], cy = y[i];
    const texts = [{ x: textX, y: cy + 5, s: part.name, cls: "name", anchor: "start" }];
    if (part.note) texts.push({ x: textX, y: cy + 22, s: part.note, cls: "sub", anchor: "start" });
    // A part where no leg starts ends a path, so its ring is filled, like the last stop of a route.
    scene.parts.push({ id: part.id, shape: "stop", cx: x, cy, r, icon: part.icon, iconAt: [x, cy], end: !legs.some((l) => l.from === index), texts });
    jumps[i].forEach((leg, j) => {
      const my = cy + 46 + j * JUMP;
      scene.jumps.push({ n: leg.n, from: part.id, to: parts[leg.to].id, optional: leg.optional, mark: [textX + 10, my], verb: { x: textX + 26, y: my + 4, s: leg.verb, cls: "verb", anchor: "start" }, target: { x: textX + 26, y: my + 20, s: target(leg), cls: "sub", anchor: "start" } });
    });
    const leg = next[i];
    if (!leg) return;
    const from = cy + edge, tip = y[i + 1] - edge;
    const sameLane = bandOf(i) === bandOf(i + 1);
    // In the middle of the leg below the go-to rows of this part, as in the single track; or in the gap between two bands.
    const my = sameLane ? (from + jumps[i].length * JUMP + tip - HEAD) / 2 : bandOf(i + 1).y - GAP / 2;
    scene.legs.push({ n: leg.n, from: part.id, to: parts[leg.to].id, sameLane, radius: 0, pts: [[x, from], [x, tip]], mark: [x, my], verb: { x: textX, y: my + 4, s: leg.verb, cls: "verb", anchor: "start" } });
  });
  return scene;
}

/** Lays out the Column form. Throws LayoutError when it cannot keep the spacing rules. */
function layoutColumn(model) {
  const scene = column(model);
  const problems = check(scene);
  if (problems.length) throw new LayoutError("column", problems);
  return scene;
}

/** Adds room for the first problem. Returns false when no room can fix it. */
function makeRoom(k, problem, model) {
  const grow = (list, i, by) => (i >= 0 && i < list.length && list[i] + by <= LIMIT ? ((list[i] += by), true) : false);
  const add = (key, by, most) => (k[key] + by <= most ? ((k[key] += by), true) : false);
  const leg = problem.leg ? problem.leg - 1 : -1;
  const place = (id) => model.chain.findIndex((index) => model.parts[index].id === id);
  if (problem.kind === "outside") return add("tail", 8, 320);
  if (problem.kind === "verb-track") return add("margin", 8, 200);
  if (problem.lane != null && problem.part) return add("lead", 8, 200);
  if (problem.kind === "text-text" && problem.part && problem.other) return grow(k.stub, Math.max(place(problem.part), place(problem.other)) - 1, 8);
  if (problem.kind === "text-part" && problem.part && problem.other) return grow(k.stub, Math.max(place(problem.part), place(problem.other)) - 1, 8);
  if (leg < 0) return false;
  // Two legs are in each other's way: the later one gets a longer start, which moves it away.
  if (problem.otherLeg && problem.otherLeg !== problem.leg) return grow(k.stub, Math.max(problem.leg, problem.otherLeg) - 1, 6);
  // A label of the part where the leg arrives needs a longer run; anything else needs a longer start.
  if ((problem.kind === "text-line" || problem.kind === "text-head") && problem.part === model.parts[model.legs[leg].to].id) return grow(k.run, leg, 6);
  return grow(k.stub, leg, 6);
}

/** Lays out a Route drawing. form is "wide", "tall" or "track". Throws LayoutError when the rules cannot be kept. */
function layoutRoute(model, form) {
  const draw = { wide, tall, track }[form];
  const k = { stub: model.legs.map(() => 0), run: model.legs.map(() => 0), margin: 0, lead: 0, tail: 0 };
  let problems = [];
  for (let round = 0; round < 400; round++) {
    const scene = draw(model, k);
    problems = check(scene);
    if (!problems.length) return scene;
    if (!makeRoom(k, problems[0], model)) break;
  }
  throw new LayoutError(form, problems);
}

module.exports = { layoutRoute, layoutColumn, LayoutError };
