// slide: the rules of a deck's slides (docs/proposals/decks.md, section 3), tested from the source.
// A slide is laid out on a frame of 1280 × 720 CSS pixels with 64px margins, so 1152 × 592 inside. check estimates the height of each
// slide at slide sizes with the renderer's own width estimate. The heading is in the serif; it is estimated with the sans-serif at
// weight 600, which is wider than the serif on Apple devices.
const { textWidth } = require("./text.cjs");

const FRAME = { width: 1280, height: 720, margin: 64 };
const INNER = { width: FRAME.width - 2 * FRAME.margin, height: FRAME.height - 2 * FRAME.margin }; // 1152 × 592
// The three sizes a slide uses, all from Docent's six: the h1 size, the h2 size and the body-lg size. Line heights as in deck.css.
const SIZE = { heading: 52, large: 30, small: 21 };
const LINE = { heading: 52 * 1.06, large: 30 * 1.3, small: 21 * 1.5, code: 21 * 1.6 };
const GAP = 32; // between the heading and the body
const POINT_GAP = 16; // between two points
const INDENT = 40; // the indent of a list of points
const CARD_GAP = 24; // between two cards
const ROW_PAD = 2 * 12; // a table row: its lines at 21px, with 12px above and below
const CELL_GAP = 24; // the space after each table cell
const WELL = 16; // a figure well's padding, above and below
const CAPTION_GAP = 12;
const SCALE = { most: 1.5, least: 1.25 }; // a drawing on a slide stands at 1.5 times, or down to 1.25 times when it needs room
const LIMIT = { headingLines: 2, points: 3, cards: 3, columns: 4, rows: 5, paragraphLines: 2, codeLines: 8 };

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const plain = (s) => s.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const hasClass = (attrs, name) => new RegExp(`\\bclass="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"`).test(attrs);
const attrOf = (attrs, name) => (attrs.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
const px = (n) => Math.round(n);
const lines = (text, size, width, weight = 400) => Math.max(1, Math.ceil(textWidth(text, size, weight) / width));

/** The elements directly inside a piece of markup: [{ tag, attrs, inner, start, end }]. Text between them is skipped. */
function elements(markup) {
  const out = [], stack = [];
  for (const m of markup.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const [all, close, raw, attrs] = m, tag = raw.toLowerCase();
    if (!close) {
      const el = { tag, attrs, start: m.index, from: m.index + all.length };
      if (VOID.has(tag) || /\/\s*$/.test(attrs)) { if (!stack.length) out.push({ ...el, inner: "", end: el.from }); continue; }
      stack.push(el);
      continue;
    }
    const at = stack.map((e) => e.tag).lastIndexOf(tag);
    if (at < 0) continue;
    stack.length = at + 1; // an element left open inside ends here
    const el = stack.pop();
    if (!stack.length) out.push({ ...el, inner: markup.slice(el.from, m.index), end: m.index + all.length });
  }
  if (stack.length) out.push({ ...stack[0], inner: markup.slice(stack[0].from), end: markup.length });
  return out;
}

const describe = (el) => `<${el.tag}${attrOf(el.attrs, "class") ? ` class="${attrOf(el.attrs, "class")}"` : ""}>`;
const BODIES = "one figure, at most three points, up to three large numbers, one small table, a short paragraph or a code block";

/** The size of a drawing: the first <svg> (the desktop form) or <img> in a figure that has a width and a height. */
function drawingSize(inner) {
  for (const m of inner.matchAll(/<(svg|img)\b([^>]*)>/gi)) {
    const w = Number(attrOf(m[2], "width")), h = Number(attrOf(m[2], "height"));
    if (w > 0 && h > 0) return { w, h, hand: /\bdata-drawn="hand"/.test(m[2]) };
  }
  return null;
}

/** A figure's caption: its lines at 21px, with the source line on a line of its own. */
function captionHeight(inner) {
  const caption = (inner.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i) || [])[1];
  if (caption == null) return 0;
  const source = (caption.match(/<([a-z]+)\b[^>]*\bclass="(?:[^"]*\s)?source(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/\1>/i) || [])[2];
  const rest = plain(source == null ? caption : caption.replace(source, ""));
  const count = (rest ? lines(rest, SIZE.small, INNER.width) : 0) + (source != null ? lines(plain(source), SIZE.small, INNER.width) : 0);
  return CAPTION_GAP + count * LINE.small;
}

/** The kind of a slide's body and its height on the frame, or an error. room is the height left for the body under the heading. */
function measureBody(el, room) {
  const problems = [];
  const items = (inner) => [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)(?=<li\b|$)/gi)].map(([, body]) => plain(body.replace(/<\/li>\s*$/i, "")));
  const table = (inner) => {
    const head = (inner.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i) || [])[1];
    const body = inner.replace(/<thead\b[^>]*>[\s\S]*?<\/thead>/i, "").replace(/<tfoot\b[^>]*>[\s\S]*?<\/tfoot>/i, "");
    const rowsOf = (part) => [...(part || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => plain(c[1])));
    const rows = rowsOf(body), all = [...rowsOf(head), ...rows, ...rowsOf((inner.match(/<tfoot\b[^>]*>([\s\S]*?)<\/tfoot>/i) || [])[1])];
    const columns = Math.max(0, ...all.map((r) => r.length)), count = rows.length - (head == null && rows.length ? 1 : 0);
    if (columns > LIMIT.columns) problems.push(`its table has ${columns} columns; a table on a slide has at most ${LIMIT.columns}`);
    if (count > LIMIT.rows) problems.push(`its table has ${count} rows under the heading row; a table on a slide has at most ${LIMIT.rows}. A larger table belongs in the report`);
    // Each row is as tall as its tallest cell: the columns share the width equally here, less 24px of space after each cell.
    const cell = Math.max(1, INNER.width / Math.max(1, columns) - CELL_GAP);
    return all.reduce((sum, row) => sum + Math.max(1, ...row.map((text) => (text ? lines(text, SIZE.small, cell) : 1))) * LINE.small + ROW_PAD, 0);
  };
  const { tag, attrs, inner } = el;
  if ((tag === "ul" || tag === "ol") && hasClass(attrs, "cards")) {
    const raw = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)(?=<li\b|$)/gi)].map((m) => m[1]), cards = raw;
    const width = (INNER.width - (LIMIT.cards - 1) * CARD_GAP) / LIMIT.cards;
    if (cards.length > LIMIT.cards) problems.push(`its card grid has ${cards.length} cards; a slide holds at most ${LIMIT.cards} large numbers`);
    raw.forEach((card, i) => {
      const said = [...card.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].filter(([, a]) => !hasClass(a, "big")).map(([, , t]) => plain(t));
      if (said.length > 1) problems.push(`card ${i + 1} has ${said.length} lines under its number; a card on a slide has one`);
      else if (said.length && textWidth(said[0], SIZE.small) > width) problems.push(`the line of card ${i + 1} ("${said[0]}") is longer than one line of a card at 21px (${px(width)}px); say it in fewer words`);
    });
    return { kind: "large numbers", height: 13 + LINE.heading + 4 + LINE.small, problems };
  }
  if (tag === "ul" || tag === "ol") {
    const points = items(inner);
    if (points.length > LIMIT.points) problems.push(`it has ${points.length} points; a slide holds at most ${LIMIT.points}. More than three points is a list to read, not a point to see`);
    points.forEach((p, i) => { if (textWidth(p, SIZE.large) > INNER.width - INDENT) problems.push(`point ${i + 1} ("${p.length > 50 ? `${p.slice(0, 50)}…` : p}") is longer than one line at 30px (about 75 characters)`); });
    return { kind: "points", height: points.length * LINE.large + Math.max(0, points.length - 1) * POINT_GAP, problems };
  }
  if (tag === "p" && !attrOf(attrs, "class")) {
    const count = lines(plain(inner), SIZE.large, INNER.width);
    if (count > LIMIT.paragraphLines) problems.push(`its paragraph is about ${count} lines at 30px; a short paragraph on a slide is at most ${LIMIT.paragraphLines} lines`);
    return { kind: "a short paragraph", height: count * LINE.large, problems };
  }
  if (tag === "figure" && hasClass(attrs, "quote")) {
    const said = plain((inner.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i) || [, ""])[1]), count = lines(said, SIZE.large, INNER.width);
    if (count > LIMIT.paragraphLines) problems.push(`its quote is about ${count} lines at 30px; a quote on a slide is at most ${LIMIT.paragraphLines} lines`);
    return { kind: "a short paragraph", height: count * LINE.large + 4 + LINE.small, problems };
  }
  if (tag === "pre") {
    const count = plain(inner.replace(/<[^>]*>/g, "")).length ? inner.replace(/<[^>]*>/g, "").replace(/\n+$/, "").split("\n").length : 0;
    if (count > LIMIT.codeLines) problems.push(`its code block has ${count} lines; a code block on a slide has at most ${LIMIT.codeLines}`);
    return { kind: "a code block", height: count * LINE.code + 2 * 16, problems };
  }
  if (tag === "table" || (tag === "div" && hasClass(attrs, "table-wrap"))) return { kind: "a small table", height: table(inner), problems };
  if (tag === "figure" && /<table\b/i.test(inner) && !/\bclass="(?:[^"]*\s)?fig(?:\s[^"]*)?"/.test(inner)) return { kind: "a small table", height: table(inner) + captionHeight(inner), problems };
  if (tag === "figure") {
    const size = drawingSize(inner), caption = captionHeight(inner);
    if (!size) return { kind: "one figure", height: caption, problems };
    const fit = Math.min(SCALE.most, (INNER.width - WELL) / size.w, (room - caption - WELL) / size.h), scale = Math.max(SCALE.least, fit);
    // A drawing that does not fit at the least scale is refused with its size and the room; the slide is not called too tall as well.
    const most = { w: Math.floor((INNER.width - WELL) / SCALE.least), h: Math.floor(Math.max(0, room - caption - WELL) / SCALE.least) };
    if (fit < SCALE.least) {
      problems.push(`the drawing is ${size.w} × ${size.h}px; a slide holds ${most.w} × ${most.h}px at ${SCALE.least} times under this heading and caption. Show less on the slide, and the full drawing in the report`);
      return { kind: "one figure", height: Math.min(room, size.h * scale + WELL + caption), problems, size, scale: fit };
    }
    return { kind: "one figure", height: size.h * scale + WELL + caption, problems, size, scale };
  }
  return null;
}

/** Tests the slides of a deck. html is the page with its comments blanked out, so the drawings are still in it. */
function checkDeck(html) {
  const errors = [];
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!main) return { errors: ["a deck has no <main>; its slides are sections directly inside <main>"], slides: [] };
  const slides = [];
  for (const el of elements(main[1])) {
    if (el.tag === "section" && hasClass(el.attrs, "slide")) slides.push(el);
    else errors.push(`${describe(el)} stands directly inside <main>; in a deck every child of <main> is a slide, a <section class="slide">`);
  }
  if (!slides.length) errors.push('a deck has no slides; each slide is a <section class="slide"> directly inside <main>, and the first is the title slide');
  const ids = new Map(), measured = [];
  slides.forEach((slide, i) => {
    const n = i + 1, name = `slide ${n}`, title = i === 0, id = attrOf(slide.attrs, "id");
    if (title && !hasClass(slide.attrs, "title")) errors.push('slide 1 is not the title slide; the first slide is <section class="slide title">, with the <h1>, the opening paragraph and a facts list');
    if (!title && hasClass(slide.attrs, "title")) errors.push(`${name} has the class "title"; only the first slide is the title slide`);
    if (!id) errors.push(`${name} has no id; give each slide an id, such as id="s${n}", so a link and the address can open it`);
    else if (ids.has(id)) errors.push(`${name} has the id "${id}", as slide ${ids.get(id)} has; each slide has its own id`);
    else ids.set(id, n);
    const parts = elements(slide.inner).filter((el) => !(el.tag === "details" && hasClass(el.attrs, "notes")));
    const headings = parts.filter((el) => /^h[1-6]$/.test(el.tag)), want = title ? "h1" : "h2";
    const heading = parts[0] && /^h[1-6]$/.test(parts[0].tag) ? parts[0] : null;
    if (!heading) errors.push(`${name} does not start with its heading; a slide starts with one <${want}> that says its point`);
    else if (heading.tag !== want) errors.push(`${name} starts with an <${heading.tag}>; ${title ? "the title slide holds the <h1>" : "a slide after the title slide starts with an <h2>"}`);
    if (headings.length > 1) errors.push(`${name} has ${headings.length} headings; a slide has one heading, a sentence that says its point`);
    const headingLines = heading ? lines(plain(heading.inner), SIZE.heading, INNER.width, 600) : 0;
    if (headingLines > LIMIT.headingLines) errors.push(`${name}: the heading "${plain(heading.inner)}" is about ${headingLines} lines at 52px; a slide's heading is at most ${LIMIT.headingLines} lines (about 80 characters). Say the point in fewer words`);
    let height = headingLines * LINE.heading;
    const body = parts.filter((el) => !/^h[1-6]$/.test(el.tag));
    if (title) {
      for (const el of body) {
        if (el.tag === "p" && hasClass(el.attrs, "standfirst")) height += 24 + lines(plain(el.inner), SIZE.large, INNER.width) * LINE.large;
        else if (el.tag === "ul" && hasClass(el.attrs, "facts")) height += 24 + (el.inner.match(/<li\b/gi) || []).length * LINE.small;
        else errors.push(`slide 1, the title slide, holds ${describe(el)}; it holds the <h1>, the opening paragraph (<p class="standfirst">) and a facts list (<ul class="facts">)`);
      }
    } else {
      if (body.length > 1) errors.push(`${name} has ${body.length} bodies (${body.map(describe).join(", ")}); a slide holds one body: ${BODIES}. Move the rest to another slide, to the speaker notes or to the report`);
      const found = body.length ? measureBody(body[0], INNER.height - height - GAP) : null;
      if (body.length && !found) errors.push(`${name} holds ${describe(body[0])}, which is not a slide body; a slide holds ${BODIES}`);
      if (found) {
        found.problems.forEach((p) => errors.push(`${name}: ${p}`));
        height += GAP + found.height;
        measured.push({ n, ...found });
      }
    }
    if (px(height) > INNER.height) errors.push(`${name} is about ${px(height)}px tall, and a slide holds ${INNER.height}px. Cut a point, or move the detail to the speaker notes or to the report`);
    slide.height = height;
  });
  return { errors, slides: slides.map((s, i) => ({ n: i + 1, id: attrOf(s.attrs, "id"), height: px(s.height || 0) })), measured };
}

module.exports = { FRAME, INNER, SIZE, LINE, GAP, SCALE, LIMIT, elements, checkDeck };
