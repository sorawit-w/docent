// The spacing rules of references/DESIGN.md as code. Every drawing passes through check() before it is written.
//   R1  an arrowhead has a straight run of at least 28px behind it
//   R2  a numbered mark sits in the gap between lanes (or on the leg inside one lane), 16px clear of heads, bends and parts
//   R3  a verb sits beside its mark and stays 6px clear of every line
//   R4  a leg inside one lane is at least 72px long
//   R5  nothing overlaps
const { textWidth } = require("./text.cjs");

const HEAD = 8; // arrowhead length
const HEAD_HALF = 4.5; // half of its width
const MARK = 10; // radius of a numbered mark
const RULE = { run: 28, markClear: 16, verbClear: 6, sameLane: 72, verbNear: 14 };
const FONT = { name: [14, 600], lane: [14, 600], sub: [12, 400], verb: [12, 400] };

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function pointSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function segsMeet(a, b, c, d) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return [pointSeg(a, c, d), pointSeg(b, c, d), pointSeg(c, a, b), pointSeg(d, a, b)].some((v) => v < 1e-9);
}

const segSeg = (a, b, c, d) => (segsMeet(a, b, c, d) ? 0 : Math.min(pointSeg(a, c, d), pointSeg(b, c, d), pointSeg(c, a, b), pointSeg(d, a, b)));

const inRect = (p, r) => p[0] >= r.x0 && p[0] <= r.x1 && p[1] >= r.y0 && p[1] <= r.y1;
const rectEdges = (r) => [[[r.x0, r.y0], [r.x1, r.y0]], [[r.x1, r.y0], [r.x1, r.y1]], [[r.x1, r.y1], [r.x0, r.y1]], [[r.x0, r.y1], [r.x0, r.y0]]];
const rectSeg = (r, a, b) => (inRect(a, r) || inRect(b, r) ? 0 : Math.min(...rectEdges(r).map(([c, d]) => segSeg(a, b, c, d))));
const rectRect = (p, q) => Math.hypot(Math.max(0, p.x0 - q.x1, q.x0 - p.x1), Math.max(0, p.y0 - q.y1, q.y0 - p.y1));
const rectPoint = (r, p) => Math.hypot(Math.max(0, r.x0 - p[0], p[0] - r.x1), Math.max(0, r.y0 - p[1], p[1] - r.y1));

/** The box of one line of text: { x0, y0, x1, y1 }. */
function textBox(t) {
  const [size, weight] = FONT[t.cls];
  const w = textWidth(t.s, size, weight);
  const x0 = t.anchor === "middle" ? t.x - w / 2 : t.anchor === "end" ? t.x - w : t.x;
  return { x0, y0: t.y - size * 0.8, x1: x0 + w, y1: t.y + size * 0.22 };
}

const segsOf = (leg) => leg.pts.slice(0, -1).map((p, i) => [p, leg.pts[i + 1]]);
const pathLength = (leg) => segsOf(leg).reduce((sum, [a, b]) => sum + dist(a, b), 0);

/** The base of the arrowhead: the point 8px behind the tip. */
function headBase(leg) {
  const tip = leg.pts[leg.pts.length - 1], prev = leg.pts[leg.pts.length - 2];
  const len = dist(tip, prev) || 1;
  return [tip[0] - ((tip[0] - prev[0]) / len) * HEAD, tip[1] - ((tip[1] - prev[1]) / len) * HEAD];
}

const partRect = (p) => (p.shape === "card" ? { x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h } : { x0: p.cx - p.r, y0: p.cy - p.r, x1: p.cx + p.r, y1: p.cy + p.r });
const partToPoint = (p, q) => (p.shape === "card" ? rectPoint(partRect(p), q) : Math.max(0, dist([p.cx, p.cy], q) - p.r));
const partToSeg = (p, a, b) => (p.shape === "card" ? rectSeg(partRect(p), a, b) : Math.max(0, pointSeg([p.cx, p.cy], a, b) - p.r));
const partToRect = (p, r) => (p.shape === "card" ? rectRect(partRect(p), r) : Math.max(0, rectPoint(r, [p.cx, p.cy]) - p.r));

/**
 * Tests a drawing against the spacing rules. Returns a list of problems; an empty list means the drawing is good.
 * A problem is { rule, kind, msg } plus the leg number or part ids that it concerns.
 */
function check(scene) {
  const out = [];
  const bad = (rule, kind, msg, more = {}) => out.push({ rule, kind, msg, ...more });
  const legs = scene.legs, parts = scene.parts;
  const texts = [];
  scene.lanes.forEach((lane, i) => texts.push({ box: textBox(lane.text), what: `the lane name "${lane.text.s}"`, kind: "lane", lane: i }));
  scene.lanes.forEach((lane, i) => lane.iconAt && texts.push({ box: { x0: lane.iconAt[0] - 8, y0: lane.iconAt[1] - 8, x1: lane.iconAt[0] + 8, y1: lane.iconAt[1] + 8 }, what: "a lane icon", kind: "lane", lane: i }));
  for (const part of parts) for (const t of part.texts) texts.push({ box: textBox(t), what: `"${t.s}"`, kind: "label", part: part.id });
  for (const leg of legs) texts.push({ box: textBox(leg.verb), what: `the verb "${leg.verb.s}"`, kind: "verb", leg: leg.n });

  for (const leg of legs) {
    const segs = segsOf(leg);
    const [a, b] = segs[segs.length - 1];
    const need = RULE.run + HEAD + (segs.length > 1 ? leg.radius || 0 : 0);
    if (dist(a, b) < need - 0.01) bad("R1", "run", `leg ${leg.n}: the straight run behind the arrowhead is ${Math.round(dist(a, b) - HEAD - (segs.length > 1 ? leg.radius || 0 : 0))}px; it must be ${RULE.run}px`, { leg: leg.n });
    if (leg.sameLane && pathLength(leg) < RULE.sameLane - 0.01) bad("R4", "short", `leg ${leg.n} is ${Math.round(pathLength(leg))}px long; a leg inside one lane must be ${RULE.sameLane}px`, { leg: leg.n });

    // R2: the mark.
    const m = leg.mark;
    if (Math.min(...segs.map(([p, q]) => pointSeg(m, p, q))) > 0.6) bad("R2", "mark-off", `mark ${leg.n} is not on its leg`, { leg: leg.n });
    if (!leg.sameLane && scene.gaps.length && !scene.gaps.some((g) => inRect(m, { x0: g.x, y0: g.y, x1: g.x + g.w, y1: g.y + g.h }))) bad("R2", "mark-gap", `mark ${leg.n} is not in the gap between two lanes`, { leg: leg.n });
    for (const other of legs) {
      const tip = other.pts[other.pts.length - 1];
      if (pointSeg(m, headBase(other), tip) - HEAD_HALF - MARK < RULE.markClear - 0.01) bad("R2", "mark-head", `mark ${leg.n} is less than ${RULE.markClear}px from the arrowhead of leg ${other.n}`, { leg: leg.n });
      for (const bend of other.pts.slice(1, -1)) if (dist(m, bend) - MARK - (other.radius || 0) < RULE.markClear - 0.01) bad("R2", "mark-bend", `mark ${leg.n} is less than ${RULE.markClear}px from a bend of leg ${other.n}`, { leg: leg.n });
      if (other !== leg && Math.min(...segsOf(other).map(([p, q]) => pointSeg(m, p, q))) - MARK < 4) bad("R5", "mark-line", `mark ${leg.n} sits on leg ${other.n}`, { leg: leg.n });
      if (other.n > leg.n && dist(m, other.mark) < 2 * MARK + 4) bad("R5", "mark-mark", `marks ${leg.n} and ${other.n} overlap`, { leg: other.n });
    }
    for (const part of parts) if (partToPoint(part, m) - MARK < RULE.markClear - 0.01) bad("R2", "mark-part", `mark ${leg.n} is less than ${RULE.markClear}px from the part "${part.id}"`, { leg: leg.n });

    // R3: the verb.
    const verb = textBox(leg.verb);
    if (rectPoint(verb, m) - MARK > RULE.verbNear) bad("R3", "verb-far", `the verb of leg ${leg.n} is not beside its mark`, { leg: leg.n });
    for (const other of legs) for (const [p, q] of segsOf(other)) if (rectSeg(verb, p, q) < RULE.verbClear - 0.01) { bad("R3", "verb-line", `the verb "${leg.verb.s}" is less than ${RULE.verbClear}px from the line of leg ${other.n}`, { leg: leg.n, otherLeg: other.n }); break; }
    for (const [x1, y1, x2, y2] of scene.tracks) if (rectSeg(verb, [x1, y1], [x2, y2]) < RULE.verbClear - 0.01) bad("R3", "verb-track", `the verb "${leg.verb.s}" is less than ${RULE.verbClear}px from a track`, { leg: leg.n });
    for (const part of parts) if (partToRect(part, verb) < RULE.verbClear - 0.01) bad("R3", "verb-part", `the verb "${leg.verb.s}" is less than ${RULE.verbClear}px from the part "${part.id}"`, { leg: leg.n });

    // R5: the line keeps away from parts that it does not join, and from other lines.
    for (const part of parts) {
      if (part.id === leg.from || part.id === leg.to) continue;
      if (Math.min(...segs.map(([p, q]) => partToSeg(part, p, q))) < 8) bad("R5", "line-part", `leg ${leg.n} runs over or too close to the part "${part.id}"`, { leg: leg.n });
    }
    for (const other of legs) {
      if (other.n <= leg.n) continue;
      for (const [p, q] of segs) for (const [r, s] of segsOf(other)) {
        const d = segSeg(p, q, r, s);
        if (d >= 8) continue;
        const square = (u, v) => u[0] === v[0] || u[1] === v[1];
        const clean = d === 0 && square(p, q) && square(r, s) && (p[0] === q[0]) !== (r[0] === s[0]) && Math.min(pointSeg(p, r, s), pointSeg(q, r, s), pointSeg(r, p, q), pointSeg(s, p, q)) >= 8;
        if (!clean) bad("R5", "line-line", `legs ${leg.n} and ${other.n} touch or run too close`, { leg: other.n });
      }
    }
    const base = headBase(leg), tip = leg.pts[leg.pts.length - 1];
    for (const other of legs) if (other !== leg) for (const [p, q] of segsOf(other)) if (segSeg(base, tip, p, q) < HEAD_HALF + 4) bad("R5", "head-line", `the arrowhead of leg ${leg.n} touches leg ${other.n}`, { leg: leg.n });
  }

  // R5: text never sits on a line, a mark, a part or other text.
  texts.forEach((t, i) => {
    if (t.kind !== "verb") {
      for (const leg of legs) {
        if (Math.min(...segsOf(leg).map(([p, q]) => rectSeg(t.box, p, q))) < 4) bad("R5", "text-line", `${t.what} is on or too close to leg ${leg.n}`, { leg: leg.n, part: t.part, lane: t.lane });
        if (rectSeg(t.box, headBase(leg), leg.pts[leg.pts.length - 1]) < HEAD_HALF + 2) bad("R5", "text-head", `${t.what} touches the arrowhead of leg ${leg.n}`, { leg: leg.n, part: t.part, lane: t.lane });
      }
      for (const [x1, y1, x2, y2] of scene.tracks) if (rectSeg(t.box, [x1, y1], [x2, y2]) < 4) bad("R5", "text-track", `${t.what} is on or too close to a track`, { part: t.part, lane: t.lane });
      for (const part of parts) {
        if (part.id === t.part && part.shape === "card") continue;
        if (partToRect(part, t.box) < 4) bad("R5", "text-part", `${t.what} is on or too close to the part "${part.id}"`, { part: t.part, lane: t.lane, other: part.id });
      }
    }
    for (const leg of legs) if (!(t.kind === "verb" && t.leg === leg.n) && rectPoint(t.box, leg.mark) - MARK < 2) bad("R5", "text-mark", `${t.what} touches mark ${leg.n}`, { leg: t.kind === "verb" ? t.leg : leg.n, otherLeg: leg.n, part: t.part, lane: t.lane });
    for (const u of texts.slice(i + 1)) if (!(t.kind === u.kind && t.part === u.part && t.lane === u.lane && t.kind !== "verb") && rectRect(t.box, u.box) < 6) bad("R5", "text-text", `${t.what} and ${u.what} overlap`, { leg: t.leg ?? u.leg, part: t.part, other: u.part, lane: t.lane ?? u.lane });
    if (t.box.x0 < 4 || t.box.y0 < 4 || t.box.x1 > scene.w - 4 || t.box.y1 > scene.h - 4) bad("R5", "outside", `${t.what} is outside the drawing`, { leg: t.leg, part: t.part });
  });
  return out;
}

module.exports = { HEAD, HEAD_HALF, MARK, RULE, FONT, dist, pointSeg, segSeg, textBox, segsOf, pathLength, headBase, check };
