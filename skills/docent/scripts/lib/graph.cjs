// The graph layout of the UML kinds: nodes in rows, lines with right angles, labels beside the lines.
//   1. Rows. Each node gets a row: the longest path from a start, after the lines that go back are set aside.
//   2. Columns. Each group (a partition, a package, a node of a deployment) owns a range of columns, so a frame
//      never holds a node of another group. Inside a group the nodes of a row are ordered to cut crossings.
//   3. Lines. Everything sits on a 12px lattice. A line walks the free lattice points: shortest, few bends, never on
//      another line, crossing only at a right angle. It leaves a node by a port and ends on a straight stem that is
//      long enough for its end mark (references/DESIGN.md, the spacing rules).
//   4. Labels. Each label takes the first place beside its line that keeps clear of every line, node and label.
// When a step finds no room, the gaps grow and the layout runs again. The result is the same every time.
const uml = require("./uml.cjs");
const { textBox, segSeg, pointSeg, dist } = require("./geometry.cjs");

const U = 12; // the lattice
const BEND = 30, CROSS = 14;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // right, down, left, up
const SIDE = { right: 0, bottom: 1, left: 2, top: 3 };
const up = (v, s = U) => Math.ceil(v / s - 1e-9) * s;

class GraphError extends Error {}

/** A small priority queue: pops the lowest cost; equal costs leave in the order they came. */
class Queue {
  constructor() { this.a = []; this.n = 0; }
  push(c, v) {
    const a = this.a, it = [c, this.n++, v];
    let i = a.push(it) - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] < c || (a[p][0] === c && a[p][1] < it[1])) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        let m = i;
        for (const k of [2 * i + 1, 2 * i + 2]) if (k < a.length && (a[k][0] < a[m][0] || (a[k][0] === a[m][0] && a[k][1] < a[m][1]))) m = k;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

/** Rows: the longest path from a start over the lines that go forward. A line to a node on the current path goes back. */
function rows(g) {
  const n = g.nodes.length, out = g.nodes.map(() => []), back = new Set();
  g.edges.forEach((e, k) => { if (e.a !== e.b && e.a >= 0 && e.b >= 0) out[e.a].push(k); });
  const state = new Array(n).fill(0), done = [];
  const visit = (v) => {
    state[v] = 1;
    for (const k of out[v]) { const w = g.edges[k].b; if (state[w] === 1) back.add(k); else if (!state[w]) visit(w); }
    state[v] = 2; done.push(v);
  };
  for (let v = 0; v < n; v++) if (!state[v]) visit(v);
  const rank = g.nodes.map((node) => node.rank ?? 0);
  for (const v of done.reverse()) for (const k of out[v]) if (!back.has(k)) { const e = g.edges[k]; rank[e.b] = Math.max(rank[e.b], rank[v] + (e.len ?? 1)); }
  return { rank, back };
}

/** Columns: each group owns a range of columns; in each row of a group the nodes are ordered to cut crossings. */
function columns(g, rank) {
  const n = g.nodes.length, R = Math.max(...rank) + 1;
  if (g.nodes.every((node) => node.col != null)) { // a kind that places its nodes itself: each group spans its own columns
    const col = g.nodes.map((node) => node.col), span = new Map();
    g.nodes.forEach((node, v) => { const gr = node.group ?? -1, sp = span.get(gr); span.set(gr, sp ? [Math.min(sp[0], col[v]), Math.max(sp[1], col[v])] : [col[v], col[v]]); });
    return { col, span, C: Math.max(...col) + 1, R };
  }
  const groupOf = g.nodes.map((node) => node.group ?? -1);
  const first = [...new Set(groupOf)]; // groups in the order in which their first node comes
  // Groups that share a frame (the regions of a composite state) stand side by side, so the frame holds only them.
  const frameOf = (gr) => (gr >= 0 && g.groups && g.groups[gr].frame) || null;
  const order = [];
  for (const gr of first) { if (order.includes(gr)) continue; const f = frameOf(gr); order.push(...(f ? first.filter((o) => frameOf(o) === f) : [gr])); }
  const near = g.nodes.map(() => []);
  for (const e of g.edges) if (e.a >= 0 && e.b >= 0 && e.a !== e.b) { near[e.a].push(e.b); near[e.b].push(e.a); }
  const lists = new Map(); // "group:row" -> nodes in order
  for (let v = 0; v < n; v++) { const k = `${groupOf[v]}:${rank[v]}`; if (!lists.has(k)) lists.set(k, []); lists.get(k).push(v); }
  const width = (gr) => Math.max(1, ...[...lists].filter(([k]) => k.split(":")[0] === String(gr)).map(([, l]) => l.length));
  const offsets = () => { const o = new Map(); let x = 0; for (const gr of order) { o.set(gr, x); x += width(gr); } return o; };
  const col = new Array(n).fill(0);
  const place = () => {
    const off = offsets();
    for (const [k, list] of lists) {
      const gr = Number(k.split(":")[0]), w = width(gr), skip = Math.floor((w - list.length) / 2);
      list.forEach((v, i) => (col[v] = off.get(gr) + skip + i));
    }
  };
  place();
  // Barycenter passes, down and up, a fixed number of times.
  for (let pass = 0; pass < 6; pass++) {
    const down = pass % 2 === 0;
    for (let r0 = 0; r0 < R; r0++) {
      const r = down ? r0 : R - 1 - r0;
      for (const [k, list] of lists) {
        if (Number(k.split(":")[1]) !== r) continue;
        const bary = (v) => { const ns = near[v].filter((w) => (down ? rank[w] < r : rank[w] > r)); return ns.length ? ns.reduce((s, w) => s + col[w], 0) / ns.length : col[v]; };
        const b = new Map(list.map((v) => [v, bary(v)]));
        list.sort((p, q) => b.get(p) - b.get(q) || col[p] - col[q]);
        // Each node goes to the column nearest its neighbors, in order, inside its group.
        const off = offsets().get(Number(k.split(":")[0])), w = width(Number(k.split(":")[0]));
        const c = list.map((v) => Math.min(w - 1, Math.max(0, Math.round(b.get(v) - off))));
        for (let i = 1; i < c.length; i++) c[i] = Math.max(c[i], c[i - 1] + 1);
        for (let i = c.length - 1; i >= 0; i--) c[i] = Math.min(c[i], i === c.length - 1 ? w - 1 : c[i + 1] - 1);
        list.forEach((v, i) => (col[v] = off + c[i]));
      }
    }
  }
  g.nodes.forEach((node, v) => { if (node.col != null) col[v] = node.col; });
  const off = offsets();
  const span = new Map(order.map((gr) => [gr, [off.get(gr), off.get(gr) + width(gr) - 1]]));
  return { col, span, C: Math.max(...col, ...[...span.values()].map((s) => s[1])) + 1, R };
}

/** The point where a line meets the visible node, for a port on a side at an offset from the center. */
function hit(node, side, off) {
  if (node.hit) return node.hit(side, off, node);
  const { cx, cy, w, h } = node;
  if (node.round) { // an oval: the point on the ellipse
    const a = w / 2, b = h / 2;
    if (side === "top" || side === "bottom") return [cx + off, cy + (side === "top" ? -1 : 1) * b * Math.sqrt(Math.max(0, 1 - (off / a) ** 2))];
    return [cx + (side === "left" ? -1 : 1) * a * Math.sqrt(Math.max(0, 1 - (off / b) ** 2)), cy + off];
  }
  return { top: [cx + off, cy - h / 2], bottom: [cx + off, cy + h / 2], left: [cx - w / 2, cy + off], right: [cx + w / 2, cy + off] }[side];
}

/**
 * Lays out a graph. g: { nodes, edges, groups, lanes? } (see layoutGraph). k: the extra room, in lattice steps.
 * Returns the scene parts: node centers, routed lines, placed labels and group rectangles. Throws GraphError.
 */
function draw(g, k) {
  const { nodes, edges, groups } = g;
  const { rank, back } = g.rows || rows(g);
  const { col, span, C, R } = columns(g, rank);
  const boxes = groups.map((gr, i) => ({ i, ...gr })).filter((gr) => gr.kind === "box");
  const lanes = groups.map((gr, i) => ({ i, ...gr })).filter((gr) => gr.kind === "lane");
  // The size of each column and row: room for its largest node, in steps of 24 so that every center is on the lattice.
  const rw = nodes.map((v) => up(v.w, 2 * U)), rh = nodes.map((v) => up(v.h, 2 * U));
  const colW = Array.from({ length: C }, (_, c) => Math.max(2 * U, ...nodes.map((_, v) => (col[v] === c ? rw[v] : 0))));
  const rowH = Array.from({ length: R }, (_, r) => Math.max(2 * U, ...nodes.map((_, v) => (rank[v] === r ? rh[v] : 0))));
  // A loop on one node needs room at its right; a box needs room for its frame and its name.
  const loopRoom = new Array(C + 1).fill(0);
  edges.forEach((e) => { if (e.a === e.b && e.a >= 0) loopRoom[col[e.a] + 1] = Math.max(loopRoom[col[e.a] + 1], 60 + Math.max(0, ...e.labels.map((l) => textBox({ x: 0, y: 0, s: l.s, cls: l.cls || "verb" }).x1)) + 12); });
  const boxRows = (b) => { const m = nodes.map((_, v) => v).filter((v) => nodes[v].group === b.i); return [Math.min(...m.map((v) => rank[v])), Math.max(...m.map((v) => rank[v]))]; };
  const gut = Array.from({ length: C + 1 }, (_, c) => {
    let w = c === 0 || c === C ? 3 * U + k.edge : 6 * U + k.gap;
    for (const b of boxes) { const [c0, c1] = span.get(b.i); if (c0 === c) w += 2 * U; if (c1 + 1 === c) w += 2 * U; }
    return up(w + loopRoom[c]);
  });
  // A box is at least as wide as its name; the room it lacks goes into the gap after it.
  for (const b of boxes) {
    if (b.frame) continue;
    const [c0, c1] = span.get(b.i);
    let wide = 4 * U;
    for (let c = c0; c <= c1; c++) wide += colW[c] + (c > c0 ? gut[c] : 0);
    const lack = (b.nameW || 0) + 28 - wide;
    if (lack > 0) gut[c1 + 1] += up(lack);
  }
  const head = lanes.length ? 4 * U : 0; // the lane names
  const chan = Array.from({ length: R + 1 }, (_, r) => {
    let h = r === 0 || r === R ? 3 * U + k.edge : 6 * U + k.gap + (k.rows[r] || 0);
    for (const b of boxes) { const [r0, r1] = boxRows(b); if (r0 === r) h += 4 * U; if (r1 + 1 === r) h += 2 * U; }
    return up(h);
  });
  const colX = [], rowY = [];
  let x = 0; for (let c = 0; c < C; c++) { x += gut[c]; colX.push(x); x += colW[c]; }
  const W = x + gut[C];
  let y = head; for (let r = 0; r < R; r++) { y += chan[r]; rowY.push(y); y += rowH[r]; }
  const H = y + chan[R];
  const placed = nodes.map((v, i) => {
    const cx = colX[col[i]] + colW[col[i]] / 2, cy = rowY[rank[i]] + rowH[rank[i]] / 2;
    return { ...v, i, cx, cy, x0: cx - rw[i] / 2, x1: cx + rw[i] / 2, y0: cy - rh[i] / 2, y1: cy + rh[i] / 2 };
  });
  // Group rectangles, on the lattice.
  const rects = groups.map((gr, i) => {
    const [c0, c1] = span.get(i) || [0, 0];
    if (gr.kind === "lane") return { x0: colX[c0] - gut[c0] / 2 + U / 2, x1: colX[c1] + colW[c1] + gut[c1 + 1] / 2 - U / 2, y0: U, y1: H - U };
    const m = placed.filter((v) => v.group === i);
    const x0 = Math.min(...m.map((v) => v.x0)) - 2 * U;
    return { x0, x1: Math.max(Math.max(...m.map((v) => v.x1)) + 2 * U, gr.frame ? 0 : x0 + up((gr.nameW || 0) + 28)), y0: Math.min(...m.map((v) => v.y0)) - 4 * U, y1: Math.max(...m.map((v) => v.y1)) + 2 * U };
  });
  // Groups that share a frame (the regions of a composite state) get one frame around them all, with a dashed line between.
  const lead = groups.map((_, i) => i), dividers = groups.map(() => []);
  for (const key of new Set(groups.map((gr) => gr.frame).filter(Boolean))) {
    const members = groups.map((gr, i) => i).filter((i) => groups[i].frame === key).sort((a, b) => rects[a].x0 - rects[b].x0);
    const own = members.map((i) => rects[i]);
    const union = { x0: Math.min(...own.map((r) => r.x0)), x1: Math.max(...own.map((r) => r.x1)), y0: Math.min(...own.map((r) => r.y0)), y1: Math.max(...own.map((r) => r.y1)) };
    for (const i of members) { rects[i] = union; lead[i] = members[0]; }
    for (let n = 1; n < own.length; n++) dividers[members[0]].push(up((own[n - 1].x1 + own[n].x0) / 2));
    groups[members[0]] = { ...groups[members[0]], dividers: dividers[members[0]] };
  }

  // The lattice: each point is free, blocked (inside a node or a name), or used by a line along one axis or both.
  const nx = Math.floor(W / U) + 1, ny = Math.floor(H / U) + 1;
  const P = (i, j) => j * nx + i;
  const blocked = new Uint8Array(nx * ny), use = new Uint8Array(nx * ny), hUsed = new Uint8Array(nx * ny), vUsed = new Uint8Array(nx * ny);
  const block = (x0, y0, x1, y1) => { for (let j = Math.max(0, Math.ceil(y0 / U)); j <= Math.min(ny - 1, Math.floor(y1 / U)); j++) for (let i = Math.max(0, Math.ceil(x0 / U)); i <= Math.min(nx - 1, Math.floor(x1 / U)); i++) blocked[P(i, j)] = 1; };
  for (const v of placed) block(v.x0, v.y0, v.x1, v.y1);
  if (head) block(0, 0, W, head + U);
  const names = [];
  rects.forEach((r, i) => {
    if (groups[i].kind !== "box" || lead[i] !== i) return;
    for (const dx of dividers[i]) for (let j2 = r.y0 / U; j2 <= r.y1 / U; j2++) { use[P(dx / U, j2)] = use[P(dx / U, j2)] ? 3 : 2; if (j2 < r.y1 / U) vUsed[P(dx / U, j2)] = 1; }
    // The frame is a line: a line may cross it at a right angle, and never run along it.
    const [i0, i1, j0, j1] = [r.x0 / U, r.x1 / U, r.y0 / U, r.y1 / U];
    for (let i2 = i0; i2 <= i1; i2++) { use[P(i2, j0)] = use[P(i2, j0)] ? 3 : 1; use[P(i2, j1)] = use[P(i2, j1)] ? 3 : 1; if (i2 < i1) { hUsed[P(i2, j0)] = 1; hUsed[P(i2, j1)] = 1; } }
    for (let j2 = j0; j2 <= j1; j2++) { use[P(i0, j2)] = use[P(i0, j2)] ? 3 : 2; use[P(i1, j2)] = use[P(i1, j2)] ? 3 : 2; if (j2 < j1) { vUsed[P(i0, j2)] = 1; vUsed[P(i1, j2)] = 1; } }
    for (const c of [[i0, j0], [i1, j0], [i0, j1], [i1, j1]]) use[P(...c)] = 3;
    const name = { x0: r.x0 + 4, y0: r.y0 + 4, x1: r.x0 + 16 + (groups[i].nameW || 0), y1: r.y0 + 3 * U };
    names.push(name);
    block(name.x0, name.y0, name.x1 + 6, name.y1);
  });
  const axis = (d) => (d % 2 === 0 ? 1 : 2);
  const pass = (p, din, dout) => { const u = use[p]; if (!u) return true; return din === dout && u !== 3 && u !== axis(din); };
  const stepFree = (i, j, d) => {
    const ni = i + DIRS[d][0], nj = j + DIRS[d][1];
    if (ni < 0 || nj < 0 || ni >= nx || nj >= ny || blocked[P(ni, nj)]) return false;
    return d === 0 ? !hUsed[P(i, j)] : d === 2 ? !hUsed[P(ni, nj)] : d === 1 ? !vUsed[P(i, j)] : !vUsed[P(i, nj)];
  };
  const markStep = (i, j, d) => { const ni = i + DIRS[d][0], nj = j + DIRS[d][1]; if (d === 0) hUsed[P(i, j)] = 1; else if (d === 2) hUsed[P(ni, nj)] = 1; else if (d === 1) vUsed[P(i, j)] = 1; else vUsed[P(i, nj)] = 1; };
  const portUsed = new Set();
  const bus = new Map(); // bus name -> the lattice points of its lines so far, where a later line of the bus may branch off

  /** The ports of an end: on the lattice, on the border of the node's room (or of the group's frame). */
  function ports(end, toward, isEnd, edge) {
    const out = [];
    const r = end.group != null ? rects[end.group] : placed[end.node];
    const node = end.group != null ? null : placed[end.node];
    const sides = node && node.ports === "tb" ? ["top", "bottom"] : node && node.ports === "lr" ? ["left", "right"] : ["top", "bottom", "left", "right"];
    for (const side of sides) {
      const d = SIDE[side];
      const horiz = side === "top" || side === "bottom";
      const lo = horiz ? r.x0 : r.y0, hi = horiz ? r.x1 : r.y1, mid = node ? (horiz ? node.cx : node.cy) : (lo + hi) / 2;
      const offs = node && node.ports === "mid" ? [0] : [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6].map((s) => s * 2 * U); // 24px apart, so two arrowheads never touch
      for (const off of offs) {
        const at = up(mid + off - U / 2) ; // the lattice line nearest the middle
        const a = node && node.ports === "mid" ? mid : at;
        if (a <= lo + U - 1e-6 || a >= hi - U + 1e-6) continue;
        if (end.group != null && side === "top" && names.some((nm) => a >= nm.x0 - U && a <= nm.x1 + U)) continue;
        if (end.group != null && horiz && dividers[lead[end.group]].some((dx) => Math.abs(a - dx) < 2 * U)) continue; // never on a region's dashed line
        const pt = horiz ? [a, side === "top" ? r.y0 : r.y1] : [side === "left" ? r.x0 : r.x1, a];
        const vis = node ? hit(node, side, horiz ? a - node.cx : a - node.cy) : pt;
        const gap = dist(pt, vis);
        const need = isEnd && edge.end ? uml.END[edge.end].len + 28 + 1 : 0;
        const L = Math.max(U, up(need - gap));
        // The side that faces the other end costs nothing; the sides across cost a little; the far side costs more.
        const want = toward[d];
        out.push({ side, d, pt, vis, L, pen: want + Math.abs(a - mid) * 1.2 });
      }
    }
    return out;
  }
  /** The lattice points of a stem, from the port out to its end, or null when the stem is not free. */
  function stem(port) {
    let i = Math.round(port.pt[0] / U), j = Math.round(port.pt[1] / U);
    if (portUsed.has(P(i, j))) return null;
    const list = [[i, j]];
    for (let s = 0; s < port.L / U; s++) {
      if (s > 0 && !pass(P(i, j), port.d, port.d)) return null;
      if (!stepFree(i, j, port.d)) return null;
      i += DIRS[port.d][0]; j += DIRS[port.d][1];
      list.push([i, j]);
    }
    if (use[P(i, j)]) return null;
    return list;
  }
  /** Which side faces the other end: a cost for each direction. */
  function facing(a, b, isBack) {
    const t = [40, 40, 40, 40];
    if (isBack) { t[SIDE.right] = 0; t[SIDE.top] = 30; t[SIDE.bottom] = 30; return t; }
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    if (Math.abs(dy) > U) { t[dy > 0 ? SIDE.bottom : SIDE.top] = 0; t[dy > 0 ? SIDE.top : SIDE.bottom] = 80; t[SIDE.left] = t[SIDE.right] = 30; }
    else { t[dx > 0 ? SIDE.right : SIDE.left] = 0; t[dx > 0 ? SIDE.left : SIDE.right] = 80; }
    return t;
  }
  const center = (end) => (end.group != null ? { cx: (rects[end.group].x0 + rects[end.group].x1) / 2, cy: (rects[end.group].y0 + rects[end.group].y1) / 2 } : placed[end.node]);
  const endOf = (v) => (v >= 0 ? { node: v } : { group: -v - 1 });

  function route(e, isBack) {
    const A = endOf(e.a), B = endOf(e.b), ca = center(A), cb = center(B);
    const starts = ports(A, facing(ca, cb, isBack), false, e).map((p) => ({ p, s: stem(p) })).filter((x) => x.s);
    // A line of a bus may also start on a straight run of an earlier line of the same bus, at a right angle to it.
    for (const [i, j] of (e.bus && bus.get(e.bus)) || []) {
      const p = P(i, j), u = use[p];
      if (u !== 2 || portUsed.has(p)) continue; // only off an upright run, so the bus is a comb
      for (const d of [0, 2]) starts.push({ p: { d, pt: [i * U, j * U], vis: [i * U, j * U], L: 0, pen: 0, branch: true }, s: [[i, j]] });
    }
    const goals = new Map();
    for (const p of ports(B, isBack ? facing(cb, ca, true) : facing(cb, ca, false), true, e)) {
      const s = stem(p);
      if (!s) continue;
      const [i, j] = s[s.length - 1];
      if (!goals.has(P(i, j))) goals.set(P(i, j), []);
      goals.get(P(i, j)).push({ p, s });
    }
    const N = nx * ny * 4;
    const cost = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    const q = new Queue();
    for (const st of starts) {
      const [i, j] = st.s[st.s.length - 1], id = P(i, j) * 4 + st.p.d, c = st.p.pen + st.p.L;
      if (c < cost[id]) { cost[id] = c; prev[id] = -2 - starts.indexOf(st); q.push(c, id); }
    }
    let best = null;
    while (q.size) {
      const [c, , id] = q.pop();
      if (best && c >= best.c) break;
      if (c > cost[id]) continue;
      const p = id >> 2, d = id & 3, i = p % nx, j = (p - i) / nx;
      for (const gl of goals.get(p) || []) {
        const into = (gl.p.d + 2) % 4;
        if (d === gl.p.d || !pass(p, d, into)) continue;
        const total = c + gl.p.pen + gl.p.L + (d === into ? 0 : BEND);
        if (!best || total < best.c) best = { c: total, gl, id };
      }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === (d + 2) % 4 || !pass(p, d, nd) || !stepFree(i, j, nd)) continue;
        const np = P(i + DIRS[nd][0], j + DIRS[nd][1]);
        const nc = c + U + (nd === d ? 0 : BEND) + (use[np] ? CROSS : 0);
        const nid = np * 4 + nd;
        if (nc < cost[nid]) { cost[nid] = nc; prev[nid] = id; q.push(nc, nid); }
      }
    }
    if (!best) return null;
    const walk = [];
    let id = best.id;
    while (id >= 0) { walk.push(id); id = prev[id]; }
    const st = starts[-2 - id];
    walk.reverse();
    // Mark the lattice: the start stem, the walk, the end stem. Behind an end mark nothing may cross.
    const pts = [st.p.vis, ...st.s.map(([i, j]) => [i * U, j * U])];
    const lat = st.s.map(([i, j]) => [i, j]);
    for (const w of walk.slice(1)) { const p = w >> 2, i = p % nx; lat.push([i, (p - i) / nx]); }
    const gs = best.gl.s.slice().reverse();
    for (const pt of gs.slice(1)) lat.push(pt);
    for (let n = 0; n + 1 < lat.length; n++) {
      const [i, j] = lat[n], [i2, j2] = lat[n + 1];
      const d = i2 > i ? 0 : j2 > j ? 1 : i2 < i ? 2 : 3;
      markStep(i, j, d);
    }
    lat.forEach(([i, j], n) => {
      const p = P(i, j);
      if (n === 0 || n === lat.length - 1) { portUsed.add(p); return; }
      const [a, b] = [lat[n - 1], lat[n + 1]];
      const din = lat[n][0] > a[0] ? 0 : lat[n][1] > a[1] ? 1 : lat[n][0] < a[0] ? 2 : 3;
      const dout = b[0] > lat[n][0] ? 0 : b[1] > lat[n][1] ? 1 : b[0] < lat[n][0] ? 2 : 3;
      use[p] = din !== dout || use[p] ? 3 : axis(din);
    });
    for (const [i, j] of gs.slice(1)) use[P(i, j)] = 3; // the end stem
    if (st.p.branch) use[P(...lat[0])] = 3; // where a line of a bus branches off, nothing else may cross
    if (e.bus) { if (!bus.has(e.bus)) bus.set(e.bus, []); bus.get(e.bus).push(...lat.slice(1, -gs.length - 1)); }
    const all = [...lat.map(([i, j]) => [i * U, j * U])];
    all.unshift(st.p.vis); all.push(best.gl.p.vis);
    return simplify(all);
  }

  // Loops on one node first: out of the right side and back in, below.
  const legs = edges.map(() => null);
  edges.forEach((e, n) => {
    if (e.a !== e.b) return;
    const v = placed[e.a];
    if (v.y1 - v.y0 < 4 * U) throw new GraphError(`the node "${v.id}" is too short for a line to itself`);
    const ya = v.cy - U, yb = v.cy + U, x1 = v.x1, L = 4 * U;
    const pts = [hit(v, "right", -U), [x1, ya], [x1 + L, ya], [x1 + L, yb], [x1, yb], hit(v, "right", U)];
    for (let j = ya / U; j <= yb / U; j++) use[P((x1 + L) / U, j)] = 3;
    for (let i = x1 / U; i <= (x1 + L) / U; i++) { use[P(i, ya / U)] = 3; use[P(i, yb / U)] = 3; }
    portUsed.add(P(x1 / U, ya / U)); portUsed.add(P(x1 / U, yb / U));
    legs[n] = simplify(pts);
  });
  // Then the other lines: the shortest first, each over the lattice that the lines before it left free.
  const todo = edges.map((e, n) => n).filter((n) => edges[n].a !== edges[n].b);
  const reach = (n) => { const e = edges[n]; const a = center(endOf(e.a)), b = center(endOf(e.b)); return Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy); };
  // The lines of a bus go first, the farthest first, so the nearer ones can branch off its trunk.
  todo.sort((p, q) => (edges[p].first ? 0 : 1) - (edges[q].first ? 0 : 1) || (edges[p].bus ? 0 : 1) - (edges[q].bus ? 0 : 1) || (edges[p].bus ? reach(q) - reach(p) : reach(p) - reach(q)) || p - q);
  for (const n of todo) {
    const pts = route(edges[n], back.has(n));
    if (!pts) throw new GraphError(`no free path for the line from "${label(edges[n].a)}" to "${label(edges[n].b)}"`, { cause: { grow: "gap" } });
    legs[n] = pts;
  }
  function label(v) { return v >= 0 ? nodes[v].id : groups[-v - 1].id; }

  // Labels: the first free place beside the line, near the end it belongs to.
  const segs = legs.flatMap((pts, n) => pts.slice(0, -1).map((p, i) => ({ n, a: p, b: pts[i + 1] })));
  const solid = [...placed.map((v) => ({ x0: v.cx - v.w / 2, y0: v.cy - v.h / 2, x1: v.cx + v.w / 2, y1: v.cy + v.h / 2 })), ...names];
  for (const t of g.texts || []) solid.push(textBox(t));
  const frames = rects.filter((_, i) => groups[i].kind === "box");
  const frameSegs = frames.flatMap((r) => [[[r.x0, r.y0], [r.x1, r.y0]], [[r.x1, r.y0], [r.x1, r.y1]], [[r.x1, r.y1], [r.x0, r.y1]], [[r.x0, r.y1], [r.x0, r.y0]]]);
  rects.forEach((r, i) => { for (const dx of dividers[i]) frameSegs.push([[dx, r.y0], [dx, r.y1]]); });
  const texts = [];
  const free = (box) => {
    if (box.x0 < 4 || box.y0 < 4 || box.x1 > W - 4 || box.y1 > H - 4) return false;
    if (head && box.y0 < head + 4) return false;
    if (segs.some((s) => rectSeg(box, s.a, s.b) < 6)) return false;
    if (frameSegs.some(([a, b]) => rectSeg(box, a, b) < 4)) return false;
    if (solid.some((r) => rectRect(box, r) < 6)) return false;
    return !texts.some((t) => rectRect(box, t.box) < 6);
  };
  const labelled = edges.map(() => []);
  edges.forEach((e, n) => {
    for (const lb of e.labels) {
      const pts = legs[n];
      const order = lb.at === "end" ? pts.map((_, i) => pts.length - 2 - i).filter((i) => i >= 0) : lb.at === "start" ? pts.slice(0, -1).map((_, i) => i) : middleFirst(pts);
      const cls = lb.cls || "verb";
      let done = null;
      for (const i of order) {
        const [a, b] = [pts[i], pts[i + 1]];
        const len = dist(a, b);
        if (len < 1) continue;
        const fr = lb.at === "end" ? [0.75, 0.5, 0.9, 0.3, 0.1] : lb.at === "start" ? [0.25, 0.5, 0.1, 0.7, 0.9] : [0.5, 0.3, 0.7, 0.15, 0.85];
        for (const f of fr) {
          const m = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          const tries = a[0] === b[0]
            ? [{ x: m[0] + 8, y: m[1] + 4, anchor: "start" }, { x: m[0] - 8, y: m[1] + 4, anchor: "end" }]
            : [{ x: m[0], y: m[1] - 8, anchor: "middle" }, { x: m[0], y: m[1] + 17, anchor: "middle" }];
          for (const t of tries) { const tx = { ...t, s: lb.s, cls }; const box = textBox(tx); if (free(box)) { done = { t: tx, box }; break; } }
          if (done) break;
        }
        if (done) break;
      }
      if (!done) throw new GraphError(`no room beside its line for the label "${lb.s}"`, { cause: { grow: "gap" } });
      texts.push(done);
      labelled[n].push(done.t);
    }
  });
  return { W, H, placed, rects, lead, legs, labels: labelled, names, head, lanes, colX, rowY, back, rank, col };
}

const middleFirst = (pts) => { const n = pts.length - 1, m = Math.floor((n - 1) / 2), out = [m]; for (let s = 1; out.length < n; s++) { if (m + s < n) out.push(m + s); if (m - s >= 0) out.push(m - s); } return out; };
const simplify = (pts) => pts.filter((p, i) => {
  if (i === 0 || i === pts.length - 1) return true;
  const a = pts[i - 1], b = pts[i + 1];
  if (Math.abs(p[0] - a[0]) < 1e-6 && Math.abs(p[1] - a[1]) < 1e-6) return false;
  return !((Math.abs(a[0] - p[0]) < 1e-6 && Math.abs(p[0] - b[0]) < 1e-6) || (Math.abs(a[1] - p[1]) < 1e-6 && Math.abs(p[1] - b[1]) < 1e-6));
});
const rectSeg = (r, a, b) => {
  const inR = (p) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1;
  if (inR(a) || inR(b)) return 0;
  const e = [[[r.x0, r.y0], [r.x1, r.y0]], [[r.x1, r.y0], [r.x1, r.y1]], [[r.x1, r.y1], [r.x0, r.y1]], [[r.x0, r.y1], [r.x0, r.y0]]];
  return Math.min(...e.map(([c, d]) => segSeg(a, b, c, d)));
};
const rectRect = (p, q) => Math.hypot(Math.max(0, p.x0 - q.x1, q.x0 - p.x1), Math.max(0, p.y0 - q.y1, q.y0 - p.y1));

/** The spacing rules for a graph drawing. Returns a list of problems; an empty list means the drawing is good. */
function checkGraph(out, edges) {
  const bad = [];
  const { placed, legs, labels, W, H } = out;
  const vis = (v) => ({ x0: v.cx - v.w / 2, y0: v.cy - v.h / 2, x1: v.cx + v.w / 2, y1: v.cy + v.h / 2 });
  legs.forEach((pts, n) => {
    const e = edges[n];
    if (e.end) { const last = dist(pts[pts.length - 1], pts[pts.length - 2]); if (last < uml.END[e.end].len + 28 - 0.01) bad.push(`line ${n + 1}: the straight run behind its end mark is ${Math.round(last)}px`); }
    for (const v of placed) {
      if (v.i === e.a || v.i === e.b) continue;
      for (let i = 0; i + 1 < pts.length; i++) if (rectSeg(vis(v), pts[i], pts[i + 1]) < 8) bad.push(`line ${n + 1} runs over or too close to "${v.id}"`);
    }
    legs.forEach((qts, m) => {
      if (m <= n) return;
      for (let i = 0; i + 1 < pts.length; i++) for (let j = 0; j + 1 < qts.length; j++) {
        const [p, q, r, s] = [pts[i], pts[i + 1], qts[j], qts[j + 1]];
        const d = segSeg(p, q, r, s);
        if (d >= 8) continue;
        // Lines from or to the same node may meet at that node's border only.
        if (e.bus && e.bus === edges[m].bus) continue; // lines of one bus share their trunk
        const shared = [e.a, e.b].filter((x) => x === edges[m].a || x === edges[m].b);
        if (shared.length && (i === 0 || i === pts.length - 2) && (j === 0 || j === qts.length - 2) && d >= 4) continue;
        const vert = (u, w) => Math.abs(u[0] - w[0]) < 1e-6;
        const clean = d === 0 && vert(p, q) !== vert(r, s) && Math.min(pointSeg(p, r, s), pointSeg(q, r, s), pointSeg(r, p, q), pointSeg(s, p, q)) >= 8;
        if (!clean) bad.push(`lines ${n + 1} and ${m + 1} touch or run too close`);
      }
    });
  });
  const boxes = labels.flatMap((list) => list.map((t) => textBox(t)));
  boxes.forEach((b, i) => {
    if (b.x0 < 4 || b.y0 < 4 || b.x1 > W - 4 || b.y1 > H - 4) bad.push("a label is outside the drawing");
    for (const pts of legs) for (let k = 0; k + 1 < pts.length; k++) if (rectSeg(b, pts[k], pts[k + 1]) < 6 - 0.01) bad.push("a label is on or too close to a line");
    for (const v of placed) if (rectRect(b, vis(v)) < 6 - 0.01) bad.push(`a label is too close to "${v.id}"`);
    for (const c of boxes.slice(i + 1)) if (rectRect(b, c) < 6 - 0.01) bad.push("two labels overlap");
  });
  return [...new Set(bad)];
}

/**
 * Lays out a graph and returns a scene that toSvg draws.
 * g.nodes: [{ id, w, h, group?, rank?, col?, ports?: "mid" | "tb" | "lr", round?, hit?, draw(cx, cy) -> { svg, texts } }]
 * g.edges: [{ from, to, end?, dashed?, labels?: [{ s, at?: "start" | "mid" | "end", cls? }], still?, len?, up?, first? }]
 *   from and to are node ids, or group ids for a line to a whole frame. up: the line points up, so in the rows its
 *   end comes first (a generalization, a composition). first: route this line before the others (the main path).
 *   step: the place of a moving line on the main path, so the dot travels the lines in that order.
 *   bus: lines with the same bus name may branch off one another, as a comb (the associations of one actor).
 * g.groups: [{ id, name, kind: "lane" | "box" | "free", draw?(rect) -> { svg, texts } }]. A free group only owns its columns.
 * When every node has both rank and col, the nodes stay where they are given.
 */
function layoutGraph(g, form) {
  const idx = new Map(g.nodes.map((v, i) => [v.id, i]));
  const gidx = new Map((g.groups || []).map((gr, i) => [gr.id, i]));
  const at = (id) => (idx.has(id) ? idx.get(id) : gidx.has(id) ? -gidx.get(id) - 1 : -Infinity);
  const groups = (g.groups || []).map((gr) => ({ ...gr, nameW: gr.name ? textBox({ x: 0, y: 0, s: gr.name, cls: gr.kind === "lane" ? "lane" : "name" }).x1 : 0 }));
  const nodes = g.nodes.map((v) => ({ ...v, group: v.group == null ? undefined : gidx.get(v.group) }));
  const edges = g.edges.map((e) => ({ ...e, labels: e.labels || [], a: at(e.from), b: at(e.to) }));
  // In the rows, a line to a group counts as a line to its first node; a line that points up counts the other way round.
  // A line into a frame counts as a line to each node of the frame that nothing inside leads to (its starts); a line
  // out of a frame counts as a line from each node that leads nowhere inside (its ends). So a frame's regions start together.
  const frameOfGroup = (gi) => (groups[gi].frame ? groups.map((gr, i) => i).filter((i) => groups[i].frame === groups[gi].frame) : [gi]);
  const inside = (gi) => nodes.map((n, i) => i).filter((i) => frameOfGroup(gi).includes(nodes[i].group));
  const ends = (v, out) => {
    if (v >= 0) return [v];
    const m = inside(-v - 1), within = edges.filter((e) => m.includes(e.a) && m.includes(e.b) && e.a !== e.b);
    const list = m.filter((i) => !within.some((e) => (out ? e.a : e.b) === i));
    return list.length ? list : [m[0]];
  };
  const rowEdges = [], owner = [];
  edges.forEach((e, n) => {
    const [a, b] = e.up ? [e.b, e.a] : [e.a, e.b];
    for (const x of ends(a, true)) for (const y of ends(b, false)) { rowEdges.push({ ...e, a: x, b: y }); owner.push(n); }
  });
  // A kind that places its nodes itself gives every node its row and column; no line then counts as going back.
  const fixed = nodes.every((v) => v.rank != null && v.col != null);
  const R0 = fixed ? { rank: nodes.map((v) => v.rank), back: new Set() } : rows({ nodes, edges: rowEdges });
  const R = { rank: R0.rank, back: new Set([...R0.back].map((k) => owner[k])) };
  // A line that the rows count backwards, and that is not drawn upward on purpose, goes back.
  const back = new Set([...R.back].filter((n) => !edges[n].up));
  const k = { gap: 0, edge: 0, rows: [] };
  let last;
  for (let tries = 0; tries < 6; tries++) {
    try {
      const out = draw({ nodes, edges, groups, rows: { rank: R.rank, back }, texts: g.texts }, k);
      const problems = checkGraph(out, edges);
      if (problems.length) throw new GraphError(problems[0], { cause: { grow: "gap" } });
      return scene(out, nodes, edges, groups, form);
    } catch (error) {
      if (!(error instanceof GraphError)) throw error;
      last = error;
      k.gap += 2 * U; k.edge += U;
    }
  }
  throw new GraphError(`the ${form} diagram cannot be drawn within the spacing rules: ${last.message}`);
}

/** The scene for toSvg: parts with their own marks, lines in UML notation, lanes as bands and frames under the rest. */
function scene(out, nodes, edges, groups, form) {
  const s = { form, uml: true, hideMarks: true, w: out.W, h: out.H, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  out.rects.forEach((r, i) => {
    const gr = groups[out.lead[i]];
    if (out.lead[i] !== i || gr.kind === "free") return; // a region: its frame is drawn once, by the first region. A free group has no frame
    if (gr.kind === "lane") {
      s.bands.push({ x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 });
      s.lanes.push({ text: { x: (r.x0 + r.x1) / 2, y: r.y0 + 28, s: gr.name, cls: "lane", anchor: "middle" } });
    } else {
      const made = gr.draw ? gr.draw({ x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 }, gr.dividers || []) : { svg: `<rect x="${r.x0}" y="${r.y0}" width="${r.x1 - r.x0}" height="${r.y1 - r.y0}" class="u-frame"/>`, texts: [{ x: r.x0 + 12, y: r.y0 + 22, s: gr.name, cls: "name", anchor: "start" }] };
      s.under.push(made.svg);
      s.notes.push(...made.texts);
    }
  });
  for (const v of out.placed) {
    const made = v.draw(v.cx, v.cy);
    s.parts.push({ id: v.id, shape: "raw", svg: made.svg, texts: made.texts, x: v.cx - v.w / 2, y: v.cy - v.h / 2, w: v.w, h: v.h });
  }
  // The lines that move come first, in order, so the dot travels them; the others keep still.
  const order = edges.map((e, n) => n).sort((p, q) => (edges[p].still ? 1 : 0) - (edges[q].still ? 1 : 0) || (edges[p].step ?? p) - (edges[q].step ?? q) || p - q); // the moving lines in the order of the main path
  for (const n of order) {
    const e = edges[n];
    s.legs.push({ n: n + 1, from: e.from, to: e.to, pts: out.legs[n], still: Boolean(e.still), u: { end: e.end || null, dashed: Boolean(e.dashed) }, texts: out.labels[n], verb: { s: "" }, mark: out.legs[n][0] });
  }
  return s;
}

/** Splits a text into lines no wider than room, at spaces. A single word wider than room keeps its own line. */
function wrap(str, cls, room) {
  const out = [];
  for (const word of String(str).split(" ")) {
    const last = out.length ? `${out[out.length - 1]} ${word}` : word;
    if (out.length && textBox({ x: 0, y: 0, s: last, cls }).x1 <= room) out[out.length - 1] = last;
    else out.push(word);
  }
  return out;
}

/**
 * The column form for phones and paper: the nodes one under another, on one axis. A node whose only line goes to the
 * next node gets an arrow; every other line is a row under its node: a short line with its UML end, its label, and
 * where it goes. Nodes of one group sit in a band with the group's name.
 * items: [{ node, group?, arrow?: { end, dashed, label }, rows: [{ end, dashed, back?, label?, target }] }]
 */
function layoutColumnGraph(items, form) {
  const banded = items.some((it) => it.group);
  const left = banded ? 32 : 20;
  const maxW = Math.max(48, ...items.map((it) => it.node.w));
  const axis = left + maxW / 2;
  const s = { form, uml: true, hideMarks: true, w: 0, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  let y = banded ? 8 : 16, right = left + maxW, band = null, n = 0;
  const close = () => { if (band) { band.h = y + 8 - band.y; s.bands.push(band); y += 20; band = null; } };
  items.forEach((it, k) => {
    if (banded && (!band || band.name !== it.group)) {
      close();
      if (it.group) { band = { x: 8, y, w: 0, h: 0, name: it.group }; s.notes.push({ x: 20, y: y + 18, s: it.group, cls: "sub", anchor: "start" }); right = Math.max(right, 20 + textBox({ x: 0, y: 0, s: it.group, cls: "sub" }).x1); y += 32; }
    }
    const v = it.node, cy = y + v.h / 2;
    const made = v.draw(axis, cy);
    s.parts.push({ id: v.id, shape: "raw", svg: made.svg, texts: made.texts, x: axis - v.w / 2, y, w: v.w, h: v.h });
    y += v.h;
    if (it.arrow) {
      const nx = items[k + 1].node;
      const bottom = v.hit ? v.hit("bottom", 0, { ...v, cx: axis, cy })[1] : y;
      const top = y + 56;
      const pts = [[axis, bottom], [axis, nx.hit ? nx.hit("top", 0, { ...nx, cx: axis, cy: top + nx.h / 2 })[1] : top]];
      const texts = it.arrow.label ? [{ x: axis + 10, y: y + 32, s: it.arrow.label, cls: "verb", anchor: "start" }] : [];
      for (const t of texts) right = Math.max(right, textBox(t).x1);
      s.legs.push({ n: ++n, from: v.id, to: nx.id, pts, still: true, u: { end: it.arrow.end || null, dashed: Boolean(it.arrow.dashed) }, texts, verb: { s: "" }, mark: pts[0] });
      y = top;
      return;
    }
    if (it.rows.length) y += 10;
    for (const row of it.rows) {
      const my = y + 9, a = [left, my], b = [left + 48, my];
      const [p, q] = row.back ? [b, a] : [a, b];
      // Each text wraps so that the column fits a phone: 264px, less the room before the text.
      const room = 264 - (banded ? 28 : 16) - (left + 60);
      const lines = [...(row.label ? wrap(row.label, "verb", room).map((t) => [t, "verb"]) : []), ...wrap(row.target, "name", room).map((t) => [t, "name"])];
      const texts = lines.map(([t, cls], k) => ({ x: left + 60, y: y + 13 + k * 18, s: t, cls, anchor: "start" }));
      for (const t of texts) right = Math.max(right, textBox(t).x1);
      s.parts.push({ id: `${v.id}-row-${s.parts.length}`, shape: "raw", svg: uml.line([p, q], { end: row.end || null, dashed: Boolean(row.dashed) }) + (row.end ? uml.end(row.end, q, p) : ""), texts, x: left, y, w: 48, h: 18 });
      y += 6 + lines.length * 18;
    }
    y += 20;
  });
  close();
  s.w = Math.max(264, Math.ceil(right + (banded ? 28 : 16)));
  if (s.w % 2) s.w += 1;
  for (const b of s.bands) b.w = s.w - 16;
  s.h = y - (banded ? 12 : 4);
  return s;
}

const PHONE_NODE = 264 - 2 * 32; // the widest node in the column form, inside a band

module.exports = { layoutGraph, layoutColumnGraph, GraphError, U, hit, wrap, PHONE_NODE };
