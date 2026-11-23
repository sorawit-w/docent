// Hand-drawn figures: an SVG that the agent draws by hand in a figure well, for a rare type that has no built-in kind
// (docs/proposals/charts.md, section 5). It keeps a contract that check tests here: a marker and a type from the list, the page's
// drawing tokens only, no text under 12px, real size, system fonts in two weights, no network and no script, nothing dashed, an
// accessible name, and the diagram in words beside it. The tags are read as strictly as a logo's (logo.cjs).
const { TAG, attributes } = require("./logo.cjs");
const { DOCENT, PALETTES } = require("./palettes.cjs");

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
const TOKENS = ["text", "muted", "line", "bg", "fig"]; // the five drawing tokens
const MEANING = { primary: "the current leg", dot: "the dot", ok: "a status", warn: "a status", err: "a status", "heat-1": "a heat step", "heat-2": "a heat step", "heat-3": "a heat step", "heat-4": "a heat step", "heat-5": "a heat step", "heat-text": "the text on a heat step", "heat-page": "the text on a heat step" };
const MOST = { width: 640, height: 831 }; // px: the paper form of a scale chart, and 220mm of an A4 page at 96px to the inch
const LEAST_TEXT = 12; // px
const ELEMENTS = new Set(["svg", "g", "defs", "symbol", "use", "marker", "clipPath", "path", "line", "polyline", "polygon", "rect", "circle", "ellipse", "text", "tspan", "textPath", "title", "desc", "style"]);
const TEXT_HOLDERS = new Set(["text", "tspan", "textPath", "title", "desc", "style"]);
const FILLED = new Set(["path", "polyline", "polygon", "rect", "circle", "ellipse", "text"]); // a fill that is not set shows black
const NETWORK = { script: "a script runs code", foreignObject: "foreignObject can hold any HTML", image: "an image loads a file", a: "a link does not belong in a drawing", iframe: "a frame loads a page", video: "a video loads a file", audio: "a sound loads a file", animate: "a drawing does not move", animateMotion: "a drawing does not move", animateTransform: "a drawing does not move", set: "a drawing does not move" };
const FLAT = { linearGradient: "a gradient", radialGradient: "a gradient", filter: "a filter", pattern: "a pattern", mask: "a mask" };
const RULE = {
  1: "rule 1, a marker", 2: "rule 2, page tokens only", 3: "rule 3, no text under 12px", 4: "rule 4, real size", 5: "rule 5, system fonts and two weights",
  6: "rule 6, no network and no script", 7: "rule 7, nothing dashed", 8: "rule 8, an accessible name", 9: "rule 9, the diagram in words", 0: "the markup",
};
const COLOR_PROPS = new Set(["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color", "background", "background-color", "border-color", "outline-color"]);
// A color written in any other property, such as border: 1px solid #000: a hex value or a color function.
const LITERAL = /(^|[\s,(])#[0-9a-f]{3,8}\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;
const OPACITY = new Set(["opacity", "fill-opacity", "stroke-opacity", "stop-opacity"]);
const TOKEN_LIST = "var(--text), var(--muted), var(--line), var(--bg) or var(--fig)";

const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
/** An attribute value as the browser reads it: numeric and common named entities decoded. Null when it holds another named entity. */
const decode = (v) => { let unknown = false; const out = v.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, e) => (e[0] === "#" ? String.fromCodePoint(parseInt(e[1] === "x" || e[1] === "X" ? e.slice(2) : e.slice(1), e[1] === "x" || e[1] === "X" ? 16 : 10)) : Object.hasOwn(NAMED, e) ? NAMED[e] : ((unknown = true), all))); return unknown ? null : out; };
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

/** Why a color value breaks rule 2, or null when it is a drawing token, none, currentColor or transparent. */
function badColor(value, palette) {
  const v = value.trim().replace(/\s*!important$/i, "");
  if (/^(none|currentColor|transparent)$/i.test(v)) return null;
  const token = v.match(/^var\(\s*--([\w-]+)\s*(?:,\s*([^)]*?)\s*)?\)$/);
  if (token && TOKENS.includes(token[1])) {
    if (token[2] == null) return null;
    const light = [DOCENT[token[1]], palette && PALETTES[palette] && PALETTES[palette].light[token[1]]].filter(Boolean).map((c) => c.toLowerCase());
    return light.includes(token[2].toLowerCase()) ? null : `its fallback ${token[2]} is not the light value of --${token[1]} (${light[light.length - 1]})`;
  }
  if (token && MEANING[token[1]]) return `--${token[1]} has its own meaning, ${MEANING[token[1]]}, so a hand-drawn figure does not use it`;
  return "a color in a hand-drawn figure is a drawing token";
}

/** The declarations of a style attribute or a style rule, as [property, value]. */
const declarations = (css) => css.replace(/\/\*[\s\S]*?\*\//g, " ").split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const at = d.indexOf(":"); return at < 0 ? [d.toLowerCase(), ""] : [d.slice(0, at).trim().toLowerCase(), d.slice(at + 1).trim()]; });

/** Tests one property and its value, in an attribute or in a style. Calls fail(rule, why) for each break. */
function testProperty(prop, value, where, fail, palette) {
  const shown = `${where} has ${prop}="${value.length > 48 ? `${value.slice(0, 48)}…` : value}"`;
  if (value.includes("\\") || prop.includes("\\")) return fail(0, `${shown}; a drawing's style holds no backslash escapes, so check reads it as the browser does`);
  if ((prop === "transform" && /\b(scale|matrix|skew)[\w]*\s*\(/i.test(value)) || prop === "scale" || prop === "zoom") return fail(4, `${shown}; a drawing does not scale its parts, so its text keeps its real size; move or rotate a part instead`);
  if (prop === "textlength" || prop === "lengthadjust") return fail(3, `${shown}; it squeezes the letters, so the text no longer shows at its size`);
  if (prop.startsWith("--")) return fail(2, `${shown}; a drawing sets no token of its own, so var(--text) and the others keep the page's tested colors in every theme`);
  if (/gradient\s*\(/i.test(value)) return fail(2, `${shown}; the page is flat, with no gradient`);
  if (/url\s*\(/i.test(value)) {
    for (const [, target] of value.matchAll(/url\(\s*["']?([^"')]*)/gi)) if (!target.trim().startsWith("#")) fail(6, `${shown}; a url() points inside the drawing, such as url(#arrow)`);
    if (COLOR_PROPS.has(prop)) return fail(2, `${shown}; a color is ${TOKEN_LIST}, not a url()`);
  }
  if (COLOR_PROPS.has(prop)) { const why = badColor(value, palette); if (why) fail(2, `${shown}; ${why}: ${TOKEN_LIST}, none or currentColor`); return; }
  if (LITERAL.test(value.replace(/url\([^)]*\)|var\([^)]*\)/gi, ""))) return fail(2, `${shown}; a color in a hand-drawn figure is a drawing token: ${TOKEN_LIST}`);
  if (OPACITY.has(prop)) return fail(2, `${shown}; each color shows as its token, so its contrast holds; use var(--muted) or var(--line) for a fainter mark`);
  if (prop === "font-size") {
    const size = value.match(/^([\d.]+)(px)?$/);
    if (!size) return fail(3, `${shown}; write the size in px, such as 14px`);
    if (Number(size[1]) < LEAST_TEXT) fail(3, `${shown}; no text in a drawing is under ${LEAST_TEXT}px: names 14px, notes 12px`);
    return;
  }
  if (prop === "font-family") { if (!/^var\(\s*--(sans|serif|mono)\s*\)$/.test(value)) fail(5, `${shown}; a drawing takes the page's sans-serif, so leave font-family out, or write var(--sans)`); return; }
  if (prop === "font") return fail(5, `${shown}; font sets a family; write font-size and font-weight on their own`);
  if (prop === "font-weight") { if (!/^(400|600)$/.test(value)) fail(5, `${shown}; a drawing has two weights, 400 and 600`); return; }
  if (prop === "stroke-dasharray") return fail(7, `${shown}; in Docent a dashed line means a path that only some readers take`);
  if (/^(animation|transition)(-|$)/.test(prop)) return fail(6, `${shown}; a drawing does not move`);
  if (/^(filter|box-shadow|text-shadow|mask)$/.test(prop)) fail(2, `${shown}; the page is flat`);
}

/** True when a selector picks the drawing or what is inside it: it starts with the drawing's id, and no + or ~ leads from the drawing to its siblings. */
function inside(sel, id) {
  if (!sel.startsWith(`#${id}`)) return false;
  const rest = sel.slice(id.length + 1);
  if (rest && !/^[\s.:[>+~#]/.test(rest)) return false; // #hd-repeat-2 is another id
  return !/^[+~]/.test(rest.replace(/^[^\s>+~]*/, "").trim());
}

/** Tests the rules of a <style> element: each one starts with the drawing's id, because a style element applies to the whole page. */
function testStyle(css, id, fail, palette) {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (body.includes("\\")) { fail(0, "a <style> holds a backslash escape; a drawing's style holds none, so check reads it as the browser does"); return; }
  if (/@/.test(body)) { fail(/@(import|font-face)/i.test(body) ? (/@import/i.test(body) ? 6 : 5) : 0, `a <style> holds ${(body.match(/@[\w-]+/) || ["@"])[0]}; a drawing's style holds plain rules only`); return; }
  for (const [, selectors, decls] of body.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    for (const sel of selectors.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!id || !inside(sel, id)) fail(0, `a <style> rule "${sel.slice(0, 40)}" reaches past the drawing${id ? "" : ", and the <svg> has no id"}; a style element applies to the whole page, so each rule starts with the drawing's id, such as #${id || "hd-causes"} .note, and no + or ~ leads from the drawing to the page`);
    }
    for (const [prop, value] of declarations(decls)) testProperty(prop, value, `a <style> rule for "${selectors.trim().slice(0, 30)}"`, fail, palette);
  }
  if (body.replace(/([^{}]*)\{([^{}]*)\}/g, "").trim()) fail(0, "a <style> holds something that is not a rule");
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
function checkDrawing(source, { html = "", palette = null } = {}) {
  const svg = blank(source); // a comment is a note for the author: neither text nor tags
  const found = new Map(); // one message for each rule and reason, with the first element that breaks it and a count of the others
  const fail = (rule, why) => { const key = `${rule}|${why.slice(why.indexOf(";") + 1)}`, had = found.get(key); if (had) had[2] += 1; else found.set(key, [rule, why, 1]); };
  const errors = () => [...found.values()].map(([rule, why, n]) => `${RULE[rule]}: ${why}${n > 1 ? ` (and ${n - 1} more like it)` : ""}`);
  const stack = [], ids = [], children = [], nodes = [];
  let root = null, at = 0, type = null, styleId = null;
  for (const m of svg.matchAll(TAG)) {
    const between = svg.slice(at, m.index);
    at = m.index + m[0].length;
    const open = stack.at(-1);
    if (open && open.name === "style") { if (m[1] && m[2] === "style") testStyle(between, styleId, fail, palette); else fail(0, "a <style> holds markup"); }
    else if (between.trim() && !(open && TEXT_HOLDERS.has(open.name))) fail(0, `it holds text ("${between.trim().slice(0, 30)}") outside a <text>`);
    const [, close, name, rawAttrs, selfClose] = m;
    if (close) {
      if (open?.name !== name) { fail(0, `</${name}> does not close the element that is open`); break; }
      if (TEXT_HOLDERS.has(name)) open.text = between;
      stack.pop();
      continue;
    }
    if (open && ["title", "desc"].includes(open.name)) fail(8, `<${name}> stands inside a <${open.name}>, which holds text only`);
    if (!root && name !== "svg") { fail(0, "it does not start with <svg>"); break; }
    if (root && name === "svg") fail(0, "it holds a second <svg>; a hand-drawn figure is one drawing");
    else if (NETWORK[name]) fail(6, `<${name}> is not allowed: ${NETWORK[name]}`);
    else if (FLAT[name]) fail(2, `<${name}> is not allowed: ${FLAT[name]} is not flat`);
    else if (!ELEMENTS.has(name)) fail(0, `<${name}> is not an element a hand-drawn figure takes`);
    const read = attributes(rawAttrs);
    if (read.error) { fail(0, `<${name}>: ${read.error}`); continue; }
    const attrs = Object.fromEntries(read.list.map(([k, v]) => [k, decode(v) ?? v]));
    for (const [attr, raw] of read.list) {
      const low = attr.toLowerCase(), value = decode(raw);
      if (value == null) { fail(0, `<${name}> has ${attr}="${raw.slice(0, 48)}", with a named character reference that check cannot read; write the character itself`); continue; }
      if (low.startsWith("on")) { fail(6, `<${name}> has the event attribute "${attr}", which runs code`); continue; }
      if (low === "href" || low.endsWith(":href")) { if (!value.trim().startsWith("#")) fail(6, `<${name}> has ${attr}="${value.slice(0, 48)}"; an href points inside the drawing, such as #bone`); continue; }
      if (low === "id") { ids.push(value); continue; }
      if (low === "style") { for (const [prop, v] of declarations(value)) testProperty(prop, v, `<${name}> style`, fail, palette); continue; }
      testProperty(low, value, `<${name}>`, fail, palette);
    }
    const node = { name, attrs, parent: open || null, styled: attrs.style || "", text: "", needsFill: FILLED.has(name) };
    if (root && attrs.viewBox != null && name !== "marker") fail(4, `<${name}> has a viewBox, which scales what it holds, so its text no longer shows at its real size; only the <svg> and a <marker> have one`);
    if (!root) { root = attrs; type = attrs["data-type"] ?? null; styleId = attrs.id || null; }
    else if (stack.length === 1) children.push(node);
    nodes.push(node);
    if (!selfClose) stack.push(node);
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

  // Rule 2: a shape or a text whose fill is not set shows black, which disappears in dark mode. A <style> may set it, which check cannot match.
  const sets = (n, key) => { for (let p = n; p; p = p.parent) if (p.attrs[key] != null || new RegExp(`(^|;)\\s*${key}\\s*:`).test(p.styled)) return true; return false; };
  if (!nodes.some((n) => n.name === "style")) for (const n of nodes) if (n.needsFill && !sets(n, "fill")) fail(2, `<${n.name}> has no fill, so it shows black and disappears in dark mode; write fill="var(--text)" on it or on a group around it (fill="none" for a line)`);

  // Rule 4: real size, on screen and on paper.
  const box = (root.viewBox || "").trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || box.some((n) => !Number.isFinite(n)) || box[2] <= 0 || box[3] <= 0) fail(4, 'the <svg> has no viewBox, such as viewBox="0 0 640 320"');
  else {
    const [w, h] = [root.width, root.height].map((v) => (v == null ? NaN : Number(String(v).replace(/px$/, ""))));
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
    const count = (html.match(new RegExp(`\\bid\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "g")) || []).length;
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
function checkFigures(wells, { html = "", palette = null } = {}) {
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
      const result = checkDrawing(s.text, { html, palette });
      result.errors.forEach((e) => errors.push(`${name}, hand-drawn: ${e}`));
      if (!result.errors.some((e) => e.startsWith(RULE[1]))) warnings.push(`${name} is hand-drawn (${result.type}); check cannot see its layout, so open the page in a browser in light and in dark, at 375px and in print preview, and look at it. Tell the user this figure is hand-drawn`);
    }
    if (hand) { const why = wordsProblem(inner); if (why) errors.push(`${label || `figure ${n + 1}`}, hand-drawn: ${RULE[9]}: ${why}`); }
  });
  return { errors, warnings, drawn };
}

module.exports = { TYPES, BUILT, PLANNED, LEFT_OUT, MOST, checkDrawing, checkFigures, svgsIn };
