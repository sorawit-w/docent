// Writes a laid-out drawing as inline SVG. The drawing carries its own styles, so a copy outside the page keeps
// its (light) colors. Inside a Docent page it reads the page's tokens, so one drawing serves both themes.
const { HEAD, HEAD_HALF, MARK, dist, segsOf } = require("./geometry.cjs");

const num = (v) => String(Math.round(v * 100) / 100);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const at = (p) => `transform:translate(${num(p[0])}px,${num(p[1])}px)`;
const pct = (v) => `${Math.round(v * 100) / 100}%`;

const LIGHT = { bg: "#fbfbfe", fig: "#f2f3f9", text: "#1c1f2e", muted: "#575d75", line: "#d3d6e3", primary: "#2f3fd0", dot: "#2f3fd0" };
const v = (name) => `var(--${name},${LIGHT[name]})`;
const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const CROSS = 1.6, PAUSE = 1.2; // seconds for one leg, and the rest before the run starts again

function text(t) {
  return `<text x="${num(t.x)}" y="${num(t.y)}" class="${t.cls}" text-anchor="${t.anchor || "start"}">${esc(t.s)}</text>`;
}

function icon(markup, [cx, cy], cls) {
  return `<g class="${cls}" transform="translate(${num(cx - 8)},${num(cy - 8)})">${markup}</g>`;
}

/** The leg's line. It stops inside the arrowhead, so the round cap never shows past the tip. */
function linePath(leg) {
  const pts = leg.pts.map((p) => [...p]);
  const tip = pts[pts.length - 1], prev = pts[pts.length - 2];
  const len = dist(tip, prev);
  pts[pts.length - 1] = [tip[0] - ((tip[0] - prev[0]) / len) * 6, tip[1] - ((tip[1] - prev[1]) / len) * 6];
  let d = `M${num(pts[0][0])},${num(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [p, c, n] = [pts[i - 1], pts[i], pts[i + 1]];
    const r = Math.min(leg.radius || 0, dist(p, c) / 2, dist(c, n) / 2);
    if (!r) { d += ` L${num(c[0])},${num(c[1])}`; continue; }
    const a = [c[0] - ((c[0] - p[0]) / dist(p, c)) * r, c[1] - ((c[1] - p[1]) / dist(p, c)) * r];
    const b = [c[0] + ((n[0] - c[0]) / dist(c, n)) * r, c[1] + ((n[1] - c[1]) / dist(c, n)) * r];
    d += ` L${num(a[0])},${num(a[1])} Q${num(c[0])},${num(c[1])} ${num(b[0])},${num(b[1])}`;
  }
  const end = pts[pts.length - 1];
  return `${d} L${num(end[0])},${num(end[1])}`;
}

function head(leg) {
  const tip = leg.pts[leg.pts.length - 1], prev = leg.pts[leg.pts.length - 2];
  const len = dist(tip, prev);
  const ux = (tip[0] - prev[0]) / len, uy = (tip[1] - prev[1]) / len;
  const bx = tip[0] - ux * HEAD, by = tip[1] - uy * HEAD;
  return `<polygon points="${num(bx - uy * HEAD_HALF)},${num(by + ux * HEAD_HALF)} ${num(bx + uy * HEAD_HALF)},${num(by - ux * HEAD_HALF)} ${num(tip[0])},${num(tip[1])}" class="head"/>`;
}

/** Where the dot rests on a leg (reduced motion, still pictures): on a straight part, clear of the numbered mark. */
function restPoint(leg) {
  const segs = segsOf(leg);
  const on = ([a, b], t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const tries = [];
  if (segs.length === 1) tries.push(on(segs[0], 0.12));
  else if (dist(...segs[0]) >= 24) tries.push(on(segs[0], 0.5));
  const longest = segs.reduce((best, s) => (dist(...s) > dist(...best) ? s : best), segs[0]);
  tries.push(on(longest, 0.24), on(longest, 0.76), on(longest, 0.12));
  return tries.find((p) => dist(p, leg.mark) >= MARK + 14) || tries[0];
}

/** Keyframes for a leg's dot between two moments (in percent of the whole animation). Transform and opacity only. */
function travel(leg, start, end) {
  const lengths = segsOf(leg).map(([a, b]) => dist(a, b));
  const total = lengths.reduce((s, l) => s + l, 0);
  let done = 0;
  return leg.pts.slice(1).map((p, i) => {
    done += lengths[i];
    return `${pct(start + ((end - start) * done) / total)}{${at(p)};opacity:1}`;
  });
}

function styles(scene, id, mode) {
  const s = `#${id}`;
  const css = [
    `${s}{display:block;flex:none;margin-inline:auto;font-family:var(--sans,${SANS})}`,
    `${s} .ground{fill:${v("fig")}}`,
    `${s} .band{fill:${v("bg")}}`,
    `${s} .track{stroke:${v("line")}}`,
    `${s} .line{fill:none;stroke:${v("text")};stroke-width:2;stroke-linecap:round;stroke-linejoin:round}`,
    `${s} .head{fill:${v("text")}}`,
    `${s} .stop{fill:${v("bg")};stroke:${v("text")};stroke-width:1.5}`,
    `${s} .stop.end{fill:${v("text")}}`,
    `${s} .mark{fill:${v("bg")};stroke:${v("text")};stroke-width:1.25}`,
    `${s} .card{fill:${v("bg")};stroke:${v("line")}}`,
    `${s} .icon{fill:none;stroke:${v("text")};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}`,
    `${s} .icon.on-end{stroke:${v("bg")}}`,
    `${s} .icon.lane-icon{stroke:${v("muted")}}`,
    `${s} .num{font-size:12px;font-weight:600;fill:${v("text")};font-variant-numeric:tabular-nums}`,
    `${s} .name{font-size:14px;font-weight:600;fill:${v("text")}}`,
    `${s} .lane{font-size:14px;font-weight:600;fill:${v("muted")}}`,
    `${s} .sub,${s} .verb{font-size:12px;fill:${v("muted")}}`,
    `${s} .pulse{display:none;fill:${v("dot")};stroke:${v("bg")};stroke-width:2.5}`,
  ];
  const print = [`${s} .pulse{display:none!important}`];
  const still = [`${s} .pulse{animation:none!important}`];
  if (mode === "walk") {
    // The current step: its leg takes the ink color and its dot travels the leg.
    const now = `.js ${s} .leg.is-current`;
    css.push(
      `${now} .line{stroke:${v("primary")};stroke-width:2.5}`,
      `${now} .head,${now} .num{fill:${v("primary")}}`,
      `${now} .mark{stroke:${v("primary")}}`,
      `${now} .pulse{display:block;animation:2.4s linear infinite}`,
    );
    for (const leg of scene.legs) {
      const first = leg.pts[0], last = leg.pts[leg.pts.length - 1];
      const frames = [`0%{${at(first)};opacity:0}`, `8%{${at(first)};opacity:1}`, ...travel(leg, 8, 68), `88%{${at(last)};opacity:1}`, `100%{${at(last)};opacity:0}`];
      css.push(`@keyframes ${id}-${leg.n}{${frames.join("")}}`, `${s} .pulse-${leg.n}{${at(restPoint(leg))}}`, `${now} .pulse-${leg.n}{animation-name:${id}-${leg.n}}`);
    }
    print.push(`${s} .leg .line{stroke:${v("text")}!important;stroke-width:2px!important}`, `${s} .leg .head,${s} .leg .num{fill:${v("text")}!important}`, `${s} .leg .mark{stroke:${v("text")}!important}`);
  } else {
    // Outside a walkthrough: one dot travels the whole route, leg by leg in order. The run plays twice, then rests.
    const total = scene.legs.length * CROSS + PAUSE;
    const when = (t) => (t / total) * 100;
    css.push(`.js ${s} .pulse{display:block;animation:${num(total)}s linear 2 both}`, `.js ${s}:not(.is-playing) .pulse{animation-play-state:paused}`);
    scene.legs.forEach((leg, k) => {
      const first = leg.pts[0], last = leg.pts[leg.pts.length - 1];
      const t0 = k * CROSS, t1 = t0 + CROSS;
      const frames = [`0%{${at(first)};opacity:0}`];
      if (k) frames.push(`${pct(when(t0))}{${at(first)};opacity:0}`);
      frames.push(`${pct(when(t0 + 0.12))}{${at(first)};opacity:1}`, ...travel(leg, when(t0 + 0.12), when(t1 - 0.25)), `${pct(when(t1))}{${at(last)};opacity:0}`, `100%{${at(last)};opacity:0}`);
      css.push(`@keyframes ${id}-${leg.n}{${frames.join("")}}`, `.js ${s} .pulse-${leg.n}{animation-name:${id}-${leg.n}}`);
    });
    still.push(`${s} .pulse{display:none!important}`);
  }
  css.push(`@media (prefers-reduced-motion:reduce){${still.join("")}}`, `@media print{${print.join("")}}`);
  return css.join("\n");
}

/** scene: the laid-out drawing. options: { id, label, mode: "walk" | "auto" }. */
function toSvg(scene, { id, label, mode }) {
  const out = [];
  out.push(`<svg id="${id}" class="dg dg-${scene.form}${mode === "auto" ? " dg-auto" : ""}" xmlns="http://www.w3.org/2000/svg" width="${num(scene.w)}" height="${num(scene.h)}" viewBox="0 0 ${num(scene.w)} ${num(scene.h)}" role="img" aria-label="${esc(label)}">`);
  out.push(`<style>\n${styles(scene, id, mode)}\n</style>`);
  out.push(`<rect width="${num(scene.w)}" height="${num(scene.h)}" class="ground"/>`);
  for (const b of scene.bands) out.push(`<rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}" rx="10" class="band"/>`);
  for (const [x1, y1, x2, y2] of scene.tracks) out.push(`<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" class="track"/>`);
  for (const lane of scene.lanes) {
    if (lane.icon) out.push(icon(lane.icon, lane.iconAt, "icon lane-icon"));
    out.push(text(lane.text));
  }
  for (const leg of scene.legs) {
    out.push(
      `<g class="leg" data-leg="${leg.n}"><path d="${linePath(leg)}" class="line"/>${head(leg)}` +
        `<circle cx="${num(leg.mark[0])}" cy="${num(leg.mark[1])}" r="${MARK}" class="mark"/>` +
        text({ x: leg.mark[0], y: leg.mark[1] + 4, s: leg.n, cls: "num", anchor: "middle" }) +
        text(leg.verb) +
        `<circle r="6" class="pulse pulse-${leg.n}"/></g>`,
    );
  }
  for (const part of scene.parts) {
    if (part.shape === "card") out.push(`<rect x="${num(part.x)}" y="${num(part.y)}" width="${num(part.w)}" height="${num(part.h)}" rx="10" class="card"/>`);
    else out.push(`<circle cx="${num(part.cx)}" cy="${num(part.cy)}" r="${num(part.r)}" class="${part.end ? "stop end" : "stop"}"/>`);
    if (part.icon) out.push(icon(part.icon, part.iconAt, part.end && part.shape !== "card" ? "icon on-end" : "icon"));
    for (const t of part.texts) out.push(text(t));
  }
  out.push("</svg>");
  return out.join("\n");
}

module.exports = { toSvg };
