// Hand-drawn figures: an SVG that the agent draws by hand in a figure well, for a rare type that has no built-in kind
// (docs/proposals/charts.md, section 5). It holds no CSS and no colors: only plain shapes and texts, placed by their geometry, with
// classes from a fixed set that kit.css draws with Docent's tokens. So the kit gives it dark mode, print, palettes, forced colors and
// more contrast, and its text is never under 12px, because no class is. check tests the rest of the contract here: a marker and a
// type from the list, real size, no network and no script, an accessible name, and the diagram in words beside it. Elements and
// attributes are read from a list, as strictly as a logo's (logo.cjs).
const { TAG, attributes } = require("./logo.cjs");

const TYPES = ["quadrant", "nested", "venn", "fishbone", "wardley-map", "user-journey", "story-map"];
// A type that Docent draws from data: the kind to write instead ("" is the workflow diagram, which has no "kind").
const BUILT = {
  bar: "bar", "bar-chart": "bar", column: "bar", dumbbell: "bar", line: "line", "line-chart": "line", slopegraph: "line",
  flowchart: "flow", flow: "flow", sequence: "sequence", state: "state", "state-machine": "state", activity: "activity",
  timing: "timing", "use-case": "usecase", usecase: "usecase", class: "class", er: "class", "data-model": "class", object: "object",
  package: "package", "dependency-graph": "package", profile: "profile", component: "component", architecture: "component",
  composite: "composite", deployment: "deployment", communication: "communication", "interaction-overview": "interaction-overview",
  range: "range", "dot-plot": "range", layout: "layout", plan: "plan", funnel: "funnel", heatmap: "heatmap", "heat-map": "heatmap",
  heatplan: "heatplan", "heat-plan": "heatplan", statusgrid: "statusgrid", "status-grid": "statusgrid",
  workflow: "", swimlane: "", process: "", "data-flow": "", loop: "", flywheel: "", "layer-stack": "",
};
// Types that Docent plans as built-in kinds: until one is built, a table or words.
const PLANNED = { scatter: "a scatter plot", timeline: "a timeline", gantt: "a Gantt chart", roadmap: "a roadmap", tree: "a tree", "org-chart": "an org chart", schema: "a database schema" };
// Types that Docent leaves out, and why ("Position and length" in DESIGN.md, and funnels.md for the Sankey).
const LEFT_OUT = {
  pie: "an angle and an area show the amounts, which the eye reads poorly; a bar chart shows the same parts",
  donut: "an angle and an area show the amounts, which the eye reads poorly; a bar chart shows the same parts",
  radar: "the area of the shape depends on the order of the spokes; a table or small multiples of bars compare the scores honestly",
  spider: "the area of the shape depends on the order of the spokes; a table or small multiples of bars compare the scores honestly",
  polar: "the reader compares angles and curved lengths, which the eye reads poorly; a bar chart shows the same values",
  pyramid: "its widths mean nothing and its layers are a ranked list; write the list, or a funnel for counts",
  treemap: "the reader compares areas of rectangles of different shapes, which the eye reads poorly; a bar chart sorted from largest shows the same parts",
  bubble: "the size of a circle shows an amount, and the eye reads areas poorly; a table or a bar chart shows it",
  sankey: "it claims to know where each person went next, and its band widths have no Docent rules (see funnels.md); a funnel or a table shows it",
  ridgeline: "its areas overlap on purpose, so one hides another; small multiples of line charts show it",
};
// The classes that kit.css draws. A shape with no class is a 1.5px line in the text color; a text with no class is hd-text.
const CLASSES = {
  "hd-line": "a 1.5px line in the text color", "hd-strong": "a 2.5px line in the text color", "hd-muted": "a 1px line in the muted color",
  "hd-rule": "a 1px line in the outline color", "hd-fill": "a shape filled with the text color", "hd-box": "a box in the page color with a text-color outline",
  "hd-band": "a band in the page color", "hd-name": "a name: 14px, weight 600", "hd-text": "a text: 14px", "hd-note": "a note: 12px, muted",
};
const MOST = { width: 640, height: 831 }; // px: the paper form of a scale chart, and 220mm of an A4 page at 96px to the inch
const ELEMENTS = new Set(["svg", "g", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "text", "tspan", "title", "desc"]);
const TEXT_HOLDERS = new Set(["text", "tspan", "title", "desc"]);
const REFUSED = {
  script: [6, "a script runs code"], foreignObject: [6, "foreignObject can hold any HTML"], image: [6, "an image loads a file"], a: [6, "a link does not belong in a drawing"],
  iframe: [6, "a frame loads a page"], video: [6, "a video loads a file"], audio: [6, "a sound loads a file"],
  animate: [6, "a drawing does not move"], animateMotion: [6, "a drawing does not move"], animateTransform: [6, "a drawing does not move"], set: [6, "a drawing does not move"],
  style: [2, "a hand-drawn figure has no style; give each shape and text a class from the list"],
  linearGradient: [2, "the page is flat"], radialGradient: [2, "the page is flat"], filter: [2, "the page is flat"], pattern: [2, "the page is flat"], mask: [2, "the page is flat"],
  use: [0, "it copies another part; draw each part on its own"], symbol: [0, "it is used through a use; draw each part on its own"], clipPath: [0, "draw each part on its own"],
  marker: [0, "draw an arrowhead as a small path with class=\"hd-fill\""], defs: [0, "a hand-drawn figure holds no definitions"], textPath: [0, "a text stands on a straight line"],
};
const GEOMETRY = new Set(["x", "y", "dx", "dy", "width", "height", "d", "points", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2", "transform"]);
const PLAIN = new Set(["xmlns", "viewBox", "id", "role", "class", "data-drawn", "data-type", "text-anchor", "dominant-baseline"]);
const KEYWORDS = { "text-anchor": ["start", "middle", "end"], "dominant-baseline": ["auto", "middle", "central", "hanging", "alphabetic"] };
const RULE = {
  1: "rule 1, a marker", 2: "rule 2, the kit's classes only", 3: "rule 3, no text under 12px", 4: "rule 4, real size", 5: "rule 5, the page's font",
  6: "rule 6, no network and no script", 7: "rule 7, nothing dashed", 8: "rule 8, an accessible name", 9: "rule 9, the diagram in words", 0: "the markup",
};
const CLASS_LIST = Object.keys(CLASSES).join(", ");

const words = (s) => s.replace(/<[^>]*>/g, "").replace(/&[#\w]+;/g, "x").trim();
const blank = (s) => s.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length));

/** Each top-level <svg> element in markup, with its place, counting nested svgs so the whole drawing is read. */
function svgsIn(markup) {
  const bare = blank(markup), out = [], tag = /<(\/?)svg\b[^>]*>/gi;
  let depth = 0, start = 0;
  for (let m; (m = tag.exec(bare)); ) {
    if (!m[1]) { if (!depth++) start = m.index; if (/\/>$/.test(m[0]) && !--depth) out.push({ start, end: tag.lastIndex }); }
    else if (depth && !--depth) out.push({ start, end: tag.lastIndex });
  }
  if (depth) out.push({ start, end: markup.length });
  return out.map((s) => ({ ...s, text: markup.slice(s.start, s.end) }));
}

/** Why an attribute that is not on the list is refused: [rule, reason]. */
function refusedAttribute(attr) {
  if (attr.startsWith("on")) return [6, "an event attribute runs code"];
  if (attr === "href" || attr.endsWith(":href")) return [6, "a hand-drawn figure links to nothing and loads nothing"];
  if (attr === "style") return [2, "a hand-drawn figure has no style; give the element a class from the list"];
  if (attr === "stroke-dasharray" || attr === "stroke-dashoffset") return [7, "in Docent a dashed line means a path that only some readers take"];
  if (attr === "font-size" || attr === "textlength" || attr === "lengthadjust") return [3, "the class sets the size of a text: hd-name and hd-text are 14px, hd-note 12px"];
  if (attr.startsWith("font") || attr === "letter-spacing") return [5, "a hand-drawn figure takes the page's font; hd-name sets weight 600"];
  if (/^(fill|stroke|color|stop-color|opacity|fill-opacity|stroke-opacity|stroke-width|stroke-linecap|stroke-linejoin|paint-order|visibility|display)$/.test(attr)) return [2, `the class sets how a shape is drawn, from Docent's tokens: ${CLASS_LIST}`];
  return [0, "a hand-drawn figure does not take it"];
}

/** Why a value of a listed attribute is refused, or null. */
function badValue(name, attr, value) {
  if (attr === "class") { const bad = value.trim().split(/\s+/).filter((c) => c && !Object.hasOwn(CLASSES, c)); return bad.length ? [2, `"${bad[0]}" is not a class of the kit; the classes are ${CLASS_LIST}`] : null; }
  if (attr === "viewBox") return name === "svg" ? null : [4, "a viewBox scales what it holds, so only the <svg> has one"];
  if (attr === "transform") return /^(\s*(translate|rotate)\(\s*[-\d.e]+(?:[\s,]+[-\d.e]+){0,2}\s*\)\s*)+$/i.test(value) ? null : [4, "a drawing moves or turns a part with translate() or rotate(), and never scales it, so its text keeps its real size"];
  if (KEYWORDS[attr]) return KEYWORDS[attr].includes(value) ? null : [0, `it is one of ${KEYWORDS[attr].join(", ")}`];
  if (attr.startsWith("aria-") || ["id", "role", "data-type", "data-drawn", "xmlns"].includes(attr)) return /[<>&\\]/.test(value) ? [0, "it holds a character that it does not need"] : null;
  if (attr === "d") return /^[MmLlHhVvCcSsQqTtAaZz\d\s.,eE+-]*$/.test(value) ? null : [0, "a path holds commands and numbers only"];
  return /^[\d\s.,eE+-]*$/.test(value) ? null : [0, "it holds numbers only"]; // geometry
}

/** The type that a drawing names: { error, stop } when it is missing, built in, planned, left out or not on the list. */
function typeOf(type) {
  if (type == null || !type.trim()) return { error: [1, `the <svg> has data-drawn="hand" and no data-type; name the type, one of ${TYPES.map((t) => `"${t}"`).join(", ")}`] };
  if (TYPES.includes(type)) return {};
  const key = type.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const look = [key, key.replace(/-(chart|diagram|graph)$/, "")].find((k) => Object.hasOwn(BUILT, k) || Object.hasOwn(PLANNED, k) || Object.hasOwn(LEFT_OUT, k)) || key;
  if (Object.hasOwn(BUILT, look)) {
    const kind = BUILT[look];
    return { stop: true, error: [1, `it is a hand-drawn ${type}, which Docent draws from data; write its data in a block ${kind ? `with "kind": "${kind}"` : 'with no "kind" (a workflow diagram)'} and run render`] };
  }
  if (Object.hasOwn(PLANNED, look)) return { stop: true, error: [1, `it is a hand-drawn ${type}; Docent plans a built-in kind for ${PLANNED[look]}, so until it is built, write its data as a table or in words`] };
  if (Object.hasOwn(LEFT_OUT, look)) return { stop: true, error: [1, `it is a hand-drawn ${type}, which Docent leaves out: ${LEFT_OUT[look]} ("Position and length" in DESIGN.md). Use that instead. If the user asks for it after you name this rule, it is the user's call, and check still reports it (see SKILL.md on a design rule the user asks to break)`] };
  return { error: [1, `data-type="${type}" is not in the hand-drawn list; the types are ${TYPES.map((t) => `"${t}"`).join(", ")}, written as they are here`] };
}

/** Checks one hand-drawn <svg>. Returns { type, errors }, each error a sentence that names its rule and its element. */
function checkDrawing(source, { html = "" } = {}) {
  const svg = blank(source); // a comment is a note for the author: neither text nor tags
  const found = new Map(); // one message for each rule and reason, with the first element that breaks it and a count of the others
  const fail = (rule, why) => { const key = `${rule}|${why.slice(why.indexOf(";") + 1)}`, had = found.get(key); if (had) had[2] += 1; else found.set(key, [rule, why, 1]); };
  const errors = () => [...found.values()].map(([rule, why, n]) => `${RULE[rule]}: ${why}${n > 1 ? ` (and ${n - 1} more like it)` : ""}`);
  const stack = [], ids = [], children = [];
  let root = null, at = 0, type = null;
  for (const m of svg.matchAll(TAG)) {
    const between = svg.slice(at, m.index);
    at = m.index + m[0].length;
    const open = stack.at(-1);
    if (between.trim() && !(open && TEXT_HOLDERS.has(open.name))) fail(0, `it holds text ("${between.trim().slice(0, 30)}") outside a <text>`);
    if (open) open.text += between;
    const [, close, name, rawAttrs, selfClose] = m;
    if (close) {
      if (open?.name !== name) { fail(0, `</${name}> does not close the element that is open`); break; }
      stack.pop();
      continue;
    }
    if (open && ["title", "desc"].includes(open.name)) fail(8, `<${name}> stands inside a <${open.name}>, which holds text only`);
    if (!root && name !== "svg") { fail(0, "it does not start with <svg>"); break; }
    const node = { name, attrs: {}, text: "" };
    const depth = stack.length; // 0 for the <svg>, 1 for its children
    if (!selfClose) stack.push(node);
    if (root && name === "svg") { fail(0, "it holds a second <svg>; a hand-drawn figure is one drawing"); continue; }
    if (!ELEMENTS.has(name)) { const [rule, why] = REFUSED[name] || [0, "a hand-drawn figure does not take it"]; fail(rule, `<${name}> is not allowed: ${why}`); continue; }
    const read = attributes(rawAttrs);
    if (read.error) { fail(0, `<${name}>: ${read.error}`); continue; }
    const seen = new Set();
    for (const [attr, value] of read.list) {
      if (seen.has(attr.toLowerCase())) { fail(0, `<${name}> has the attribute "${attr}" twice; the browser keeps the first, so write it once`); continue; }
      seen.add(attr.toLowerCase());
      const shown = `<${name}> has ${attr}="${value.length > 48 ? `${value.slice(0, 48)}…` : value}"`;
      if (!GEOMETRY.has(attr) && !PLAIN.has(attr) && !attr.startsWith("aria-")) { const [rule, why] = refusedAttribute(attr.toLowerCase()); fail(rule, `${shown}; ${why}`); continue; }
      const bad = badValue(name, attr, value);
      if (bad) { fail(bad[0], `${shown}; ${bad[1]}`); continue; }
      node.attrs[attr] = value;
      if (attr === "id") ids.push(value);
    }
    if (!root) { root = node.attrs; type = node.attrs["data-type"] ?? null; }
    else if (depth === 1) children.push(node);
  }
  if (!found.size) {
    if (svg.slice(at).trim()) fail(0, "it holds something after </svg>, or markup that check cannot read");
    else if (stack.length) fail(0, `<${stack.at(-1).name}> is never closed`);
  }
  if (!root) return { type, errors: [`${RULE[0]}: it holds no <svg>`] };

  // Rule 1: the type.
  const kind = typeOf(type);
  if (kind.stop) return { type, errors: [`${RULE[kind.error[0]]}: ${kind.error[1]}`] };
  if (kind.error) fail(...kind.error);

  // Rule 4: real size, on screen and on paper.
  const box = (root.viewBox || "").trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || box.some((n) => !Number.isFinite(n)) || box[2] <= 0 || box[3] <= 0) fail(4, 'the <svg> has no viewBox, such as viewBox="0 0 640 320"');
  else {
    const [w, h] = [root.width, root.height].map((v) => (v == null ? NaN : Number(v)));
    if (w !== box[2] || h !== box[3]) fail(4, `the <svg> has width="${root.width ?? ""}" height="${root.height ?? ""}"; they equal the viewBox, width="${box[2]}" height="${box[3]}", so the text shows at its real size`);
    if (box[2] > MOST.width || box[3] > MOST.height) fail(4, `the drawing is ${box[2]} × ${box[3]}px; it is at most ${MOST.width}px wide and ${MOST.height}px high, so print never shrinks it. Make it smaller, or split it into two figures`);
  }

  // Rule 8: an accessible name.
  if (root.role !== "img") fail(8, `the <svg> has ${root.role ? `role="${root.role}"` : "no role"}; it has role="img"`);
  const first = children[0], title = first && first.name === "title" ? first : null, desc = children.find((c) => c.name === "desc");
  if (!title) fail(8, "the first element in the <svg> is not a <title>; the title comes first");
  if (!desc) fail(8, "the <svg> has no <desc>; it says in a sentence or two what the drawing shows");
  for (const node of [title, desc].filter(Boolean)) {
    if (!node.attrs.id) fail(8, `the <${node.name}> has no id, so aria-labelledby cannot name it`);
    else if (!words(node.text)) fail(8, `the <${node.name}> is empty`);
  }
  const named = (root["aria-labelledby"] || "").trim().split(/\s+/).filter(Boolean);
  if (title?.attrs.id && desc?.attrs.id && !(named.includes(title.attrs.id) && named.includes(desc.attrs.id))) fail(8, `the <svg> has ${root["aria-labelledby"] ? `aria-labelledby="${root["aria-labelledby"]}"` : "no aria-labelledby"}; it names the title and the desc: aria-labelledby="${title.attrs.id} ${desc.attrs.id}"`);
  for (const id of new Set(ids)) {
    const count = (blank(html).match(new RegExp(`(?<![\\w:-])id\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "g")) || []).length;
    if (count > 1 || ids.filter((x) => x === id).length > 1) fail(8, `the id "${id}" is used ${Math.max(count, 2)} times in the page; an id is page-wide, so each one is used once`);
  }
  return { type, errors: errors() };
}

/** The closed section with the diagram in words, in a well: why it breaks rule 9, or null. */
function wordsProblem(source) {
  const inner = blank(source); // a table that is commented out says nothing to the reader
  const all = [...inner.matchAll(/<details\b([^>]*)>/gi)].filter(([, a]) => /\bclass="(?:[^"]*\s)?dg-words(?:\s[^"]*)?"/.test(a));
  if (!all.length) return 'the figure has no <details class="dg-words"> with a table or a list that says everything the drawing says';
  const [tag, attrs] = all[0], start = all[0].index + tag.length, end = inner.indexOf("</details>", start);
  if (/\bopen\b/.test(attrs.replace(/"[^"]*"/g, ""))) return 'the <details class="dg-words"> is open; it is closed, as under every drawing';
  const body = inner.slice(start, end < 0 ? inner.length : end);
  const cells = [...body.matchAll(/<(td|th|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)].filter(([, , text]) => words(text));
  if (!/<(table|ol|ul)\b/i.test(body) || !cells.length) return 'the <details class="dg-words"> holds no table or list with words in it';
  return null;
}

/**
 * Checks every drawing in the figure wells that no diagram block made. A drawing marked data-drawn="hand" is tested against the
 * contract; any other is refused, as before. Returns { errors, warnings, drawn }: drawn are the hand-drawn SVGs, which check then
 * leaves out of the tests of the author's own content, as it leaves out the drawings that render made.
 */
function checkFigures(wells, { html = "" } = {}) {
  const errors = [], warnings = [], drawn = [];
  wells.forEach(({ attrs, inner }, n) => {
    const label = (attrs.match(/aria-label="([^"]*)"/) || [])[1];
    // The chevron in the summary of the diagram in words is an icon, not a drawing.
    const body = inner.replace(/<summary\b[\s\S]*?<\/summary>/gi, (s) => " ".repeat(s.length));
    const svgs = svgsIn(body).map((s) => ({ ...s, text: inner.slice(s.start, s.end) }));
    let hand = 0;
    for (const s of svgs) {
      const open = s.text.match(/^<svg\b[^>]*>/i)[0];
      if (!/\bdata-drawn\s*=\s*["']hand["']/.test(open)) {
        errors.push(`${label || "a figure"} holds a drawing that no diagram block made; write its data in a block and run render. Only a type in the hand-drawn list may be drawn by hand, marked data-drawn="hand" (see "Hand-drawn figures" in diagrams.md)`);
        continue;
      }
      hand += 1;
      drawn.push(s.text);
      const name = label || `figure ${n + 1}`;
      const result = checkDrawing(s.text, { html });
      result.errors.forEach((e) => errors.push(`${name}, hand-drawn: ${e}`));
      if (!result.errors.some((e) => e.startsWith(RULE[1]))) warnings.push(`${name} is hand-drawn (${result.type}); check cannot see its layout, so open the page in a browser in light and in dark, at 375px and in print preview, and look at it. Tell the user this figure is hand-drawn`);
    }
    if (hand) { const why = wordsProblem(inner); if (why) errors.push(`${label || `figure ${n + 1}`}, hand-drawn: ${RULE[9]}: ${why}`); }
  });
  return { errors, warnings, drawn };
}

module.exports = { TYPES, CLASSES, BUILT, PLANNED, LEFT_OUT, MOST, checkDrawing, checkFigures, svgsIn };
