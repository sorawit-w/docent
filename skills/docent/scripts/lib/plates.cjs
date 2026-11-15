// Plates: each lane is a panel, each part is a plate, and each leg is an arrow that is routed between the plates.
// Every part has its own row, so a level line at a plate's height never meets another plate.
// The router walks a grid of free lines (shortest path, few bends, no line on another line). Then each leg gets
// its mark and its verb, and the whole drawing must pass the spacing rules in geometry.cjs.
const { check, HEAD, RULE, dist, textBox } = require("./geometry.cjs");
const { textWidth } = require("./text.cjs");

const CARD_H = 52, MARGIN = 28, GAP = 44, TOP = 64, RADIUS = 8;
const CHANNEL = 14; // a free upright line beside a column of plates
const STEM = RULE.run + HEAD + RADIUS; // the straight line that an arrowhead needs behind it
const NEAR = HEAD + 16; // no other line crosses a leg this close to its arrowhead
const PAGE = 1104;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // right, down, left, up

class PlatesError extends Error {
  constructor(problems) {
    super(`Plates cannot be drawn within the spacing rules: ${problems[0].msg}`);
    this.problems = problems;
  }
}

const labelW = (part) => Math.max(textWidth(part.name, 14, 600), part.note ? textWidth(part.note, 12, 400) : 0);
const uniq = (list) => [...new Set(list.map((n) => Math.round(n * 100) / 100))].sort((a, b) => a - b);

/** A small priority queue: pops the entry with the lowest cost; equal costs leave in the order they came. */
class Queue {
  constructor() { this.items = []; this.count = 0; }
  push(cost, value) {
    const item = [cost, this.count++, value], list = this.items;
    let i = list.push(item) - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (list[up][0] < cost || (list[up][0] === cost && list[up][1] < item[1])) break;
      [list[i], list[up]] = [list[up], list[i]];
      i = up;
    }
  }
  pop() {
    const list = this.items, top = list[0], last = list.pop();
    if (list.length) {
      list[0] = last;
      let i = 0;
      for (;;) {
        let low = i;
        for (const child of [2 * i + 1, 2 * i + 2]) if (child < list.length && (list[child][0] < list[low][0] || (list[child][0] === list[low][0] && list[child][1] < list[low][1]))) low = child;
        if (low === i) break;
        [list[i], list[low]] = [list[low], list[i]];
        i = low;
      }
    }
    return top;
  }
  get size() { return this.items.length; }
}

function draw(model, k) {
  const { lanes, parts, legs } = model;
  const count = lanes.length;
  const hasIcons = Boolean(parts[0].icon);
  const textX = hasIcons ? 46 : 18;

  // Rows: one part per row, in the order in which the legs first reach the parts.
  const order = model.chain || [...new Set([...legs.flatMap((leg) => [leg.from, leg.to]), ...parts.map((p) => p.index)])];
  const rowOf = new Map(order.map((index, row) => [index, row]));
  const laneGap = GAP + k.laneGap;
  const cardW = Math.max(...parts.map((p) => textX + labelW(p) + 18), Math.min(300, Math.floor((PAGE - 24 - GAP * (count - 1)) / count) - 2 * MARGIN));
  const panelW = cardW + 2 * MARGIN;
  const cardX = lanes.map((_, c) => 12 + c * (panelW + laneGap) + MARGIN);

  // A leg that joins two plates in one lane, one right below the other, runs straight: the gap holds a full leg.
  const tops = [TOP];
  for (let row = 0; row + 1 < order.length; row++) {
    const a = order[row], b = order[row + 1];
    const straight = parts[a].lane === parts[b].lane && legs.some((leg) => (leg.from === a && leg.to === b) || (leg.from === b && leg.to === a));
    tops.push(tops[row] + CARD_H + (straight ? RULE.sameLane + 2 : 40) + k.rowGap[row]);
  }
  const cards = parts.map((part) => {
    const x0 = cardX[part.lane], y0 = tops[rowOf.get(part.index)];
    return { index: part.index, lane: part.lane, row: rowOf.get(part.index), x0, y0, x1: x0 + cardW, y1: y0 + CARD_H, cx: x0 + cardW / 2, cy: y0 + CARD_H / 2 };
  });
  const lastBottom = tops[tops.length - 1] + CARD_H;

  // The grid of lines that a leg may follow.
  const gutter = cardX[count - 1] + cardW + MARGIN + laneGap + MARGIN - CHANNEL; // a line outside the last panel, used only when needed
  const xs = uniq([...cardX.flatMap((x0) => [x0 - CHANNEL, x0 + 30, x0 + cardW / 2, x0 + cardW - 30, x0 + cardW + CHANNEL]), gutter]);
  const between = [];
  for (let row = 0; row + 1 < tops.length; row++) for (let y = tops[row] + CARD_H + 20; y <= tops[row + 1] - 20 + 0.01; y += 16) between.push(y);
  const ys = uniq([...tops.flatMap((y0) => [y0 + CARD_H / 2 - 14, y0 + CARD_H / 2, y0 + CARD_H / 2 + 14]), ...between]);
  const blocked = (x, y) => cards.some((c) => x > c.x0 - 8 && x < c.x1 + 8 && y > c.y0 - 8 && y < c.y1 + 8);
  const key = (i, j) => i * 1000 + j;
  const edgeUsed = new Set(); // "h" edges run right from a node, "v" edges run down
  const nodeUse = new Map(); // node -> "h", "v" (a line passes straight) or "b" (a bend)
  const portUsed = new Set();
  const edgeKey = (i, j, d) => (d === 0 ? `h${key(i, j)}` : d === 2 ? `h${key(i - 1, j)}` : d === 1 ? `v${key(i, j)}` : `v${key(i, j - 1)}`);
  const axis = (d) => (d % 2 === 0 ? "h" : "v");
  const passable = (i, j, din, dout) => {
    const use = nodeUse.get(key(i, j));
    if (!use) return true;
    return din === dout && use !== "b" && use !== axis(din); // only a clean crossing is allowed
  };
  const canStep = (i, j, d) => {
    const ni = i + DIRS[d][0], nj = j + DIRS[d][1];
    return ni >= 0 && nj >= 0 && ni < xs.length && nj < ys.length && !blocked(xs[ni], ys[nj]) && !edgeUsed.has(edgeKey(i, j, d));
  };
  const indexOf = (list, value) => list.findIndex((n) => Math.abs(n - value) < 0.01);

  function ports(card, target) {
    const toward = target.lane > card.lane ? [card.x1 - 30, card.cx, card.x0 + 30] : target.lane < card.lane ? [card.x0 + 30, card.cx, card.x1 - 30] : [card.cx, card.x1 - 30, card.x0 + 30];
    const sideY = [card.cy, card.cy + 14, card.cy - 14];
    return [
      ...toward.map((x, n) => ({ pt: [x, card.y1], d: 1, pen: n * 8 })),
      ...toward.map((x, n) => ({ pt: [x, card.y0], d: 3, pen: n * 8 })),
      ...sideY.map((y, n) => ({ pt: [card.x1, y], d: 0, pen: n ? 6 : 0 })),
      ...sideY.map((y, n) => ({ pt: [card.x0, y], d: 2, pen: n ? 6 : 0 })),
    ].filter((p) => !portUsed.has(`${card.index}:${p.pt}`));
  }

  /** Walks outward from a port along the grid until `least` px are behind. Returns the nodes passed, or null. */
  function stem(port, least) {
    let i = port.d % 2 === 0 ? (port.d === 0 ? xs.findIndex((x) => x > port.pt[0] + 0.01) : xs.findLastIndex((x) => x < port.pt[0] - 0.01)) : indexOf(xs, port.pt[0]);
    let j = port.d % 2 === 1 ? (port.d === 1 ? ys.findIndex((y) => y > port.pt[1] + 0.01) : ys.findLastIndex((y) => y < port.pt[1] - 0.01)) : indexOf(ys, port.pt[1]);
    if (i < 0 || j < 0 || blocked(xs[i], ys[j])) return null;
    const nodes = [[i, j]];
    while (dist(port.pt, [xs[i], ys[j]]) < least) {
      // No other line may cross right behind an arrowhead.
      if (dist(port.pt, [xs[i], ys[j]]) < NEAR && nodeUse.has(key(i, j))) return null;
      if (!passable(i, j, port.d, port.d) || !canStep(i, j, port.d)) return null;
      i += DIRS[port.d][0]; j += DIRS[port.d][1];
      nodes.push([i, j]);
    }
    return nodes;
  }

  function route(leg) {
    const src = cards[leg.from], dst = cards[leg.to];
    // Straight down or up inside one lane, when nothing stands between.
    if (src.lane === dst.lane) {
      const down = dst.row > src.row;
      const [y0, y1] = down ? [src.y1, dst.y0] : [dst.y1, src.y0];
      const clear = !cards.some((c) => c.lane === src.lane && c.y0 > y0 && c.y1 < y1);
      const from = `${src.index}:${[src.cx, down ? src.y1 : src.y0]}`, to = `${dst.index}:${[dst.cx, down ? dst.y0 : dst.y1]}`;
      const i = indexOf(xs, src.cx), rows = ys.map((y, j) => j).filter((j) => ys[j] > y0 && ys[j] < y1);
      if (clear && !portUsed.has(from) && !portUsed.has(to) && rows.every((j) => passable(i, j, 1, 1)) && rows.slice(1).every((j) => !edgeUsed.has(`v${key(i, j - 1)}`))) {
        portUsed.add(from).add(to);
        rows.forEach((j, n) => { nodeUse.set(key(i, j), nodeUse.has(key(i, j)) ? "b" : "v"); if (n) edgeUsed.add(`v${key(i, j - 1)}`); });
        return down ? [[src.cx, src.y1], [dst.cx, dst.y0 - 2]] : [[src.cx, src.y0], [dst.cx, dst.y1 + 2]];
      }
    }
    // Entries: a port on the left or right side, with a straight stem that is long enough for the arrowhead.
    const goals = new Map();
    for (const port of ports(dst, src).filter((p) => p.d % 2 === 0)) {
      const nodes = stem(port, STEM);
      if (!nodes) continue;
      const [i, j] = nodes[nodes.length - 1];
      const list = goals.get(key(i, j)) || [];
      list.push({ port, nodes, cost: dist(port.pt, [xs[i], ys[j]]) + port.pen });
      goals.set(key(i, j), list);
    }
    const queue = new Queue(), seen = new Map(), from = new Map();
    const state = (i, j, d) => key(i, j) * 4 + d;
    for (const port of ports(src, dst)) {
      const nodes = stem(port, 0);
      if (!nodes) continue;
      const [i, j] = nodes[0];
      const cost = dist(port.pt, [xs[i], ys[j]]) + port.pen;
      const id = state(i, j, port.d);
      if (!seen.has(id) || seen.get(id) > cost) { seen.set(id, cost); from.set(id, { port }); queue.push(cost, [i, j, port.d]); }
    }
    let best = null;
    while (queue.size) {
      const [cost, , [i, j, d]] = queue.pop();
      if (best && cost >= best.cost) break;
      if (seen.get(state(i, j, d)) < cost) continue;
      for (const goal of goals.get(key(i, j)) || []) {
        const into = (goal.port.d + 2) % 4; // the direction of travel along the stem, toward the plate
        if (d === goal.port.d || !passable(i, j, d, into)) continue;
        const total = cost + goal.cost + (d === into ? 0 : 30);
        if (!best || total < best.cost) best = { cost: total, goal, end: state(i, j, d) };
      }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === (d + 2) % 4 || !passable(i, j, d, nd) || !canStep(i, j, nd)) continue;
        const ni = i + DIRS[nd][0], nj = j + DIRS[nd][1];
        const use = nodeUse.get(key(ni, nj));
        const next = cost + Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]) + (nd === d ? 0 : 30) + (use ? 20 : 0);
        const id = state(ni, nj, nd);
        if (seen.has(id) && seen.get(id) <= next) continue;
        seen.set(id, next);
        from.set(id, { prev: state(i, j, d) });
        queue.push(next, [ni, nj, nd]);
      }
    }
    if (!best) return null;
    // Rebuild the path: start port, grid nodes, stem, arrow tip.
    const walk = [];
    let id = best.end, start = null;
    for (;;) {
      walk.unshift([Math.floor(Math.floor(id / 4) / 1000), Math.floor(id / 4) % 1000, id % 4]);
      const step = from.get(id);
      if (step.port) { start = step.port; break; }
      id = step.prev;
    }
    const into = (best.goal.port.d + 2) % 4;
    const stemNodes = best.goal.nodes.slice(0, -1).reverse().map(([i, j]) => [i, j, into]);
    const all = [...walk, ...stemNodes];
    const end = best.goal.port.pt;
    all.forEach(([i, j, d], n) => {
      const out = n + 1 < all.length ? all[n + 1][2] : into;
      const closed = d !== out || nodeUse.has(key(i, j)) || dist(end, [xs[i], ys[j]]) < NEAR;
      nodeUse.set(key(i, j), closed ? "b" : axis(d));
      if (n + 1 < all.length) edgeUsed.add(edgeKey(i, j, out));
    });
    portUsed.add(`${src.index}:${start.pt}`).add(`${dst.index}:${best.goal.port.pt}`);
    const tip = [end[0] + DIRS[best.goal.port.d][0] * 2, end[1] + DIRS[best.goal.port.d][1] * 2];
    const pts = [start.pt, ...all.map(([i, j]) => [xs[i], ys[j]]), tip];
    return pts.filter((p, n) => n === 0 || n === pts.length - 1 || !((pts[n - 1][0] === p[0] && p[0] === pts[n + 1][0]) || (pts[n - 1][1] === p[1] && p[1] === pts[n + 1][1])));
  }

  const useGutter = () => scene.legs.some((leg) => leg.pts.some((p) => p[0] > cardX[count - 1] + cardW + CHANNEL + 1));
  const scene = { form: "plates", w: 0, h: lastBottom + 28, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [] };
  cards.forEach((card, n) => {
    const part = parts[n];
    const texts = [{ x: card.x0 + textX, y: card.y0 + (part.note ? 23 : 31), s: part.name, cls: "name", anchor: "start" }];
    if (part.note) texts.push({ x: card.x0 + textX, y: card.y0 + 40, s: part.note, cls: "sub", anchor: "start" });
    scene.parts.push({ id: part.id, shape: "card", x: card.x0, y: card.y0, w: cardW, h: CARD_H, icon: part.icon, iconAt: [card.x0 + 24, card.cy], end: false, texts });
  });

  const problems = [];
  const gapCenters = cardX.slice(1).map((x0) => x0 - MARGIN - laneGap / 2);
  // First every leg gets its path. Then each leg gets its mark and its verb, with all the lines known.
  const routed = [];
  for (const leg of legs) {
    const pts = route(leg);
    if (!pts) { problems.push({ rule: "R5", kind: "no-path", leg: leg.n, msg: `no free path for leg ${leg.n}, from "${parts[leg.from].id}" to "${parts[leg.to].id}"` }); break; }
    const away = [-9999, -9999 - 99 * leg.n]; // a place far outside, until the mark and the verb are set
    routed.push({ n: leg.n, from: parts[leg.from].id, to: parts[leg.to].id, sameLane: parts[leg.from].lane === parts[leg.to].lane, radius: RADIUS, pts, mark: away, verb: { x: away[0], y: away[1], s: "", cls: "verb", anchor: "start" } });
  }
  scene.legs = routed;
  for (const [index, drawn] of problems.length ? [] : routed.entries()) {
    const leg = legs[index], pts = drawn.pts;
    // Where the mark may sit, best place first. A leg that crosses lanes keeps its mark in the gap between two lanes.
    const spots = [];
    const segs = pts.slice(0, -1).map((p, n) => ({ a: p, b: pts[n + 1], last: n === pts.length - 2 }));
    for (const { a, b } of segs.filter((s) => s.a[1] === s.b[1])) {
      for (const gx of a[0] < b[0] ? gapCenters : [...gapCenters].reverse()) if (gx > Math.min(a[0], b[0]) && gx < Math.max(a[0], b[0])) for (const shift of [0, -6, 6, -12, 12]) spots.push({ at: [gx + shift, a[1]], level: true });
    }
    if (drawn.sameLane) {
      for (const { a, b, last } of [...segs].sort((p, q) => dist(q.a, q.b) - dist(p.a, p.b))) {
        const len = dist(a, b) - (last ? HEAD : 0), ux = (b[0] - a[0]) / dist(a, b), uy = (b[1] - a[1]) / dist(a, b);
        for (const shift of [0, -8, 8, -16, 16, -24, 24]) spots.push({ at: [a[0] + ux * (len / 2 + shift), a[1] + uy * (len / 2 + shift)], level: a[1] === b[1] });
      }
    }
    // The verb sits above a mark on a level line, and to the right of a mark on an upright line.
    // When that place is taken, it tries the other side, then the same places with the word moved to one side.
    let placed = null, fewest = Infinity;
    for (const spot of spots) {
      const [mx, my] = spot.at;
      const verbs = spot.level
        ? [{ x: mx, y: my - 19, anchor: "middle" }, { x: mx, y: my + 28, anchor: "middle" }, { x: mx + 12, y: my - 19, anchor: "end" }, { x: mx - 12, y: my - 19, anchor: "start" }, { x: mx + 12, y: my + 28, anchor: "end" }, { x: mx - 12, y: my + 28, anchor: "start" }]
        : [{ x: mx + 16, y: my + 4, anchor: "start" }, { x: mx - 16, y: my + 4, anchor: "end" }];
      for (const verb of verbs) {
        const trial = { ...drawn, mark: spot.at, verb: { ...verb, s: leg.verb, cls: "verb" } };
        const found = check({ ...scene, w: 1e6, h: 1e6, gaps: [], legs: routed.map((other, n) => (n === index ? trial : other)) }).filter((p) => p.leg === leg.n || p.otherLeg === leg.n).length;
        if (found < fewest) { fewest = found; placed = trial; }
        if (!found) break;
      }
      if (!fewest) break;
    }
    if (!placed) { problems.push({ rule: "R2", kind: "mark-none", leg: leg.n, msg: `no place for the mark of leg ${leg.n}` }); break; }
    routed[index] = placed;
    scene.legs = routed;
  }

  const extra = useGutter() ? laneGap + MARGIN : 0;
  lanes.forEach((lane, c) => {
    const x = cardX[c] - MARGIN, w = panelW + (c === count - 1 ? extra : 0);
    scene.bands.push({ x, y: 12, w, h: lastBottom + 16 - 12 });
    if (c) scene.gaps.push({ x: x - laneGap, y: 0, w: laneGap, h: scene.h });
    scene.lanes.push({ icon: lane.icon, iconAt: lane.icon ? [x + 36, 39] : null, text: { x: x + (lane.icon ? 52 : 28), y: 44, s: lane.name, cls: "lane", anchor: "start" } });
  });
  // A verb may sit on the ground beside the last panel; the drawing grows to hold it.
  const verbRight = Math.max(0, ...scene.legs.map((leg) => textBox(leg.verb).x1));
  scene.w = Math.max(cardX[count - 1] + cardW + MARGIN + extra + 12, Math.ceil(verbRight) + 12);
  return { scene, problems: problems.length ? problems : check(scene), order, rowOf };
}

/** Adds room for the first problem. Returns false when no room can fix it. */
function makeRoom(k, problem, model, rowOf) {
  const row = problem.leg ? rowOf.get(model.legs[problem.leg - 1].to) : -1;
  const lane = () => (k.laneGap < 96 ? ((k.laneGap += 8), true) : false);
  const rows = (list, by) => (list.length && list.every((r) => k.rowGap[r] + by <= 96) ? (list.forEach((r) => (k.rowGap[r] += by)), true) : false);
  if (problem.kind === "no-path") return rows(k.rowGap.map((_, r) => r), 16);
  if (problem.kind.startsWith("mark")) return lane() || rows(k.rowGap.map((_, r) => r), 8);
  if (row < 0) return lane();
  return rows([row - 1, row].filter((r) => r >= 0 && r < k.rowGap.length).slice(0, 1), 8) || lane();
}

/** Lays out a Plates drawing. Throws PlatesError when the rules cannot be kept. */
function layoutPlates(model) {
  const k = { rowGap: model.parts.slice(1).map(() => 0), laneGap: 0 };
  let last = null;
  for (let round = 0; round < 200; round++) {
    last = draw(model, k);
    if (!last.problems.length) return last.scene;
    if (!makeRoom(k, last.problems[0], model, last.rowOf)) break;
  }
  throw new PlatesError(last.problems);
}

module.exports = { layoutPlates, PlatesError };
