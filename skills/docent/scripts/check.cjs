#!/usr/bin/env node
// check: tests a Docent document against the rules that can be tested from its source.
// Usage: node check.cjs [--config <path> | --no-config] <document.html> [more.html ...]
//        node check.cjs --rules   lists every rule, with its ID and its group
// It reads the repo file, the nearest .docent/config.json above each page, and refuses a bad one (docs/proposals/repo-config.md).
// It does not open a browser. So it cannot test contrast, the phone layout, print or motion as a reader sees them.
require("./lib/node.cjs").warnOldNode(); // first, so that an old Node is named before anything else can fail
const fs = require("node:fs");
const path = require("node:path");
const { findConfig, readConfig } = require("./lib/config.cjs");
const { VERSION, cssBlock, jsBlock, findKit, isDeck, htmlAttr } = require("./lib/kit.cjs");
const { checkDeck, roomAt } = require("./lib/slide.cjs");
const { renderDiagram, slideRoomsOf } = require("./lib/diagram.cjs");
const { renderWidget, PLACE, esc } = require("./lib/widget.cjs");
const { findBlocks, block } = require("./lib/blocks.cjs");
const { PROFILES, suggestProfile } = require("./lib/profile.cjs");
const { checkLogos } = require("./lib/logo.cjs");
const { checkFigures } = require("./lib/hand.cjs");
const { lab, darkAccent, nearestStatus } = require("./lib/color.cjs");
const { NAMES: PALETTES, paletteOf, paint, grounds } = require("./lib/palettes.cjs");
const { findPersonal, findTel } = require("./lib/personal.cjs");
const { wordsOf, findNumberText, findNumberColumn, findBigNumber } = require("./lib/numbers.cjs");
const { RULES, NUMBER_RULES, say, split } = require("./lib/rules.cjs");

const MOST_WIDGETS = 4; // more widgets than this in one document gives a warning
const CARDS = [3, 8]; // a card grid holds 3 to 8 cards
const FINDINGS = [2, 6]; // a findings list holds 2 to 6 items
const LEAD_WORDS = 25; // the lead sentence of a key finding has at most this many words
const QUOTE_WORDS = 80; // a quote has at most this many words
const TAGLINE = 90; // characters: the tagline is one line
// Each host color, the theme it shows in, and the contrast it needs: text needs 4.5:1, the dot is a mark and needs 3:1 (WCAG 1.4.11).
const HOST = { "host-accent": ["light", 4.5], "host-accent-dark": ["dark", 4.5], "host-ink": ["light", 4.5], "host-dot-dark": ["dark", 3] };
const NEAR = 25; // CIE76: an accent closer than this to a status color reads as that status
const GRAY = 10; // CIELAB chroma: an accent with less looks like the body text
// The common status words, the state each takes, and the question it answers (docs/proposals/blocks.md, section 2).
const DONE = "done, decided or working", CLOSED = "closed; nothing is broken", NOT_YET = "not yet";
const STATUS_WORDS = {
  Done: ["ok", DONE], Fixed: ["ok", DONE], Accepted: ["ok", DONE], Approved: ["ok", DONE],
  "In progress": ["info", "under way, nothing is wrong"], Superseded: ["info", CLOSED], Rejected: ["info", CLOSED],
  Planned: ["plan", NOT_YET], Proposed: ["plan", NOT_YET], "Open question": ["plan", NOT_YET], "Not decided yet": ["plan", NOT_YET],
};

const luminance = (hex) => {
  const full = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, "#$1$1$2$2$3$3") : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

const plain = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
/** True when every word of a appears in b, in the same order. */
const shorter = (a, b) => { const want = words(a), have = words(b); let at = 0; for (const w of have) if (w === want[at]) at += 1; return want.length > 0 && at === want.length; };
/** The text of markup, with a space where each tag was, so the words of two cells do not run together. */
const textOf = (s) => plain(s.replace(/</g, " <"));
/** A cell that holds a number only: a sign, a currency, thousands separators, decimals, and a percent or a short unit. */
const NUMBER = /^[−+-]?[$€£¥]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s?(?:%|[kKMB]|ms|s|px|x)?$/;
const BLANK = /^(?:|—|–|-|n\/a)$/i; // an empty cell in a column of numbers
/** The value of a cell for a sum, with no commas, currency sign or unit; null when the cell is not one number. */
const sumValue = (text) => { const m = text.match(/^([−+-]?)[$€£¥]?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s?(?:%|[a-zA-Z]+)?$/); return m ? (m[1] && m[1] !== "+" ? -1 : 1) * Number(m[2].replace(/,/g, "")) : null; };
const hasClass = (attrs, name) => new RegExp(`\\bclass="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"`).test(attrs);
/** A link address with its %-escapes decoded; a bare % (as in "100% done") leaves it as it is. */
const decoded = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
/** Every string in a diagram's or a widget's data, except the SVG of an icon. */
const strings = (value, key) => (key === "icons" ? [] : typeof value === "string" ? [value] : value && typeof value === "object" ? Object.entries(value).flatMap(([k, v]) => strings(v, Array.isArray(value) ? key : k)) : []);
const local = (value) => /^(#|data:)/i.test(value.trim()) || value.trim() === "";
/** Each figure well (a div with the class fig) and all that is inside it, counting nested divs so the whole well is read. */
function wells(html) {
  // Tags are read with every comment blanked out, so a <div> written in a diagram's data does not count.
  const bare = html.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length));
  const out = [], open = /<div\b([^>]*\bclass="(?:[^"]*\s)?fig(?:\s[^"]*)?"[^>]*)>/g;
  for (let m; (m = open.exec(bare)); ) {
    const tag = /<(\/?)div\b[^>]*>/gi;
    tag.lastIndex = open.lastIndex;
    let depth = 1, t;
    while (depth && (t = tag.exec(bare))) depth += t[1] ? -1 : 1;
    out.push({ attrs: m[1], inner: html.slice(open.lastIndex, t ? t.index : html.length) });
  }
  return out;
}
/** Each element whose class holds the word name: its tag, where it starts, and what is inside it, counting nested tags of the same name. */
function withClass(markup, name) {
  const out = [], open = new RegExp(`<([a-z][\\w-]*)\\b([^>]*\\bclass="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"[^>]*)>`, "gi");
  for (let m; (m = open.exec(markup)); ) {
    const tag = new RegExp(`<(/?)${m[1]}\\b[^>]*>`, "gi");
    tag.lastIndex = open.lastIndex;
    let depth = 1, t;
    while (depth && (t = tag.exec(markup))) depth += t[1] ? -1 : 1;
    out.push({ index: m.index, tag: m[1].toLowerCase(), attrs: m[2], inner: markup.slice(open.lastIndex, t ? t.index : markup.length) });
  }
  return out;
}
// The kinds that show measured numbers. A chart of one of these needs a source line in its caption; a workflow, a UML diagram, a layout
// to scale and a plan describe a design, not data (decision 2 in docs/proposals/sources.md).
const MEASURED = { range: "range chart", bar: "bar chart", line: "line chart", funnel: "funnel", heatmap: "heat map", heatplan: "heat plan", statusgrid: "status grid" };

/** Returns { errors, warnings, notes }: lists of plain sentences, each starting with the ID of its rule, as "[cards.count] …".
    options.config is the repo file that holds for the page, { data, label, lines }: its host colors are tested as the page's own, and
    each rule that it turns off is reported as a note, not as an error or a warning. */
function checkDocument(html, options = {}) {
  const errors = [], warnings = [];
  const error = (id, text) => errors.push(say(id, text)), warn = (id, text) => warnings.push(say(id, text));
  // A palette turns Docent's own tokens to one hue. A host color is tested on the palette's pages, and each drawing carries its light values.
  const named = paletteOf(html), palette = PALETTES.includes(named) ? named : null;
  if (named != null && !palette) error("kit.palette", `<html> has data-palette="${named}"; the palettes are ${PALETTES.map((n) => `"${n}"`).join(", ")} (see "Palettes" in DESIGN.md)`);
  const deck = isDeck(html); // a deck carries the deck part of the kit, and only a deck does
  const carried = (text) => [null, ...PALETTES].findIndex((p) => text === cssBlock(p, deck)); // 0: no palette, n: the nth palette, -1: neither
  const GROUNDS = grounds(palette); // the pages that the kit draws on, light and dark: a host color must read on both the page and the well

  // 1. The kit: the same styles and script in every document.
  for (const [kind, current, other] of [["styles", cssBlock(palette), cssBlock(palette, true)], ["script", jsBlock(), jsBlock(true)]].map(([k, plainKit, deckKit]) => (deck ? [k, deckKit, plainKit] : [k, plainKit, deckKit]))) {
    const found = findKit(html).filter((k) => k.kind === kind);
    if (!found.length) error("kit.blocks", `the document has no kit ${kind}; run stamp`);
    else if (found.length > 1) error("kit.blocks", `the document has ${found.length} kit ${kind} blocks; it must have one`);
    else if (found[0].version !== VERSION) error("kit.blocks", `the kit ${kind} are version ${found[0].version}; this skill has ${VERSION}; run stamp`);
    else if (found[0].text === other) error("kit.blocks", deck ? `the kit ${kind} have no deck part, but <html> has data-profile="deck"; run stamp` : `the kit ${kind} carry the deck part, but <html> does not have data-profile="deck"; run stamp`);
    else if (found[0].text !== current && kind === "styles" && carried(found[0].text) >= 0) error("kit.blocks", `the kit styles carry ${carried(found[0].text) ? `the palette "${PALETTES[carried(found[0].text) - 1]}"` : "no palette"}, but <html> names ${palette ? `"${palette}"` : "none"}; run stamp`);
    else if (found[0].text !== current) error("kit.blocks", `the kit ${kind} were changed by hand or by a code formatter; run stamp, keep your own styles outside the markers, and keep the document out of the formatter (see SKILL.md)`);
  }

  // 2. Diagrams: each drawing must be the one that render makes from its data.
  const diagrams = findBlocks(html, "diagram"), ids = new Set(), shapes = new Map(), walks = [], refs = [], charts = [];
  const rooms = slideRoomsOf(html); // in a deck, a drawing on a slide is drawn for the room there, and refused when it does not fit
  diagrams.forEach((found, n) => {
    const name = `diagram ${n + 1}`;
    let data;
    try { data = JSON.parse(found.json); } catch (problem) { return error("diagram.data", `${name}: the data is not valid JSON: ${problem.message}`); }
    try {
      const drawn = renderDiagram(data, roomAt(rooms, found.start));
      const label = `${name} ("${drawn.model.id}")`;
      if (ids.has(drawn.model.id)) error("diagram.id", `${label}: another diagram has the same id`);
      ids.add(drawn.model.id);
      drawn.icons.forEach((w) => error("diagram.icon", `${label}: ${w}`));
      drawn.warnings.filter((w) => !drawn.icons.includes(w)).forEach((w) => warn("diagram.advice", `${label}: ${w}`));
      if (found.text !== block("diagram", found.json, paint(drawn.svg, palette))) error("diagram.match", `${label}: the drawing does not match its data; run render`);
      // A document should not draw the same thing twice.
      const shape = drawn.model.legs ? JSON.stringify([drawn.model.lanes.map((l) => l.name), drawn.model.parts.map((p) => [p.lane, p.name, p.note]), drawn.model.legs.map((l) => [l.from, l.to, l.verb])]) : JSON.stringify({ ...data, id: null, label: null }); // a UML graph kind: its data without the id and label
      if (shapes.has(shape)) warn("diagram.twice", `${label} shows the same ${drawn.model.legs ? "lanes, parts and legs" : "data"} as diagram "${shapes.get(shape)}"; a document should not draw the same thing twice`);
      else shapes.set(shape, drawn.model.id);
      if (drawn.model.place === "walk") walks.push({ label, legs: drawn.model.legs.length });
      for (const ref of drawn.model.refs || []) refs.push({ label, ref });
      if (Object.hasOwn(MEASURED, data.kind)) charts.push({ n: n + 1, id: drawn.model.id, kind: MEASURED[data.kind], at: found.start });
    } catch (problem) {
      error("diagram.data", `${name}${data && data.id ? ` ("${data.id}")` : ""}: ${problem.message}`);
    }
  });
  // An interaction overview links each ref frame to a sequence diagram in the same document.
  for (const { label, ref } of refs) if (!ids.has(ref)) error("diagram.ref", `${label}: a ref frame links to the diagram "${ref}", which is not in this document`);
  // A chart of measured numbers says where they come from, in a source line at the end of its caption. A warning: the author may have a reason.
  const unlit = html.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length)); // tags in a diagram's data do not count
  const figures = [...unlit.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)].map((m) => ({ start: m.index, end: m.index + m[0].length, text: m[0] }));
  for (const chart of charts) {
    const figure = figures.find((f) => f.start < chart.at && chart.at < f.end);
    const caption = figure && (figure.text.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i) || [])[1];
    if (caption != null && withClass(caption, "source").length) continue;
    const number = caption != null && (plain(caption).match(/^(Figure|Table) (\d+)/) || []);
    const name = number && number[2] ? `${number[1].toLowerCase()} ${number[2]}` : `diagram ${chart.n}`;
    const fix = caption != null ? "add <span class=\"source\">Source: …</span> to its caption" : `${figure ? "give its figure" : "put it in a <figure> with"} a <figcaption> that ends with <span class="source">Source: …</span>`;
    warn("source.chart", `${name} ("${chart.id}") is a ${chart.kind} with no source line; ${fix}, or write "Source: invented sample data." when the numbers are made up`);
  }
  // A well holds one drawing, or two for two separate chains. Beside walkthrough steps it holds one, because step n lights leg n.
  for (const { attrs, inner } of wells(html)) {
    const count = (inner.match(/<!-- docent:diagram\b/g) || []).length, name = (attrs.match(/aria-label="([^"]*)"/) || [])[1] || "a figure";
    if (count > 2) error("diagram.well", `${name} holds ${count} diagrams; a figure holds one, or two for two separate chains`);
    if (count > 1 && /"place"\s*:\s*"walk"/.test(inner)) error("diagram.well", `${name} holds ${count} diagrams beside walkthrough steps; there it holds one`);
  }
  let rest = html;
  for (const found of [...diagrams].reverse()) rest = rest.slice(0, found.start) + rest.slice(found.end);
  if (/<svg\b[^>]*\bclass="[^"]*\bdg\b/.test(rest)) error("diagram.outside", "a diagram sits outside a diagram block; put its data in a block and run render");
  // Every drawing in a figure well comes from a diagram block, or is hand-drawn under the contract of "Hand-drawn figures" in diagrams.md.
  const hand = checkFigures(wells(rest), { html });
  errors.push(...hand.errors);
  warnings.push(...hand.warnings);
  for (const svg of hand.drawn) rest = rest.replace(svg, ""); // like a drawing that render made, it is not the author's own content
  if (/<svg\b[^>]*\bdata-drawn\s*=\s*["']hand["']/i.test(rest.replace(/<!--[\s\S]*?-->/g, ""))) error("hand.outside", 'a hand-drawn drawing stands outside a figure well; put it in a <div class="fig">, with its words, as "Hand-drawn figures" in diagrams.md shows');

  // 2b. Widgets: each widget must be the one that render makes from its data.
  const widgets = findBlocks(rest, "widget"), widgetIds = new Set(), kinds = new Set(), defaults = {};
  widgets.forEach((found, n) => {
    const name = `widget ${n + 1}`;
    let data;
    try { data = JSON.parse(found.json); } catch (problem) { return error("widget.data", `${name}: the data is not valid JSON: ${problem.message}`); }
    try {
      const built = renderWidget(data);
      const label = `${name} ("${built.id}")`;
      if (widgetIds.has(built.id)) error("widget.id", `${label}: another widget has the same id`);
      widgetIds.add(built.id);
      if (found.text !== block("widget", found.json, built.html)) error("widget.match", `${label}: the widget does not match its data; run render`);
      kinds.add(built.key == null ? built.id : `${built.kind} ${built.key}`); // choosers or value pickers with the same options change together and count as one
      for (const [key, value] of Object.entries(built.defaults || {})) {
        if (Object.hasOwn(defaults, key)) error("widget.key", `${label}: another value picker has the key "${key}"; each key belongs to one value picker`);
        defaults[key] = value;
      }
    } catch (problem) {
      error("widget.data", `${name}${data && data.id ? ` ("${data.id}")` : ""}: ${problem.message}`);
    }
  });
  for (const found of [...widgets].reverse()) rest = rest.slice(0, found.start) + rest.slice(found.end);
  if (/\bclass="(?:[^"]*\s)?(choose|checks|decide|values)(?:\s[^"]*)?"/.test(rest)) error("widget.outside", "a widget sits outside a widget block; put its data in a block and run render");
  if (kinds.size > MOST_WIDGETS) warn("widgets.most", `the document has ${kinds.size} widgets; a widget is for a reader who must choose, track or decide, and more than ${MOST_WIDGETS} in one document is a sign that some are not needed`);

  // Places that show a value: each names a key of a value picker and holds the value of its first option.
  const used = new Set();
  for (const [, , key, , inner] of rest.replace(/<!--[\s\S]*?-->/g, "").matchAll(PLACE)) {
    if (!Object.hasOwn(defaults, key)) { error("place.key", `a place <var data-v="${key}"> names a value that no value picker has`); continue; }
    used.add(key);
    if (inner !== esc(defaults[key])) error("place.value", `a place <var data-v="${key}"> holds "${plain(inner)}", not the value of the first option; run render`);
  }
  for (const key of Object.keys(defaults)) if (!used.has(key)) warn("place.unused", `the value "${key}" of a value picker is shown in no place; mark each place with <var data-v="${key}"></var>, or take the value out`);

  // A deck: every child of <main> is a slide, and each slide is one heading and one body that fits the frame (decks.md, section 3).
  // A deck has no widget, no walkthrough and no closed section other than a figure's words and the speaker notes.
  if (deck) {
    errors.push(...checkDeck(unlit).errors);
    if (widgets.length) error("deck.widget", `the deck has ${widgets.length} widget${widgets.length === 1 ? "" : "s"}; a slide shows one point to a room, so a deck has no widget. Put it in the report`);
  }

  // A card grid holds a few short items.
  for (const [, inner] of rest.matchAll(/<ul\b[^>]*\bclass="[^"]*\bcards\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)) {
    const n = (inner.match(/<li\b/g) || []).length;
    if (n < CARDS[0] || n > CARDS[1]) warn("cards.count", `a card grid has ${n} cards; it holds ${CARDS[0]} to ${CARDS[1]}. Use a list or a table for ${n < CARDS[0] ? "fewer" : "more"}`);
  }

  // A walkthrough lights leg n for step n, so the numbers must agree.
  const lists = [...rest.matchAll(/<ol\b[^>]*\bclass="[^"]*\bsteps\b[^"]*"[^>]*>([\s\S]*?)<\/ol>/g)].map((m) => m[1]);
  if (deck && (lists.length || walks.length)) error("deck.walk", "the deck has a walkthrough; a slide does not scroll, so a deck has no walkthrough yet. Show the diagram alone, with its steps in the speaker notes, or put the walkthrough in the report");
  if (lists.length !== walks.length) error("walk.count", `the document has ${lists.length} walkthrough step lists and ${walks.length} diagrams with "place": "walk"; each walkthrough needs one`);
  lists.forEach((list, i) => {
    const steps = (list.match(/<li\b/g) || []).length;
    if (walks[i] && steps !== walks[i].legs) error("walk.legs", `${walks[i].label} has ${walks[i].legs} legs, but its walkthrough has ${steps} steps`);
    for (const [, heading] of list.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)) {
      const count = plain(heading).split(" ").filter(Boolean).length;
      if (count > 6) warn("steps.heading", `the step heading "${plain(heading)}" has ${count} words; a step heading has at most six`);
    }
  });

  // From here on, test the author's own content: everything except the kit, the drawings and the widgets.
  for (const k of findKit(rest)) rest = rest.replace(k.text, "");
  const noComments = rest.replace(/<!--[\s\S]*?-->/g, "");
  const css = [...noComments.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).concat([...noComments.matchAll(/\bstyle="([^"]*)"/g)].map((m) => m[1])).join("\n");
  const scripts = [...noComments.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const markup = noComments.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g, (m) => m.slice(0, m.indexOf(">") + 1));
  if (deck) for (const [, attrs] of markup.matchAll(/<details\b([^>]*)>/gi)) if (!hasClass(attrs, "notes") && !hasClass(attrs, "dg-words")) error("deck.details", `the deck has a closed section${attrs.trim() ? ` (<details${attrs}>)` : ""}; a deck has no closed section other than a figure's words and the speaker notes (<details class="notes">), because a closed section cannot open on a shared screen`);

  // 3. One file, no network.
  for (const [, tag, attrs] of markup.matchAll(/<([A-Za-z][\w:-]*)\b([^>]*)>/g)) {
    const name = tag.toLowerCase();
    if (name === "link" || name === "base") { error("network.link", `<${name}> loads or points outside the file; a document is one file with no network`); continue; }
    for (const [, attr, value] of attrs.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      const a = attr.toLowerCase();
      if (name === "a" && a === "href") continue; // a link for the reader to follow loads nothing
      if (["src", "srcset", "href", "xlink:href", "poster", "data", "action", "background"].includes(a) && !local(value)) error("network.src", `<${name} ${a}="${value.slice(0, 60)}"> loads from outside the file; a document is one file with no network`);
    }
  }
  // Host colors and fonts go through the --host-* tokens. The kit sets its own tokens in four places (light, dark by the system, dark by the switch, print), so an author's value for one of them is lost in some of them.
  for (const [, name] of css.matchAll(/(?:^|[;{\s])--(bg|panel|fig|text|muted|line|primary|ink|dot|ok|warn|err|heat-[1-5]|heat-text|heat-page|serif|sans|mono)\s*:/g)) warn("tokens.kit", `a style sets --${name}; the kit sets it in four places, so your value is lost in dark mode or in print. Use the --host-* tokens, or a palette for the page and the grays (see SKILL.md)`);
  const hosts = {};
  // The page's own host colors, then each one of the repo file that the page does not set itself: the page's own value wins.
  const own = [...css.matchAll(/--(host-accent-dark|host-accent|host-ink|host-dot-dark)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim(), ""]);
  const brandValue = htmlAttr(html, "data-brand"); // "off": a page about another product takes no brand field of the repo file
  const fileTokens = (brandValue !== "off" && options.config && options.config.data && options.config.data.tokens) || {};
  for (const name of Object.keys(HOST)) if (Object.hasOwn(fileTokens, name) && !own.some(([n]) => n === name)) own.push([name, fileTokens[name].value.toLowerCase(), ` from ${options.config.label}`]);
  for (const [name, color, from] of own) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) { warn("host.hex", `--${name} is "${color}"; check tests the contrast of a hex color only, such as #2f3fd0`); hosts[name] = null; continue; }
    hosts[name] = color;
    const [theme, need] = HOST[name];
    const low = GROUNDS[theme].map((ground) => [ground, contrast(color, ground)]).filter(([, ratio]) => ratio < need);
    if (low.length) error("host.contrast", `--${name} ${color}${from} has a contrast of ${low.map(([g, r]) => `${r.toFixed(2)}:1 on ${g}`).join(" and ")}; ${need === 3 ? "the dot is a mark and needs 3:1" : "text needs 4.5:1"}`);
  }
  // An accent can pass contrast and still mislead: it looks like a status, or like the body text, or dark mode falls back to Docent's own accent.
  for (const [name, theme] of [["host-accent", "light"], ["host-accent-dark", "dark"]]) {
    const color = hosts[name];
    if (!color) continue;
    const near = nearestStatus(color, theme);
    if (near.distance < NEAR) warn("accent.status", `--${name} ${color} is close to the ${theme === "dark" ? "dark " : ""}status color "${near.name}" (a distance of ${near.distance.toFixed(1)}); its links and dots would read as ${{ ok: "success", warn: "a warning", err: "an error" }[near.name]}. Choose an accent further from green, amber and red`);
    if (lab(color).C < GRAY) warn("accent.gray", `--${name} ${color} has almost no color (chroma ${lab(color).C.toFixed(1)}); it looks like the body text, so a link is told apart by its underline only`);
  }
  // A deck in present mode is always light, and a projector lowers contrast, so its accent should reach 7:1 (AAA) on the page. A warning:
  // brand.cjs darkens a host's accent only to 4.6:1, and the host may not want a darker one.
  const PRESENT = 7;
  if (deck && hosts["host-accent"] && contrast(hosts["host-accent"], GROUNDS.light[0]) < PRESENT) warn("deck.accent", `in a deck the accent should have ${PRESENT}:1 on the page, because a projector lowers contrast; ${hosts["host-accent"]} has ${contrast(hosts["host-accent"], GROUNDS.light[0]).toFixed(1)}:1`);
  if (hosts["host-accent"] && !("host-accent-dark" in hosts)) warn("host.dark", `--host-accent is set and --host-accent-dark is not, so dark mode shows Docent's ultramarine links on the host's page. The same hue at 7:1 on the dark page is ${darkAccent(hosts["host-accent"])}: --host-accent-dark: ${darkAccent(hosts["host-accent"])};`);
  if (/@import\b/i.test(css)) error("network.import", "a style uses @import; a document is one file with no network");
  for (const [, target] of css.matchAll(/url\(\s*["']?([^"')]*)/gi)) if (!local(target)) error("network.url", `a style loads url(${target.slice(0, 60)}); a document is one file with no network`);
  if (scripts.trim()) {
    warn("script.outside", "the document has a script outside the kit; the page must still be readable with scripts off");
    if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|\bimport\s*\(/.test(scripts)) error("network.script", "a script outside the kit can use the network; a document is one file with no network");
  }

  // 3b. The host's logo in the top bar: plain shapes only, inside the file, in its slot, and readable in both themes.
  const logo = checkLogos(markup, { light: GROUNDS.light[0], dark: GROUNDS.dark[0] });
  errors.push(...logo.errors);
  warnings.push(...logo.warnings);
  let unbranded = markup; // the page without its logo: a logo is the host's own mark, so it may hold a gradient
  for (const l of [...logo.logos].reverse()) unbranded = unbranded.slice(0, l.start) + unbranded.slice(l.end);

  // 4. Flat: no gradients, shadows or filters, and no pattern on a ground.
  const flat = [[/gradient\s*\(/i, "a gradient", "flat.gradient"], [/\b(box|text)-shadow\s*:/i, "a shadow", "flat.shadow"], [/drop-shadow\s*\(/i, "a shadow", "flat.shadow"], [/(^|[;{\s])(backdrop-)?filter\s*:/i, "a filter", "flat.filter"]];
  for (const [pattern, what, id] of flat) if (pattern.test(css)) error(id, `a style uses ${what}; the page is flat`);
  for (const [, tag] of unbranded.matchAll(/<(linearGradient|radialGradient|filter|pattern)\b/g)) error({ filter: "flat.filter", pattern: "flat.pattern" }[tag] || "flat.gradient", `<${tag}> is used; the page is flat, with no gradient, shadow or pattern${/Gradient/.test(tag) ? " (only a host's logo in the top bar may hold a gradient)" : ""}`);
  if (/text-transform\s*:\s*uppercase/i.test(css)) error("text.uppercase", "a style sets text in uppercase; a label is written in sentence case");
  if (/background(-color)?\s*:\s*(#fff(fff)?\b|white\b|#000(000)?\b|black\b)/i.test(css)) error("ground.pure", "a style sets a pure white or pure black background; use the page tokens");

  // 5. No text below 14px outside diagrams. A rule for a hand-drawn figure (every selector starts with svg[data-drawn="hand"], as in the
  // kit's hd-* classes) styles a drawing: its text keeps its real size in px, at least 12px.
  const drawn = /(?<=^|[{};])\s*((?:svg\[data-drawn="hand"\][^,{}]*,\s*)*svg\[data-drawn="hand"\][^,{}]*)\{([^{}]*)\}/g;
  const pageCss = css.replace(drawn, (all, selectors, body) => {
    for (const [, prop, value, unit] of body.matchAll(/(?:^|[;\s])(font-size|font)\s*:[^;}]*?\b([\d.]+)(px|rem|em|%)/gi)) if (unit.toLowerCase() !== "px" || Number(value) < 12) error("text.drawing", `a style sets ${prop.toLowerCase()}: ${value}${unit} in a hand-drawn figure; text in a drawing is 12px or more, in px`);
    return "";
  });
  const small = (value, unit) => (unit === "px" ? value < 14 : unit === "%" ? value < 87.5 : value < 0.875);
  for (const [, value, unit] of pageCss.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em|%)/gi)) if (small(Number(value), unit.toLowerCase())) error("text.size", `a style sets font-size: ${value}${unit}; no text is below 14px outside diagrams`);
  for (const [, value, unit] of pageCss.matchAll(/(?:^|[;{\s])font\s*:[^;}]*?\b([\d.]+)(px|rem|em|%)/gi)) if (small(Number(value), unit.toLowerCase())) error("text.size", `a style sets font: ${value}${unit}; no text is below 14px outside diagrams`);
  for (const [, value] of markup.matchAll(/\bfont-size="([\d.]+)(?:px)?"/g)) if (Number(value) < 14) error("text.size", `an element has font-size="${value}"; no text is below 14px outside diagrams`);
  for (const [, tag] of markup.matchAll(/<(small|sub|sup)\b/gi)) error("text.small", `<${tag.toLowerCase()}> makes text smaller than its line; no text is below 14px outside diagrams`);

  // 6. The frame of the document.
  if (!/<html\b[^>]*\blang="[^"]+"/i.test(markup)) error("frame.lang", '<html> has no lang attribute');
  const fixed = (markup.match(/<html\b[^>]*\bdata-theme="([^"]*)"/i) || [])[1];
  if (fixed != null && !["light", "dark"].includes(fixed)) error("frame.theme", `<html> has data-theme="${fixed}"; a fixed theme is "light" or "dark"`);
  if (brandValue != null && brandValue !== "off") error("frame.brand", `<html> has data-brand="${brandValue}"; the only value is "off", for a page about another product, which takes nothing from the repo's brand`);
  if (!/<meta\b[^>]*name="viewport"/i.test(markup)) error("frame.viewport", 'the document has no <meta name="viewport">');
  const h1 = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1.length !== 1) error("frame.h1", `the document has ${h1.length} <h1> headings; it must have one`);
  const title = (markup.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const host = logo.name; // the host's name in the top bar, or the name that a wordmark carries
  if (title == null || !plain(title)) error("frame.title", "the document has no <title>");
  else {
    const at = plain(title).lastIndexOf(" — ");
    if (at < 1) error("title.format", `the <title> is "${plain(title)}"; its format is "Document title — Host project"`);
    else {
      const [left, right] = [plain(title).slice(0, at), plain(title).slice(at + 3)];
      // The window title may be a shorter form of the h1: its words appear in the h1, in the same order.
      if (h1.length === 1 && !shorter(left, plain(h1[0][1]))) warn("title.h1", `the <title> starts with "${left}", but the <h1> is "${plain(h1[0][1])}"; the window title is the h1, or a shorter form of it made of the h1's own words in the same order`);
      if (host != null && right !== host) warn("title.host", `the <title> ends with "${right}", but the host project in the top bar is "${host}"`);
      if (/docent/i.test(plain(title)) && !(host != null && /docent/i.test(host))) error("title.docent", 'the <title> names Docent; the title holds the document and the host project only');
    }
  }

  // 6b. The footer: the host's tagline, in its own words, and the credit. Docent is MIT-licensed, so a missing credit is a warning, to make sure it is a choice.
  const footer = (markup.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i) || [])[1];
  if (!(host != null && /docent/i.test(host)) && !(footer != null && /Made with Docent/.test(plain(footer)))) warn("credit.missing", 'the footer has no "Made with Docent"; keep the credit unless the host chose to remove it (see "Logo, tagline and credit" in SKILL.md)');
  for (const [, inner] of (footer || "").matchAll(/<[a-z]+\b[^>]*\bclass="(?:[^"]*\s)?tagline(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/[a-z]+>/gi)) {
    if (/<[a-z]/i.test(inner)) warn("tagline.markup", "the tagline holds markup or a link; it is one line of plain text");
    if (plain(inner).length > TAGLINE) warn("tagline.length", `the tagline has ${plain(inner).length} characters; it is one line of at most ${TAGLINE}`);
  }

  // 7. Facts about one item go in a margin note, not in one line of text joined by | or ·. Code may hold a | of its own.
  for (const [, inner] of markup.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const line = plain(inner.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, ""));
    if (line.split(/\s[|·]\s/).length >= 3) warn("facts.joined", `the paragraph "${line.length > 60 ? `${line.slice(0, 60)}…` : line}" joins facts with "|" or "·"; list them in a margin note beside the item (see "Facts about one item go in the margin" in DESIGN.md)`);
  }

  // 8. The profile of the page. The agent chooses it; check names a suggestion only when one rule wins clearly.
  const profile = (markup.match(/<html\b[^>]*\bdata-profile="([^"]*)"/i) || [])[1];
  const text = (markup.match(/<html\b[^>]*\bdata-text="([^"]*)"/i) || [])[1];
  if (profile != null && !PROFILES.includes(profile)) error("frame.profile", `<html> has data-profile="${profile}"; a profile is ${PROFILES.map((p) => `"${p}"`).join(", ")}`);
  if (text != null && text !== "large") error("frame.text", `<html> has data-text="${text}"; the only value is "large", for a page for the public`);
  const suggested = suggestProfile(markup);
  const looks = suggested.sure && suggested.profile !== "standard" ? `; the page looks like "${suggested.profile}": ${suggested.reasons[0]}` : "";
  if (profile == null) warn("profile.missing", `<html> has no data-profile, so the page uses "standard"${looks}; write the profile on <html> (see "Choose a profile" in SKILL.md)`);
  else if (PROFILES.includes(profile) && profile !== "deck" && looks && suggested.profile !== profile) warn("profile.suggest", `<html> has data-profile="${profile}"${looks}; keep the profile only if the readers need it (see "Choose a profile" in SKILL.md)`);

  // 9. A skip link: the first thing a keyboard reaches, so the reader can jump past the top bar to <main>.
  const mainId = ((markup.match(/<main\b[^>]*>/i) || [""])[0].match(/\bid="([^"]+)"/) || [])[1];
  const skip = [...markup.matchAll(/<a\b([^>]*)>/gi)].find(([, attrs]) => hasClass(attrs, "skip"));
  const skipHint = '<a class="skip" href="#content">Skip to the content</a> first in <body>, and id="content" on <main> (see the starting page)';
  if (!skip) warn("skip.link", `the page has no skip link; a keyboard reader must tab through the whole top bar first. Put ${skipHint}`);
  else {
    const target = (skip[1].match(/\bhref="#([^"]*)"/) || [])[1];
    if (target == null || target !== mainId) warn("skip.link", `the skip link points at ${target == null ? "no place on the page" : `"#${target}"`}, but <main> has ${mainId ? `id="${mainId}"` : "no id"}; it jumps to <main>`);
    const before = markup.slice(markup.search(/<body\b/i), skip.index);
    if (/<(?:a\b[^>]*\bhref=|button\b|input\b|select\b|textarea\b|summary\b)|\btabindex="(?!-)/i.test(before)) warn("skip.link", "the skip link is not the first thing a keyboard reaches; put it first in <body>");
  }

  // 10. Numbers line up on the right: a column of an author's table that holds numbers only takes the class "num".
  const numberIssues = []; // places that break a rule of "Numbers" in DESIGN.md: the column rules here, the rules of the words in 10c
  for (const table of markup.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const head = (table[1].match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i) || [])[1] || "";
    const body = table[1].replace(/<thead\b[^>]*>[\s\S]*?<\/thead>/i, "");
    if (/\b(colspan|rowspan)=/i.test(body)) continue; // the columns of a merged cell are not clear from the source
    const cells = (rows) => [...rows.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) => [...row.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map(([, tag, attrs, inner]) => ({ tag: tag.toLowerCase(), attrs, text: plain(inner), code: /<(code|kbd|samp)\b/i.test(inner) })));
    const rows = cells(body), names = (cells(head)[0] || []).map((c) => c.text);
    const label = (markup.slice(0, table.index).match(/aria-label="([^"]*)"[^>]*>\s*$/) || [])[1];
    for (let c = 0; c < Math.max(0, ...rows.map((r) => r.length)); c += 1) {
      const column = rows.map((r) => r[c]).filter(Boolean);
      if (column.some((cell) => cell.tag === "th")) continue; // a row heading names its row, like an id, even when it is a number
      const where = `in the column ${names[c] ? `"${names[c]}"` : c + 1} of ${label ? `the table "${label}"` : "a table"}`;
      for (const found of findNumberColumn(column.filter((cell) => hasClass(cell.attrs, "num") && !cell.code && NUMBER.test(cell.text)).map((cell) => cell.text))) numberIssues.push({ ...found, found: `${found.found} ${where}` });
      const numbers = column.filter((cell) => NUMBER.test(cell.text));
      if (!numbers.length || !column.every((cell) => NUMBER.test(cell.text) || BLANK.test(cell.text)) || numbers.every((cell) => hasClass(cell.attrs, "num"))) continue;
      warn("table.num", `${label ? `the table "${label}"` : "a table"}: the column ${names[c] ? `"${names[c]}"` : c + 1} holds numbers only; add class="num" to its th and td cells, so the numbers line up on the right`);
    }
  }

  // 10b. A source line is the last line of one figure's caption, and it names a source.
  for (const { index, inner } of withClass(markup, "source")) {
    const before = markup.slice(0, index).toLowerCase();
    if (before.lastIndexOf("<figcaption") <= before.lastIndexOf("</figcaption")) warn("source.outside", `a source line (class="source") stands outside a figure caption, so it belongs to no figure; make it the last line of the <figcaption> of its chart or table`);
    if (/^(?:sources?\s*:?)?$/i.test(plain(inner))) warn("source.empty", `a source line is empty${plain(inner) ? ` ("${plain(inner)}")` : ""}; write where the numbers come from, their dates and n, such as "Source: the team's bug tracker, 1 July to 30 September 2026, n = 1,090 reports."`);
  }

  // 10c. Numbers are written by the rules of "Numbers" in DESIGN.md. check reads the author's words, with no code, drawing, data block
  // or web address, and gives one warning for each rule, with up to three places that break it.
  for (const found of findNumberText(wordsOf(markup))) numberIssues.push({ ...found, found: `"${found.found}" in "${found.context}"` });
  for (const { inner } of withClass(markup, "big").filter((b) => !/<(code|kbd|samp)\b/i.test(b.inner))) for (const found of findBigNumber(plain(inner))) numberIssues.push({ ...found, found: `${found.found} in a card` });
  const byRule = new Map();
  for (const issue of numberIssues) byRule.set(`${issue.rule} ${issue.fix}`, [...(byRule.get(`${issue.rule} ${issue.fix}`) || []), issue]);
  for (const list of [...byRule.values()].sort((a, b) => a[0].rule - b[0].rule)) {
    const more = list.length > 3 ? `, and ${list.length - 3} more` : "";
    warn(NUMBER_RULES[list[0].rule], `numbers, rule ${list[0].rule} (${list[0].name}): ${list.slice(0, 3).map((i) => i.found).join(", ")}${more}; ${list[0].fix} (see "Numbers" in DESIGN.md)`);
  }

  // 10d. A number with its change: the third line of a card, after the line that says what the number counts. The direction is a word,
  // and the period it is compared with follows "against" (rule 8 of "Numbers"). It never takes a status or a color.
  const grids = [...markup.matchAll(/<ul\b[^>]*\bclass="(?:[^"]*\s)?cards(?:\s[^"]*)?"[^>]*>[\s\S]*?<\/ul>/g)].map((m) => [m.index, m.index + m[0].length]);
  for (const { index, attrs, inner } of withClass(markup, "change")) {
    const line = plain(inner), quoted = `"${line.length > 60 ? `${line.slice(0, 60)}…` : line}"`, grid = grids.find(([a, b]) => a < index && index < b);
    if (!grid) warn("numbers.change", `a change line (${quoted}) stands outside a card grid; in a sentence, write the same parts with no markup, such as "up 12% against Q2 2026 (973)"`);
    else {
      const before = markup.slice(grid[0], index), card = before.slice(Math.max(before.lastIndexOf("<li>"), before.lastIndexOf("<li ")));
      if (![...card.matchAll(/<p\b([^>]*)>/g)].some(([, a]) => !hasClass(a, "big") && !hasClass(a, "change"))) warn("numbers.change", `a change line (${quoted}) comes before the line that says what the card's number counts; put it third, after that line`);
    }
    if (!/^(?:Up|Down|No change)\b/.test(line) || !/\bagainst\b/.test(line)) warn("numbers.change", `a change line (${quoted}) starts with the direction as a word ("Up", "Down" or "No change") and names the period it is compared with after "against"; write it as "Up 12% against Q2 2026 (973)"`);
    if (/\b(?:state|ok|warn|err|info|plan)\b/.test((attrs.match(/\bclass="([^"]*)"/) || [])[1] || "") || /\bstyle="[^"]*(?:color|background)/i.test(attrs) || /\bclass="(?:[^"]*\s)?state(?:\s[^"]*)?"/.test(inner)) warn("numbers.change", `a change line (${quoted}) takes a status or a color; the direction is not a status, because up is not always good. Say in the text whether the change is good news`);
  }

  // 10e. Footnotes: a full-size mark "[n]" links to note n in a notes list (<ol class="notes">) at the end of its section, and the note links
  // back to its mark. The notes run 1, 2, 3 … down the page, so "note 3" names one note, also on paper. A broken link is an error.
  const sections = [], opened = [];
  for (const m of markup.matchAll(/<(\/?)section\b[^>]*>/gi)) if (!m[1]) opened.push(m.index); else if (opened.length) sections.push([opened.pop(), m.index]);
  const sectionOf = (i) => sections.filter(([a, b]) => a < i && i < b).sort((x, y) => y[0] - x[0])[0];
  const headings = [...markup.matchAll(/<h([1-6])\b[^>]*>[\s\S]*?<\/h\1>/gi)].map((m) => [m.index, m.index + m[0].length]);
  const attrOf = (attrs, name) => (attrs.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
  const notes = withClass(markup, "notes").filter((l) => l.tag === "ol").flatMap((list) => {
    // The number a reader sees: start, then one more for each item, or an item's own value; a reversed list counts down.
    if (/\breversed\b/i.test(list.attrs)) error("footnotes.numbers", 'a notes list is reversed; the notes run 1, 2, 3 … down the page, so take out "reversed"');
    let n = Number(attrOf(list.attrs, "start") || 1) - 1;
    return [...list.inner.matchAll(/<li\b([^>]*)>([\s\S]*?)(?=<li\b|$)/gi)].map(([, attrs, body]) => ({ n: (n = attrOf(attrs, "value") != null ? Number(attrOf(attrs, "value")) : n + 1), id: attrOf(attrs, "id"), body: body.replace(/<\/li>\s*$/i, ""), at: list.index }));
  });
  const marks = withClass(markup, "fn").filter((m) => m.tag === "a").map((m) => ({ ...m, text: plain(m.inner), href: attrOf(m.attrs, "href") || "", target: ((attrOf(m.attrs, "href") || "").match(/^#(.+)/) || [])[1], id: attrOf(m.attrs, "id"), label: attrOf(m.attrs, "aria-label") }));
  if (notes.some((note, i) => note.n !== i + 1)) error("footnotes.numbers", `the notes run ${notes.map((note) => note.n).join(", ")} down the page; they run 1, 2, 3 … with no gap and no repeat, so a notes list after the first takes start="n", where n follows the last note before it`);
  for (const mark of marks) {
    const note = notes.find((x) => x.id && x.id === mark.target), name = `the footnote mark "${mark.text}"`;
    if (!note) { error("footnotes.link", `${name} links to "${mark.href}", which is no note in a notes list (<ol class="notes">) on this page${mark.target || !mark.href ? "" : `; a link to a place on the page starts with #, as in href="#${mark.href}"`}`); continue; }
    if (mark.text !== `[${note.n}]`) error("footnotes.numbers", `${name} links to note ${note.n}; write "[${note.n}]"`);
    if (mark.label !== `Note ${note.n}`) warn("footnotes.label", `${name} has ${mark.label == null ? "no aria-label" : `aria-label="${mark.label}"`}; give it aria-label="Note ${note.n}", so a screen reader says "Note ${note.n}, link" and not the brackets`);
    if (headings.some(([a, b]) => a < mark.index && mark.index < b)) warn("footnotes.heading", `${name} stands in a heading; a screen reader lists headings by their words, where "Note ${note.n}" is noise. Put the mark in the text below`);
    if (sectionOf(mark.index) !== sectionOf(note.at)) warn("footnotes.section", `${name} and its note stand in different sections; put the note in the notes list at the end of the mark's section`);
  }
  const order = marks.map((mark) => (notes.find((x) => x.id && x.id === mark.target) || {}).n).filter(Boolean);
  if (order.some((n, i) => i && n < order[i - 1])) warn("footnotes.order", `the footnote marks run ${order.join(", ")} down the page; number the notes in the order of their marks`);
  for (const note of notes) {
    const own = marks.filter((mark) => note.id && mark.target === note.id), back = withClass(note.body, "back").filter((b) => b.tag === "a");
    if (!own.length) error("footnotes.link", `note ${note.n} has no mark in the text that links to it${note.id ? ` (href="#${note.id}")` : "; give it an id, such as id=\"fn-" + note.n + "\""}`);
    else if (own.length > 1) error("footnotes.link", `note ${note.n} has ${own.length} marks; a note has one mark. In the second place, say it in words or cite a source`);
    if (!back.length) error("footnotes.back", `note ${note.n} has no link back to its mark; end it with <a class="back" href="#fn-${note.n}-ref" aria-label="Back to the text of note ${note.n}">Back</a>`);
    else if (own.length === 1) {
      const href = attrOf(back[0].attrs, "href") || "", label = attrOf(back[0].attrs, "aria-label") || "";
      if (!own[0].id) error("footnotes.back", `the mark of note ${note.n} has no id, so the note cannot link back to it; give the mark id="fn-${note.n}-ref"`);
      else if (href !== `#${own[0].id}`) error("footnotes.back", `the link back of note ${note.n} points at "${href}", but its mark has id="${own[0].id}"; write href="#${own[0].id}"`);
      if (!new RegExp(`\\bnote ${note.n}\\b`, "i").test(label)) warn("footnotes.label", `the link back of note ${note.n} has ${label ? `aria-label="${label}"` : "no aria-label"}; give it aria-label="Back to the text of note ${note.n}", so a list of links tells the "Back" links apart`);
    }
    const count = words(plain(note.body.replace(/<a\b[^>]*\bclass="(?:[^"]*\s)?back(?:\s[^"]*)?"[^>]*>[\s\S]*?<\/a>/gi, ""))).length;
    if (count > 60) warn("footnotes.length", `note ${note.n} has ${count} words; a note is one to three sentences. Longer detail belongs in the text, or in "Method and limits"`);
  }

  // 10f. The list of sources (<ul class="sources">): each citation links to an entry, each entry is cited, in order by its id (family name
  // and year), with its year in brackets and its address as the link's own text, because paper has no link. Written by hand (decision 8).
  const sourceLists = withClass(markup, "sources").filter((l) => l.tag === "ul");
  if (sourceLists.length > 1) warn("sources.second", `the page has ${sourceLists.length} lists of sources; it has one, in a section titled "Sources" after "Method and limits"`);
  const entries = sourceLists.flatMap((list) => [...list.inner.matchAll(/<li\b([^>]*)>([\s\S]*?)(?=<li\b|$)/gi)].map(([, attrs, body]) => ({ id: attrOf(attrs, "id"), body: body.replace(/<\/li>\s*$/i, "") })));
  const cites = [...markup.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([, attrs, inner]) => ({ raw: attrOf(attrs, "href") || "", text: plain(inner) })).filter((c) => /^#?src-/.test(c.raw)).map((c) => ({ ...c, href: c.raw.startsWith("#") ? c.raw.slice(1) : null }));
  for (const cite of cites) if (!entries.some((e) => e.id && e.id === cite.href)) error("sources.cite", `the citation "${cite.text}" links to "${cite.raw}", which is no entry in the list of sources (<ul class="sources">)${cite.href ? "" : `; a link to a place on the page starts with #, as in href="#${cite.raw}"`}`);
  const short = (e) => `"${plain(e.body).slice(0, 40)}…"`;
  for (const entry of entries) {
    if (!cites.some((c) => c.href === entry.id)) warn("sources.uncited", `the source ${entry.id ? `"${entry.id}"` : short(entry)} is not cited in the text; cite it as a link to its entry, such as (<a href="#${entry.id || "src-name-2026"}">Name, 2026</a>), or take it out`);
    if (!/\((?:\d{4}[a-z]?|no date)\)/.test(plain(entry.body))) warn("sources.year", `the source ${entry.id ? `"${entry.id}"` : short(entry)} has no year in brackets; write it after the authors, such as "(2024)", or "(no date)"`);
    for (const [, attrs, inner] of entry.body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
      const href = attrOf(attrs, "href") || "";
      if (plain(inner) !== plain(href)) warn("sources.link-text", `a link in the source ${entry.id ? `"${entry.id}"` : short(entry)} reads "${plain(inner)}"; paper has no link, so write the address as the link's text: <a href="${href}">${href}</a>`);
    }
  }
  const sourceKey = (id) => { const m = (id || "").match(/^src-(.+)-(\d{4}[a-z]?|no-date)$/); return m ? [m[1], m[2]] : null; };
  const keys = entries.map((e) => sourceKey(e.id));
  for (const [i, entry] of entries.entries()) if (entry.id && !keys[i]) warn("sources.id", `the source id "${entry.id}" is not "src-" with the first family name and the year, such as "src-cleveland-1984"; the list is ordered by it`);
  const sorted = keys.filter(Boolean);
  if (sorted.some((k, i) => i && (k[0] < sorted[i - 1][0] || (k[0] === sorted[i - 1][0] && k[1] < sorted[i - 1][1])))) warn("sources.order", `the list of sources is not in order: ${sorted.map((k) => `${k[0]} ${k[1]}`).join(", ")}; order it by the first family name, then the year`);

  // 10g. "Method and limits" holds four parts, each a block heading, in this order. A page without the section gets no warning: whether it
  // needs one is the author's judgment.
  for (const [i, [, inner]] of [...markup.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].entries()) {
    if (plain(inner).toLowerCase() !== "method and limits") continue;
    const start = [...markup.matchAll(/<h2\b[^>]*>/gi)][i].index, own = sectionOf(start), part = own ? markup.slice(start, own[1]) : markup.slice(start).split(/<h2\b/i)[1] || "";
    const found = [...part.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].map(([, h]) => plain(h).toLowerCase()), want = ["method", "data", "what was left out", "how sure the result is"];
    let at = 0;
    for (const h of found) if (h === want[at]) at += 1;
    if (at < want.length) warn("method.parts", `"Method and limits" has the block headings ${found.length ? found.map((h) => `"${h}"`).join(", ") : "none"}; it holds four, in this order: "Method", "Data", "What was left out" and "How sure the result is". A part with nothing to say keeps its heading and says so`);
  }

  // 10h. Status words: each listed word takes the state whose question it answers ("Status notes" in SKILL.md). Only a label that is the
  // word alone, or the word then "by …", is tested: a longer label, such as "In progress, late", may add a judgment of its own.
  for (const { attrs, inner } of withClass(markup, "state").filter((s) => s.tag === "span")) {
    const label = plain(inner), got = (((attrs.match(/\bclass="([^"]*)"/) || [])[1] || "").match(/\b(ok|warn|err|info|plan)\b/) || [])[1];
    const word = Object.keys(STATUS_WORDS).find((w) => new RegExp(`^${w}(?:\\s+by\\b.*)?\\.?$`, "i").test(label));
    if (!word || !got || got === STATUS_WORDS[word][0]) continue;
    const [want, why] = STATUS_WORDS[word];
    warn("status.words", `"${label}" takes the state ${want} (${why}), not ${got}; write ${got} with words that say why, such as "In progress, late" (see "Status notes" in SKILL.md)`);
  }

  // 10i. Key findings (<ol class="findings">): 2 to 6 items, each opening with one sentence in <strong>, the finding itself. check cannot
  // tell a finding from a topic, or whether the answer is on the page; those stay with the author.
  for (const list of withClass(markup, "findings").filter((l) => l.tag === "ol")) {
    const label = attrOf(list.attrs, "aria-label"), name = label ? `the findings list "${label}"` : "a findings list";
    if (!label) warn("findings.label", `a findings list (<ol class="findings">) has no aria-label; give it aria-label="Key findings" or "Recommendations", so a screen reader does not name it only "list"`);
    const items = [...list.inner.matchAll(/<li\b[^>]*>([\s\S]*?)(?=<li\b|$)/gi)].map(([, body]) => body.replace(/<\/li>\s*$/i, "").trim());
    if (items.length < FINDINGS[0] || items.length > FINDINGS[1]) warn("findings.count", `${name} has ${items.length} item${items.length === 1 ? "" : "s"}; it holds ${FINDINGS[0]} to ${FINDINGS[1]}. One finding is a sentence or a status note, and more than ${FINDINGS[1]} are not key`);
    items.forEach((body, i) => {
      const lead = (body.match(/^<strong\b[^>]*>([\s\S]*?)<\/strong>/i) || [])[1], item = `item ${i + 1} of ${name}`;
      if (lead == null) return warn("findings.lead", `${item} does not start with <strong>; each key finding starts with one sentence in <strong>, the finding itself`);
      const text = plain(lead), count = text.split(" ").filter(Boolean).length, quoted = `"${text.length > 60 ? `${text.slice(0, 60)}…` : text}"`;
      if (!/\.$/.test(text)) warn("findings.lead", `the lead sentence of ${item} (${quoted}) does not end with a period; it is one full sentence, with a subject and a verb`);
      if (count > LEAD_WORDS) warn("findings.lead", `the lead sentence of ${item} (${quoted}) has ${count} words; it has at most ${LEAD_WORDS}. Move the detail into the sentences after it`);
      if (/<a\b/i.test(lead) || /\bclass="(?:[^"]*\s)?state(?:\s[^"]*)?"/.test(lead)) warn("findings.link", `the lead sentence of ${item} (${quoted}) holds a link or a state; put it in the sentences after the <strong>, so a list of links names each link once`);
    });
  }

  // 10j. A total row: one or two rows in a <tfoot>, each named by a row heading in words. A cell with data-sum is the sum of the body cells
  // in its column: exact, or within half a unit of its last digit for each body row with data-sum="rounded". A weighted sum, an average or
  // a rate is not a sum, and check does not work it out.
  for (const table of markup.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const label = (markup.slice(0, table.index).match(/aria-label="([^"]*)"[^>]*>\s*$/) || [])[1], name = label ? `the table "${label}"` : "a table";
    const part = (tag) => (table[1].match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")) || [])[1];
    const rowsOf = (rows) => [...(rows || "").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) => [...row.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map(([, tag, attrs, inner]) => ({ tag: tag.toLowerCase(), attrs, text: plain(inner) })));
    const names = (rowsOf(part("thead"))[0] || []).map((c) => c.text), body = rowsOf(table[1].replace(/<(thead|tfoot)\b[^>]*>[\s\S]*?<\/\1>/gi, "")), foot = rowsOf(part("tfoot"));
    const last = (body[body.length - 1] || [])[0];
    if (part("tfoot") == null && last && last.tag === "th" && /^(?:total\b|all )/i.test(last.text)) warn("table.total-row", `${name}: the last body row "${last.text}" reads as a total; put it in a <tfoot> after the <tbody>, so it stands under a rule and prints once`);
    if (foot.length > 2) warn("table.foot-rows", `${name} has ${foot.length} rows in its <tfoot>; it holds one or two, such as a total and an average`);
    for (const row of foot) {
      if (!row[0] || row[0].tag !== "th" || !/\bscope="row"/.test(row[0].attrs) || !row[0].text) warn("table.foot-heading", `${name}: a row of its <tfoot> has no row heading in words; start it with <th scope="row">, such as "Total" or "All areas", because a screen reader reads that heading with each cell`);
      row.forEach((cell, c) => {
        const mode = attrOf(cell.attrs, "data-sum") ?? (/\bdata-sum\b/.test(cell.attrs) ? "" : null);
        if (mode == null) return;
        if (/\b(?:colspan|rowspan)=/i.test(table[1])) return; // the columns of a merged cell are not clear from the source
        const column = names[c] ? `"${names[c]}"` : c + 1, total = sumValue(cell.text);
        if (total == null) return warn("table.sum", `${name}: the total "${cell.text}" in column ${column} is not a number, so check cannot add up its column`);
        const parts = body.map((r) => r[c]).filter(Boolean), bad = parts.find((p) => sumValue(p.text) == null);
        if (bad) return warn("table.sum", `${name}: the cell "${bad.text}" in column ${column} is not a number, so check cannot add up the column for its total ${cell.text}`);
        const decimals = (cell.text.match(/\.(\d+)/) || ["", ""])[1].length, sum = parts.reduce((a, p) => a + sumValue(p.text), 0);
        const allowed = mode === "rounded" ? (parts.length * 10 ** -decimals) / 2 : 0;
        if (Math.abs(sum - total) > allowed + 1e-9) warn("table.sum", `${name}: the total ${cell.text} in column ${column} is not the sum of its column, ${sum.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${mode === "rounded" ? `, within ${Number(allowed.toFixed(decimals + 1))} for rounded parts` : ""}`);
      });
    }
  }

  // 10k. A quote with its speaker: <figure class="quote"> holds one <blockquote> and, after it, a <figcaption> with the speaker in plain text.
  // check cannot tell a code from a person's name, or whether the words are what the person said.
  const quotes = withClass(markup, "quote").filter((f) => f.tag === "figure");
  const inQuote = (i) => quotes.some((q) => { const from = q.index + q.tag.length + q.attrs.length + 2; return from <= i && i < from + q.inner.length; }); // inside the figure's own markup
  for (const m of markup.matchAll(/<blockquote\b/gi)) if (!inQuote(m.index)) warn("quote.outside", `a <blockquote> stands outside a quote figure; a quote needs its speaker: <figure class="quote"><blockquote><p>…</p></blockquote><figcaption>P3, tester</figcaption></figure>`);
  for (const { inner } of quotes) {
    const said = (inner.match(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i) || [])[1], speaker = inner.match(/<\/blockquote>[\s\S]*?<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i);
    const text = plain((said || "").replace(/<\/p>\s*<p\b[^>]*>/gi, " ")), quoted = `"${text.length > 40 ? `${text.replace(/^(.{0,40})\s[\s\S]*$/, "$1")}…` : text}"`; // cut at a word
    if (said == null || !speaker || !plain(speaker[1])) warn("quote.speaker", `the quote ${said == null ? "figure" : quoted} has no speaker after its <blockquote>; a quote needs its speaker: a <figcaption> after the <blockquote>, such as "P3, tester"`);
    if ((inner.match(/<blockquote\b/gi) || []).length > 1 || /<table\b/i.test(inner) || wells(inner).length) warn("quote.parts", `the quote ${quoted} holds ${/<table\b/i.test(inner) ? "a table" : wells(inner).length ? "a figure well" : "more than one <blockquote>"}; a quote figure holds one <blockquote> and its speaker, nothing else`);
    if (/^["“”«»„]|["“”«»„]$|^['‘’][\s\S]*['‘’]$/.test(text)) warn("quote.marks", `the quote ${quoted} starts or ends with a quotation mark; the kit draws the quotation marks, so leave them out`);
    const count = text.split(" ").filter(Boolean).length;
    if (count > QUOTE_WORDS) warn("quote.length", `the quote ${quoted} has ${count} words; a quote has at most ${QUOTE_WORDS}. A longer passage belongs in the text, in the author's words`);
    if (speaker && /<(?:code|a)\b/i.test(speaker[1])) warn("quote.speaker-markup", `the speaker line of the quote ${quoted} holds a <code> or a link; it is plain text, such as "P3, tester"`);
  }

  // 11. Personal data: email addresses and phone numbers, in the page text and in the data of each diagram and widget. A warning only:
  // the author decides. Reserved example names (example.com, .test, 555-0100 to 555-0199) pass. Names and postal addresses are not found.
  const pageText = [textOf(markup), ...[...markup.matchAll(/\b(?:alt|title|aria-label)="([^"]*)"/gi)].map((m) => m[1])].join(" \n ");
  const places = [["the page text", [...findPersonal(pageText), ...[...markup.matchAll(/\bhref="(mailto:[^"]*|tel:[^"]*)"/gi)].flatMap(([, href]) => (/^tel:/i.test(href) ? findTel(href) : findPersonal(decoded(href.slice(7)))))]]];
  // A hand-drawn figure has no data block, and check leaves it out of the page text above, so its words are read here.
  if (hand.drawn.length) places.push(["the text of a hand-drawn figure", findPersonal(hand.drawn.map((svg) => [textOf(svg), ...[...svg.matchAll(/\baria-[\w-]+="([^"]*)"/gi)].map((m) => m[1])].join(" \n ")).join(" \n "))]);
  for (const [kind, list] of [["diagram", diagrams], ["widget", widgets]]) list.forEach((found, n) => {
    let data;
    try { data = JSON.parse(found.json); } catch { return; } // an error above already names it
    places.push([`the data of ${kind} ${n + 1}${data && data.id ? ` ("${data.id}")` : ""}`, findPersonal(strings(data).join(" \n "))]);
  });
  for (const [where, found] of places) {
    const unique = found.filter((f, i) => found.findIndex((g) => g.masked === f.masked) === i);
    if (!unique.length) continue;
    const named = unique.slice(0, 3).map((f) => `${f.kind === "email" ? "an email address" : "a phone number"} ${f.masked}`).join(", ");
    warn("personal.data", `${where} holds what looks like personal data: ${named}${unique.length > 3 ? `, and ${unique.length - 3} more` : ""}. Remove it or mask it, or use a reserved example such as name@example.com or 555-0100`);
  }
  // 12. Rule changes in the repo file: each house-style rule that the file turns off becomes one note for the page, with the line of the
  // file, its reason, and how many places the rule would have reported. A rule that finds nothing says nothing.
  const changed = [], off = (options.config && options.config.data && options.config.data.rules) || {};
  for (const [id, change] of Object.entries(off)) {
    const found = [...errors, ...warnings].filter((e) => split(e).id === id);
    if (!found.length) continue;
    const line = options.config.lines && options.config.lines[id] ? `, line ${options.config.lines[id]}` : "";
    changed.push(say(id, `off in ${options.config.label}${line} (${JSON.stringify(change.reason)}); ${found.length === 1 ? "1 place" : `${found.length} places`} on the page, the first: ${split(found[0]).text}`));
    for (const list of [errors, warnings]) for (let i = list.length - 1; i >= 0; i -= 1) if (split(list[i]).id === id) list.splice(i, 1);
  }
  return { errors, warnings, notes: changed };
}

/** The list of rules, one line each: the ID, the group, and the part of the docs that explains it. */
function listRules() {
  const width = Math.max(...[...RULES.keys()].map((id) => id.length));
  return [...RULES.values()].map((r) => `${r.id.padEnd(width)}  ${r.group.padEnd(11)}  ${r.where}`).join("\n");
}
/** One line of the output: "error [cards.count]: …". */
const line = (file, level, entry) => { const { id, text } = split(entry); return `check ${file}: ${level}${id ? ` [${id}]` : ""}: ${text}`; };

const USAGE = "usage: node check.cjs [--config <path> | --no-config] <document.html> [more.html ...]\n       node check.cjs --rules";

function main(args) {
  if (args[0] === "--rules" && args.length === 1) {
    console.log(`${RULES.size} rules. A guarantee is a promise to the reader of every page; house style is Docent's own choice, which a team may turn off in .docent/config.json, with a reason (see "Rule changes" in DESIGN.md).`);
    console.log(listRules());
    return 0;
  }
  const files = [...args], noConfig = files.includes("--no-config") && files.splice(files.indexOf("--no-config"), 1);
  const at = files.indexOf("--config"), given = at >= 0 ? files.splice(at, 2)[1] : null;
  if (!files.length || files.some((f) => f.startsWith("--")) || (at >= 0 && !given) || (noConfig && at >= 0)) { console.error(USAGE); return 2; }
  let failed = 0;
  // The repo file of each page, read once before the pages: a problem in it is reported once, and the pages are checked without it.
  const configs = new Map(), configOf = new Map();
  for (const file of files) {
    const found = noConfig ? null : given ? path.resolve(given) : findConfig(path.dirname(path.resolve(file)));
    if (found && !configs.has(found)) {
      const config = readConfig(found, { palettes: PALETTES, profiles: PROFILES });
      config.label = path.relative(process.cwd(), config.file) || config.file;
      config.errors.forEach((e) => console.log(`check: error: ${config.label}, ${e}`));
      if (config.errors.length) failed += 1;
      configs.set(found, config);
    }
    configOf.set(file, found && configs.get(found).data ? configs.get(found) : null);
  }
  for (const file of files) {
    let result;
    try { result = checkDocument(fs.readFileSync(file, "utf8"), { config: configOf.get(file) }); } catch (error) { result = { errors: [say("check.file", error.message)], warnings: [] }; }
    result.errors.forEach((e) => console.log(line(file, "error", e)));
    result.warnings.forEach((w) => console.log(line(file, "warning", w)));
    (result.notes || []).forEach((n) => console.log(line(file, "note", n)));
    const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    console.log(`check ${file}: ${count(result.errors.length, "error")}, ${count(result.warnings.length, "warning")}${result.notes && result.notes.length ? `, ${count(result.notes.length, "note")}` : ""}`);
    if (result.errors.length) failed += 1;
  }
  console.log("check reads the source only. It does not open a browser, so it does not test contrast, the phone layout, print or motion.");
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { checkDocument, listRules, main };
