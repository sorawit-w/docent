// The host's logo in the top bar: an inline SVG made of plain shapes, or a small PNG or WebP data URI.
// A logo is the host's own artwork, so it may use more than an icon (gradients, clip paths), but it can never
// run a script, load a file or hold text that depends on a font. Everything that is not on the lists below is refused.

const MOST = 24000; // characters of an SVG logo, or of the data URI of a raster logo
const SLOT = { height: 24, width: 160, lowest: 16 }; // px: 24px high, at most 160px wide; below 16px a wordmark is hard to read
const SHARP = 3; // a raster logo holds at least three times the pixels it shows, so it stays sharp on a phone and on paper
const PAGES = { light: "#fbfbfe", dark: "#12141f" }; // a logo shows on the page color of each theme
const MARK = 3; // a logo is a mark, not text: 3:1 (WCAG 1.4.11)

const ELEMENTS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "title", "desc", "defs", "clipPath", "linearGradient", "radialGradient", "stop", "use"]);
const SHAPES = new Set(["path", "circle", "ellipse", "rect", "line", "polyline", "polygon", "use"]);
const ATTRIBUTES = new Set([
  "viewBox", "width", "height", "role", "aria-label", "aria-hidden", "focusable", "data-for", "id",
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points", "fx", "fy",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset",
  "opacity", "fill-opacity", "stroke-opacity", "fill-rule", "clip-rule", "clip-path", "transform",
  "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod", "clipPathUnits",
]);
const FIXED = { xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink" }; // allowed with this value only
const COLORS = new Set(["fill", "stroke", "stop-color"]);
const URLS = new Set(["fill", "stroke", "clip-path"]); // the attributes that may point at a gradient or a clip path inside the logo
const WHY = {
  script: "a script runs code",
  style: "a style element can load files and change the page",
  foreignObject: "foreignObject can hold any HTML",
  image: "an image loads a file",
  a: "a link does not belong in a logo",
  filter: "a filter or a shadow is not flat",
  pattern: "a pattern is not flat",
  mask: "a mask is not allowed; use a clipPath",
  animate: "a logo does not move", animateTransform: "a logo does not move", animateMotion: "a logo does not move", set: "a logo does not move",
  text: "text depends on a font the reader may not have; turn the letters into paths", tspan: "text depends on a font the reader may not have; turn the letters into paths", textPath: "text depends on a font the reader may not have; turn the letters into paths",
  svg: "a logo holds one svg",
};

const ID = /^[A-Za-z][\w-]*$/;
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTR = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const hex6 = (c) => (c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c).toLowerCase();
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex6(hex).slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** The width and height a logo of this shape takes in the slot: 24px high, or lower when that is wider than 160px. */
function slotSize(ratio) {
  const width = SLOT.height * ratio;
  return width <= SLOT.width ? { width: +width.toFixed(1), height: SLOT.height } : { width: SLOT.width, height: +(SLOT.width / ratio).toFixed(1) };
}

/** The attributes of one tag as [name, value], or a reason why they cannot be read. */
function attributes(text) {
  const out = [];
  for (const m of text.matchAll(ATTR)) {
    const [, name, dq, sq, bare] = m;
    if (dq == null && sq == null) return { error: bare == null ? `the attribute "${name}" has no value` : `the attribute "${name}" has no quotes around its value` };
    out.push([name, dq ?? sq]);
  }
  return { list: out };
}

/** Checks one inline SVG logo. Returns { error } or { colors, viewBox, width, height, label, hidden, forTheme }. */
function svgLogo(markup) {
  if (markup.length > MOST) return { error: `it has ${markup.length} characters; a logo has at most ${MOST}` };
  const stack = [], ids = new Set(), refs = new Set(), stops = new Map(), nodes = [], byId = new Map();
  let root = null, at = 0, gradient = null;
  for (const m of markup.matchAll(TAG)) {
    const between = markup.slice(at, m.index);
    at = m.index + m[0].length;
    const inText = ["title", "desc"].includes(stack.at(-1)?.name);
    if (between.trim() && !inText) return { error: `it holds text ("${between.trim().slice(0, 30)}") outside a title; turn the letters into paths` };
    if (/[<]/.test(between)) return { error: "it holds markup that check cannot read" };
    const [, close, name, rawAttrs, selfClose] = m;
    if (close) {
      if (stack.at(-1)?.name !== name) return { error: `</${name}> does not close the element that is open` };
      if (stack.pop().name === gradient?.name) gradient = null;
      continue;
    }
    if (!ELEMENTS.has(name) || (name === "svg" && root)) return { error: `<${name}> is not allowed in a logo${WHY[name] ? `: ${WHY[name]}` : ""}` };
    if (!root && name !== "svg") return { error: "it does not start with <svg>" };
    const read = attributes(rawAttrs);
    if (read.error) return { error: `<${name}>: ${read.error}` };
    const attrs = Object.fromEntries(read.list);
    for (const [attr, value] of read.list) {
      const low = attr.toLowerCase();
      if (low.startsWith("on")) return { error: `<${name}> has the event attribute "${attr}", which runs code` };
      if (low === "style") return { error: `<${name}> has a style attribute; write each color as its own attribute, such as fill="#0b6e4f"` };
      if (FIXED[attr] != null) { if (value !== FIXED[attr]) return { error: `<${name}> has ${attr}="${value}"` }; continue; }
      if (attr === "class" && name === "svg") { if (!/^[\w -]*$/.test(value)) return { error: `<svg> has the class "${value}"` }; continue; }
      if ((attr === "href" || attr === "xlink:href") && name === "use") {
        if (!/^#[A-Za-z][\w-]*$/.test(value)) return { error: `<use> points at "${value.slice(0, 40)}"; in a logo it points at an id inside the same logo, such as href="#part"` };
        refs.add(value.slice(1));
        continue;
      }
      if (attr === "href" || attr === "xlink:href") return { error: `<${name}> has ${attr}="${value.slice(0, 40)}"; a logo links to nothing and loads nothing` };
      if (!ATTRIBUTES.has(attr)) return { error: `<${name}> has the attribute "${attr}", which a logo does not take` };
      if (attr === "aria-label") { if (/[<>]/.test(value)) return { error: `<${name}> has an aria-label with markup in it` }; continue; }
      if (attr === "id") { if (!ID.test(value)) return { error: `the id "${value}" holds characters that an id does not need` }; if (ids.has(value)) return { error: `the id "${value}" is used twice` }; ids.add(value); continue; }
      if (/url\s*\(/i.test(value)) {
        if (!URLS.has(attr)) return { error: `<${name}> has ${attr}="${value.slice(0, 40)}"; only fill, stroke and clip-path may hold a url()` };
        const target = value.match(/^url\(#([A-Za-z][\w-]*)\)$/);
        if (!target) return { error: `<${name}> has ${attr}="${value.slice(0, 40)}"; a url() in a logo points at an id inside the same logo, such as url(#shade)` };
        refs.add(target[1]);
        continue;
      }
      if (COLORS.has(attr) && !/^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|currentColor|none|transparent)$/.test(value)) return { error: `<${name}> has ${attr}="${value}"; write a color as a hex value, such as #0b6e4f, or as currentColor` };
      if (!/^[\w .,#%()+-]*$/.test(value)) return { error: `the value of "${attr}" holds characters that a shape does not need` };
    }
    const parent = stack.at(-1) || null;
    const node = { name, parent, own: { fill: attrs.fill, stroke: attrs.stroke }, href: name === "use" ? (attrs.href || attrs["xlink:href"] || "").slice(1) : null, hidden: !!parent?.hidden || ["defs", "clipPath"].includes(name) };
    nodes.push(node);
    if (attrs.id) byId.set(attrs.id, node);
    if (name === "svg") root = attrs;
    if (name === "linearGradient" || name === "radialGradient") { gradient = { name, id: attrs.id }; if (attrs.id) stops.set(attrs.id, []); }
    if (name === "stop" && gradient?.id && attrs["stop-color"]) stops.get(gradient.id).push(attrs["stop-color"]);
    if (!selfClose) stack.push(node);
  }
  if (markup.slice(at).trim()) return { error: "it holds something after </svg>, or markup that check cannot read" };
  if (stack.length) return { error: `<${stack.at(-1).name}> is never closed` };
  if (!root) return { error: "it holds no <svg>" };
  for (const ref of refs) if (!ids.has(ref)) return { error: `it points at "#${ref}", which is not inside the logo` };
  const box = (root.viewBox || "").trim().split(/[\s,]+/).map(Number);
  if (box.length !== 4 || box.some((n) => !Number.isFinite(n)) || box[2] <= 0 || box[3] <= 0) return { error: "the <svg> has no viewBox, such as viewBox=\"0 0 96 24\"" };
  // The colors that show: the fill of each shape (black when none is set), its stroke, and the stops of a gradient it uses.
  // A shape inherits fill and stroke from the elements around it. A <use> draws the element it points at and all inside it,
  // which inherit up to that element and then from the <use>.
  const colors = new Set();
  const add = (value) => {
    if (!value || value === "none" || value === "transparent") return;
    const ref = value.match(/^url\(#([\w-]+)\)$/);
    if (ref) return (stops.get(ref[1]) || []).forEach((stop) => /^url/.test(stop) || add(stop)); // a stop is a color, never a url()
    colors.add(value === "currentColor" ? value : hex6(value));
  };
  const up = (node, key, stop = null) => { for (let n = node; n && n !== stop?.parent; n = n.parent) if (n.own[key] != null) return n.own[key]; return null; };
  const inside = (node, target) => { for (let n = node; n; n = n.parent) if (n === target) return true; return false; };
  const paint = (node, inherited, seen) => {
    const fill = node.own.fill ?? inherited.fill, stroke = node.own.stroke ?? inherited.stroke;
    if (node.name !== "use") { add(fill ?? (node.name === "line" ? null : "#000000")); add(stroke); return; }
    const target = byId.get(node.href);
    if (!target || seen.has(target)) return; // a use that points at itself, directly or through another use, draws nothing more
    const next = new Set(seen).add(target);
    for (const shape of nodes) {
      if (!SHAPES.has(shape.name) || !inside(shape, target)) continue;
      const from = shape === target ? null : shape.parent;
      paint(shape, { fill: (from && up(from, "fill", target)) ?? fill, stroke: (from && up(from, "stroke", target)) ?? stroke }, next);
    }
  };
  for (const node of nodes) if (SHAPES.has(node.name) && !node.hidden) paint(node, { fill: up(node.parent, "fill"), stroke: up(node.parent, "stroke") }, new Set());
  return { colors, ratio: box[2] / box[3], width: Number(root.width), height: Number(root.height), label: root["aria-label"], role: root.role, hidden: root["aria-hidden"] === "true", forTheme: root["data-for"] };
}

/** The pixel size of a PNG or WebP, read from its first bytes, or null when the bytes are not that kind of image. */
function rasterSize(kind, bytes) {
  if (kind === "png") {
    if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47 || bytes.toString("latin1", 12, 16) !== "IHDR") return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length < 30 || bytes.toString("latin1", 0, 4) !== "RIFF" || bytes.toString("latin1", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("latin1", 12, 16);
  if (chunk === "VP8 ") return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") { const b = bytes.subarray(21, 25); return { width: 1 + (b[0] | ((b[1] & 0x3f) << 8)), height: 1 + ((b[1] >> 6) | (b[2] << 2) | ((b[3] & 0x0f) << 10)) }; }
  if (chunk === "VP8X") return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  return null;
}

/** Checks one raster logo, an <img>. Returns { error } or { ratio, width, height, label, hidden, forTheme }. */
function rasterLogo(tag) {
  const read = attributes(tag.replace(/^<img\b/i, "").replace(/\/?>$/, ""));
  if (read.error) return { error: `<img>: ${read.error}` };
  const attrs = Object.fromEntries(read.list);
  for (const [attr] of read.list) {
    if (attr.toLowerCase().startsWith("on")) return { error: `the <img> has the event attribute "${attr}", which runs code` };
    if (!["class", "src", "width", "height", "alt", "data-for"].includes(attr)) return { error: `the <img> has the attribute "${attr}", which a logo does not take` };
  }
  const src = attrs.src || "";
  if (src.length > MOST) return { error: `its data URI has ${src.length} characters; a logo has at most ${MOST}` };
  const data = src.match(/^data:image\/(png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!data) {
    const kind = (src.match(/^data:image\/([\w+.-]+)/) || [])[1];
    if (kind === "svg+xml") return { error: "it is an SVG inside a data URI, which check cannot read; write the SVG inline" };
    if (kind === "jpeg" || kind === "jpg") return { error: "it is a JPEG, which has no transparent parts and shows a box on the page; use a PNG or WebP" };
    if (kind) return { error: `it is image/${kind}; a raster logo is a PNG or WebP` };
    return { error: "its src is not a data URI; a logo is inside the file, as inline SVG or a PNG or WebP data URI" };
  }
  const size = rasterSize(data[1], Buffer.from(data[2], "base64"));
  if (!size) return { error: `its data is not a ${data[1].toUpperCase()} image` };
  if (attrs.alt == null) return { error: "the <img> has no alt; write the host's name for a wordmark, or alt=\"\" beside the name" };
  return { ratio: size.width / size.height, natural: size, width: Number(attrs.width), height: Number(attrs.height), label: attrs.alt, hidden: attrs.alt === "", forTheme: attrs["data-for"], raster: true };
}

/** The elements of a page that are logos: each svg or img inside the host name, and each element with the class "logo". */
function findLogos(markup) {
  const host = markup.match(/<([a-z]+)\b[^>]*\bclass="(?:[^"]*\s)?host(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/\1>/i);
  const found = [];
  const re = /<svg\b[\s\S]*?<\/svg>|<img\b(?:"[^"]*"|'[^']*'|[^>"'])*>|<[a-z][\w-]*\b[^>]*\bclass="(?:[^"]*\s)?logo(?:\s[^"]*)?"[^>]*>/gi;
  for (const m of markup.matchAll(re)) {
    const inHost = host && m.index >= host.index && m.index < host.index + host[0].length;
    if (inHost || /^<(svg|img)\b[^>]*\bclass="(?:[^"]*\s)?logo(?:\s[^"]*)?"/i.test(m[0]) || (!/^<(svg|img)\b/i.test(m[0]))) found.push({ text: m[0], start: m.index, end: m.index + m[0].length, inHost: !!inHost });
  }
  return { host, found };
}

/** Tests every logo of a page. Returns { errors, warnings, name, logos } where name is the host name a wordmark carries. */
function checkLogos(markup) {
  const errors = [], warnings = [];
  const { host, found } = findLogos(markup);
  const logos = [];
  for (const item of found) {
    if (!item.inHost) { errors.push("a logo stands outside the top bar; it appears once, in the top bar, before the host's name"); continue; }
    const kind = /^<svg\b/i.test(item.text) ? "svg" : /^<img\b/i.test(item.text) ? "img" : null;
    if (!kind) { errors.push(`the top bar holds a logo that is not an <svg> or an <img>: ${item.text.slice(0, 40)}`); continue; }
    const result = kind === "svg" ? svgLogo(item.text) : rasterLogo(item.text);
    if (result.error) { errors.push(`the logo in the top bar is refused: ${result.error}`); continue; }
    logos.push({ ...item, ...result });
  }
  const text = host ? host[2].replace(/<svg\b[\s\S]*?<\/svg>|<img\b[^>]*>/gi, "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() : "";
  if (!logos.length) return { errors, warnings, logos, name: host ? text : null };
  // At most one logo for each theme, or one for both.
  const themes = logos.map((l) => l.forTheme || "both");
  for (const theme of themes) if (!["both", "light", "dark"].includes(theme)) errors.push(`a logo has data-for="${theme}"; it is "light" or "dark"`);
  if (logos.length > 2 || (logos.length === 2 && themes.sort().join() !== "dark,light")) errors.push(`the top bar has ${logos.length} logos; it has one, or one with data-for="light" and one with data-for="dark"`);
  for (const logo of logos) {
    const what = logo.forTheme ? `the ${logo.forTheme} logo` : "the logo";
    // The slot: 24px high and at most 160px wide; the logo keeps its shape.
    const want = slotSize(logo.ratio);
    if (!(Math.abs(logo.width - want.width) <= 0.5 && Math.abs(logo.height - want.height) <= 0.5)) errors.push(`${what} needs width="${want.width}" height="${want.height}": the slot is ${SLOT.height}px high and at most ${SLOT.width}px wide, and a logo keeps its shape`);
    else if (want.height < SLOT.lowest) warnings.push(`${what} is ${want.height}px high, because it is very wide; below ${SLOT.lowest}px a wordmark is hard to read. A symbol, or a less wide version, reads better`);
    if (logo.raster && logo.natural.height < SHARP * want.height) errors.push(`${what} is ${logo.natural.width} × ${logo.natural.height} pixels; it shows ${want.height}px high, so it needs at least ${Math.ceil(SHARP * want.height)} pixels of height to stay sharp on a phone and on paper`);
    // Light and dark: a logo shows on the page it sits on. A raster logo cannot be read here; the agent looks at it.
    if (logo.raster) continue;
    const reads = (ground) => logo.colors.has("currentColor") || [...logo.colors].some((c) => c !== "currentColor" && contrast(c, ground) >= MARK);
    if (logo.forTheme !== "dark" && !reads(PAGES.light)) errors.push(`${what} has no color with ${MARK}:1 on the light page (${PAGES.light}); give it a light version${logo.forTheme ? "" : ", or mark it data-for=\"dark\" so the light page shows it on a tile"}`);
    if (logo.forTheme !== "light" && !reads(PAGES.dark)) errors.push(`${what} has no color with ${MARK}:1 on the dark page (${PAGES.dark}); give it a dark version with data-for="dark"${logo.forTheme ? "" : ", or mark it data-for=\"light\" so dark mode shows it on a tile"}`);
  }
  // The name: a symbol stands before the host's name and is hidden from a screen reader; a wordmark stands alone and carries the name.
  let name = text || null;
  for (const logo of logos) {
    const what = logo.forTheme ? `the ${logo.forTheme} logo` : "the logo";
    if (text && !logo.hidden) errors.push(`${what} stands before the host's name, so a screen reader would read the name twice; write ${logo.raster ? 'alt=""' : 'aria-hidden="true"'} on it`);
    if (!text) {
      const label = (logo.label || "").trim();
      if (!label || (!logo.raster && logo.role !== "img")) errors.push(`${what} stands alone, so it carries the host's name: write ${logo.raster ? 'alt="Host name"' : 'role="img" aria-label="Host name"'} on it`);
      else if (name && label !== name) errors.push(`the two logos carry two names, "${name}" and "${label}"`);
      else name = label;
    }
  }
  return { errors, warnings, logos, name };
}

module.exports = { MOST, SLOT, slotSize, svgLogo, rasterLogo, rasterSize, findLogos, checkLogos, contrast };
