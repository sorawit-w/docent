// The UML marks: line ends, nodes and shapes in the notation of UML 2.5.1, for every UML kind to draw from.
// Each function returns SVG markup with the classes below, so a mark reads the page tokens and serves both themes.
// A fill is the text color or the page color, never ultramarine. Inside a UML kind a dashed line means what UML
// says (a reply, a dependency, a realization, «include», «extend»), not "an optional path" (references/DESIGN.md).
const { dist } = require("./geometry.cjs");

const num = (v) => String(Math.round(v * 100) / 100);
const pts = (list) => list.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
const LIGHT = { bg: "#fbfbfe", text: "#1c1f2e", muted: "#575d75" };
const v = (name) => `var(--${name},${LIGHT[name]})`;

/** Sizes of the line ends, in px: length along the line and half the width across it. */
const END = {
  open: { len: 8, half: 4.5 },
  filled: { len: 8, half: 4.5 },
  hollow: { len: 12, half: 7 },
  diamond: { len: 16, half: 6 },
  "diamond-filled": { len: 16, half: 6 },
};

/** How far before the tip a line stops, so it never shows inside a hollow mark. An open or filled head covers the line's end. */
const back = (kind) => (kind === "open" ? 0 : kind === "filled" ? 6 : END[kind].len);

/** A line along pts, stopping short of the tip by the room its end mark needs. dashed: the UML dashed line. */
function line(points, { end = null, dashed = false } = {}) {
  const p = points.map((q) => [...q]);
  if (end) {
    const tip = p[p.length - 1], prev = p[p.length - 2], len = dist(tip, prev), cut = back(end);
    if (len < END[end].len + 28) throw new Error(`a UML line needs a straight run of ${END[end].len + 28}px behind its ${end} end; this one has ${Math.round(len)}px`);
    p[p.length - 1] = [tip[0] - ((tip[0] - prev[0]) / len) * cut, tip[1] - ((tip[1] - prev[1]) / len) * cut];
  }
  return `<polyline points="${pts(p)}" class="u-ln${dashed ? " u-dash" : ""}"/>`;
}

/** The mark at the tip of a line, pointing from prev to tip. */
function end(kind, tip, prev) {
  const size = END[kind];
  if (!size) throw new Error(`"${kind}" is not a UML line end; use one of ${Object.keys(END).join(", ")}`);
  const len = dist(tip, prev);
  const ux = (tip[0] - prev[0]) / len, uy = (tip[1] - prev[1]) / len;
  const at = (along, across) => [tip[0] - ux * along + -uy * across, tip[1] - uy * along + ux * across];
  const { len: l, half: h } = size;
  if (kind === "open") return `<polyline points="${pts([at(l, h), tip, at(l, -h)])}" class="u-ln"/>`;
  if (kind === "filled") return `<polygon points="${pts([at(l, h), at(l, -h), tip])}" class="u-ink"/>`;
  if (kind === "hollow") return `<polygon points="${pts([at(l, h), at(l, -h), tip])}" class="u-face"/>`;
  return `<polygon points="${pts([tip, at(l / 2, h), at(l, 0), at(l / 2, -h)])}" class="${kind === "diamond" ? "u-face" : "u-face u-ink"}"/>`;
}

// Nodes of activities and state machines. Each is centred on c.
const NODE = 10; // the radius of an initial or final node
const nodes = {
  initial: (c) => `<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${NODE - 2}" class="u-ink"/>`,
  // An activity final and a final state are the same mark: a ring around a filled dot.
  final: (c) => `<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${NODE}" class="u-face"/><circle cx="${num(c[0])}" cy="${num(c[1])}" r="${NODE - 4}" class="u-ink"/>`,
  flowFinal: (c) => {
    const d = NODE * Math.SQRT1_2;
    return `<circle cx="${num(c[0])}" cy="${num(c[1])}" r="${NODE}" class="u-face"/><path d="M${num(c[0] - d)},${num(c[1] - d)} L${num(c[0] + d)},${num(c[1] + d)} M${num(c[0] + d)},${num(c[1] - d)} L${num(c[0] - d)},${num(c[1] + d)}" class="u-ln"/>`;
  },
  // A decision, a merge and a choice are the same hollow diamond.
  decision: (c) => `<polygon points="${pts([[c[0], c[1] - 12], [c[0] + 16, c[1]], [c[0], c[1] + 12], [c[0] - 16, c[1]]])}" class="u-face"/>`,
  junction: (c) => `<circle cx="${num(c[0])}" cy="${num(c[1])}" r="5" class="u-ink"/>`,
  history: (c, deep = false) => `<circle cx="${num(c[0])}" cy="${num(c[1])}" r="12" class="u-face"/><text x="${num(c[0])}" y="${num(c[1] + 4.5)}" class="u-name" text-anchor="middle">${deep ? "H*" : "H"}</text>`,
  // A fork or a join: a bar across the flow. vertical when the flow runs left to right.
  bar: (c, length, vertical = false) => vertical
    ? `<rect x="${num(c[0] - 2.5)}" y="${num(c[1] - length / 2)}" width="5" height="${num(length)}" class="u-ink"/>`
    : `<rect x="${num(c[0] - length / 2)}" y="${num(c[1] - 2.5)}" width="${num(length)}" height="5" class="u-ink"/>`,
  // A terminate pseudostate, and the end of a destroyed lifeline: a cross.
  cross: (c) => `<path d="M${num(c[0] - 8)},${num(c[1] - 8)} L${num(c[0] + 8)},${num(c[1] + 8)} M${num(c[0] + 8)},${num(c[1] - 8)} L${num(c[0] - 8)},${num(c[1] + 8)}" class="u-ln u-bold"/>`,
};

// Shapes. Each takes its box: x, y, w, h.
const box = ({ x, y, w, h }, r, cls = "u-face") => `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}"${r ? ` rx="${r}"` : ""} class="${cls}"/>`;
const shapes = {
  /** An action or a state: a box with round corners. */
  rounded: (b) => box(b, 10),
  /** A class, an object, a lifeline head, an artifact: a plain box. rules: the y of each line between compartments. */
  compartments: (b, rules = []) => box(b, 0) + rules.map((y) => `<line x1="${num(b.x)}" y1="${num(y)}" x2="${num(b.x + b.w)}" y2="${num(y)}" class="u-ln"/>`).join(""),
  /** A node of a deployment: a box with a top and a side, as if seen from above and to the right. */
  node: ({ x, y, w, h }, d = 10) =>
    `<polygon points="${pts([[x, y + d], [x + d, y], [x + w + d, y], [x + w, y + d]])}" class="u-face"/>` +
    `<polygon points="${pts([[x + w, y + d], [x + w + d, y], [x + w + d, y + h - d], [x + w, y + h]])}" class="u-face"/>` +
    box({ x, y: y + d, w, h: h - d }, 0),
  /** A package or a profile: a folder with a tab at its upper left. */
  folder: ({ x, y, w, h }, tab = 64) => box({ x, y, w: tab, h: 16 }, 0) + box({ x, y: y + 16, w, h: h - 16 }, 0),
  /** A use case: an oval. */
  oval: ({ x, y, w, h }) => `<ellipse cx="${num(x + w / 2)}" cy="${num(y + h / 2)}" rx="${num(w / 2)}" ry="${num(h / 2)}" class="u-face"/>`,
  /** A note: a box with its upper right corner folded. */
  note: ({ x, y, w, h }, f = 10) => `<path d="M${num(x)},${num(y)} L${num(x + w - f)},${num(y)} L${num(x + w)},${num(y + f)} L${num(x + w)},${num(y + h)} L${num(x)},${num(y + h)} Z M${num(x + w - f)},${num(y)} L${num(x + w - f)},${num(y + f)} L${num(x + w)},${num(y + f)}" class="u-face"/>`,
  /** A send signal action: a box with a point on its right. */
  send: ({ x, y, w, h }, p = 12) => `<polygon points="${pts([[x, y], [x + w - p, y], [x + w, y + h / 2], [x + w - p, y + h], [x, y + h]])}" class="u-face"/>`,
  /** An accept event action: a box with a notch on its left. */
  accept: ({ x, y, w, h }, p = 12) => `<polygon points="${pts([[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x + p, y + h / 2]])}" class="u-face"/>`,
  /** The tab of a frame or a combined fragment, at the frame's upper left: a box with its lower right corner cut. */
  tab: ({ x, y, w, h }, c = 8) => `<polygon points="${pts([[x, y], [x + w, y], [x + w, y + h - c], [x + w - c, y + h], [x, y + h]])}" class="u-face"/>`,
};

// Small marks that sit on a shape. Each is placed at a point.
const signs = {
  /** An actor: a stick figure, 40px tall, standing on (cx, top + 40). */
  actor: (cx, top) => `<g class="u-ln"><circle cx="${num(cx)}" cy="${num(top + 6)}" r="6" class="u-face"/><path d="M${num(cx)},${num(top + 12)} L${num(cx)},${num(top + 26)} M${num(cx - 10)},${num(top + 17)} L${num(cx + 10)},${num(top + 17)} M${num(cx)},${num(top + 26)} L${num(cx - 8)},${num(top + 40)} M${num(cx)},${num(top + 26)} L${num(cx + 8)},${num(top + 40)}"/></g>`,
  /** The component icon, 16 by 16, at the upper right of a component. */
  component: (x, y) => `<rect x="${num(x + 3)}" y="${num(y)}" width="13" height="16" class="u-face"/><rect x="${num(x)}" y="${num(y + 3)}" width="7" height="3" class="u-face"/><rect x="${num(x)}" y="${num(y + 10)}" width="7" height="3" class="u-face"/>`,
  /** The artifact icon, a page with a folded corner, 12 by 16. */
  artifact: (x, y) => shapes.note({ x, y, w: 12, h: 16 }, 4),
  /** A port: a small square centred on the border of its owner. */
  port: (c) => box({ x: c[0] - 5, y: c[1] - 5, w: 10, h: 10 }, 0),
  /** A provided interface: a ball at the end of a stem. dir is the unit vector from the owner outwards. */
  lollipop: (from, dir, stem = 20) => {
    const c = [from[0] + dir[0] * (stem + 7), from[1] + dir[1] * (stem + 7)];
    return `<line x1="${num(from[0])}" y1="${num(from[1])}" x2="${num(from[0] + dir[0] * stem)}" y2="${num(from[1] + dir[1] * stem)}" class="u-ln"/><circle cx="${num(c[0])}" cy="${num(c[1])}" r="7" class="u-face"/>`;
  },
  /** A required interface: a half circle at the end of a stem, open away from the owner. */
  socket: (from, dir, stem = 20) => {
    const c = [from[0] + dir[0] * (stem + 11), from[1] + dir[1] * (stem + 11)], n = [-dir[1], dir[0]], r = 11;
    const a = [c[0] + n[0] * r, c[1] + n[1] * r], b = [c[0] - n[0] * r, c[1] - n[1] * r];
    return `<line x1="${num(from[0])}" y1="${num(from[1])}" x2="${num(from[0] + dir[0] * stem)}" y2="${num(from[1] + dir[1] * stem)}" class="u-ln"/><path d="M${num(a[0])},${num(a[1])} A${r},${r} 0 0 0 ${num(b[0])},${num(b[1])}" class="u-ln"/>`;
  },
};

/** The styles of the marks for one drawing, scoped to its id like the other drawing styles. */
function styles(id) {
  const s = `#${id}`;
  return [
    `${s} .u-ln{fill:none;stroke:${v("text")};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}`,
    `${s} .u-bold{stroke-width:2.5}`,
    `${s} .u-dash{stroke-dasharray:6 4;stroke-linecap:butt}`,
    `${s} .u-face{fill:${v("bg")};stroke:${v("text")};stroke-width:1.5;stroke-linejoin:round}`,
    `${s} .u-ink{fill:${v("text")}}`,
    `${s} .u-name{font-size:14px;font-weight:600;fill:${v("text")}}`,
  ].join("\n");
}

/**
 * The key to the marks: one plain sentence for each mark a reader may not know. A drawing's text form ends with the
 * entries for the marks it uses, and no others. A kind may give a mark its own sentence when its meaning there is narrower.
 */
const KEY = {
  sync: "A solid line with a filled arrowhead: a call that waits for its answer.",
  async: "A solid line with an open arrowhead: a message that does not wait for an answer.",
  reply: "A dashed line with an open arrowhead: the answer to a call.",
  association: "A solid line: the two things are linked. An open arrowhead shows the direction in which the link is used.",
  generalization: "A solid line with a hollow triangle: the thing at the line's start is a kind of the thing at the triangle.",
  realization: "A dashed line with a hollow triangle: the thing at the line's start does what the thing at the triangle describes.",
  dependency: "A dashed line with an open arrowhead: the thing at the line's start needs the thing at the arrowhead.",
  aggregation: "A hollow diamond: the whole at the diamond holds the part, and the part can exist without it.",
  composition: "A filled diamond: the whole at the diamond owns the part, and the part cannot exist without it.",
  extension: "A solid line with a filled triangle: the stereotype at the line's start extends the metaclass at the triangle.",
  initial: "A filled dot: where it starts.",
  final: "A ring around a filled dot: where it ends.",
  flowFinal: "A ring with a cross: this path ends here, and the other paths go on.",
  decision: "A hollow diamond: the path splits by a condition, or paths join again.",
  junction: "A small filled dot: paths meet or split here with no choice of their own.",
  history: "H in a ring: back to the state that was active last.",
  deepHistory: "H* in a ring: back to the state that was active last, at every level inside.",
  bar: "A thick bar: the path splits into paths that run at the same time, or those paths wait for each other.",
  cross: "A cross: the thing ends here and does not come back.",
  include: "«include»: the first use case always uses the second.",
  extend: "«extend»: the second use case may add to the first, under a condition.",
  lollipop: "A ball on a stem: a service that this part offers.",
  socket: "A half circle on a stem: a service that this part needs.",
  port: "A small square on the border: a point where the part connects.",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The key for the marks a drawing uses, in the order given, for the end of its text form. own: sentences that replace the defaults. */
function keyHtml(used, own = {}) {
  const list = [...new Set(used)];
  for (const k of list) if (!KEY[k] && !own[k]) throw new Error(`the mark "${k}" has no sentence in the key`);
  if (!list.length) return "";
  return `<p>Key to the marks:</p>\n<ul>${list.map((k) => `<li>${esc(own[k] || KEY[k])}</li>`).join("")}</ul>`;
}

module.exports = { END, line, end, nodes, shapes, signs, styles, KEY, keyHtml };
