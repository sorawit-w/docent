#!/usr/bin/env node
// check: tests a Docent document against the rules that can be tested from its source.
// Usage: node check.cjs <document.html> [more.html ...]
// It does not open a browser. So it cannot test contrast, the phone layout, print or motion as a reader sees them.
const fs = require("node:fs");
const { VERSION, cssBlock, jsBlock, findKit } = require("./lib/kit.cjs");
const { renderDiagram } = require("./lib/diagram.cjs");
const { renderWidget } = require("./lib/widget.cjs");
const { findBlocks, block } = require("./lib/blocks.cjs");

const MOST_WIDGETS = 4; // more widgets than this in one document gives a warning

const plain = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
/** True when every word of a appears in b, in the same order. */
const shorter = (a, b) => { const want = words(a), have = words(b); let at = 0; for (const w of have) if (w === want[at]) at += 1; return want.length > 0 && at === want.length; };
const local = (value) => /^(#|data:)/i.test(value.trim()) || value.trim() === "";

/** Returns { errors, warnings }: two lists of plain sentences. */
function checkDocument(html) {
  const errors = [], warnings = [];

  // 1. The kit: the same styles and script in every document.
  for (const [kind, current] of [["styles", cssBlock()], ["script", jsBlock()]]) {
    const found = findKit(html).filter((k) => k.kind === kind);
    if (!found.length) errors.push(`the document has no kit ${kind}; run stamp`);
    else if (found.length > 1) errors.push(`the document has ${found.length} kit ${kind} blocks; it must have one`);
    else if (found[0].version !== VERSION) errors.push(`the kit ${kind} are version ${found[0].version}; this skill has ${VERSION}; run stamp`);
    else if (found[0].text !== current) errors.push(`the kit ${kind} were changed by hand or by a code formatter; run stamp, keep your own styles outside the markers, and keep the document out of the formatter (see SKILL.md)`);
  }

  // 2. Diagrams: each drawing must be the one that render makes from its data.
  const diagrams = findBlocks(html, "diagram"), ids = new Set(), shapes = new Map(), walks = [];
  diagrams.forEach((found, n) => {
    const name = `diagram ${n + 1}`;
    let data;
    try { data = JSON.parse(found.json); } catch (error) { return errors.push(`${name}: the data is not valid JSON: ${error.message}`); }
    try {
      const drawn = renderDiagram(data);
      const label = `${name} ("${drawn.model.id}")`;
      if (ids.has(drawn.model.id)) errors.push(`${label}: another diagram has the same id`);
      ids.add(drawn.model.id);
      drawn.icons.forEach((w) => errors.push(`${label}: ${w}`));
      drawn.warnings.filter((w) => !drawn.icons.includes(w)).forEach((w) => warnings.push(`${label}: ${w}`));
      if (found.text !== block("diagram", found.json, drawn.svg)) errors.push(`${label}: the drawing does not match its data; run render`);
      // A document should not draw the same thing twice.
      const shape = JSON.stringify([drawn.model.lanes.map((l) => l.name), drawn.model.parts.map((p) => [p.lane, p.name, p.note]), drawn.model.legs.map((l) => [l.from, l.to, l.verb])]);
      if (shapes.has(shape)) warnings.push(`${label} shows the same lanes, parts and legs as diagram "${shapes.get(shape)}"; a document should not draw the same thing twice`);
      else shapes.set(shape, drawn.model.id);
      if (drawn.model.place === "walk") walks.push({ label, legs: drawn.model.legs.length });
    } catch (error) {
      errors.push(`${name}${data && data.id ? ` ("${data.id}")` : ""}: ${error.message}`);
    }
  });
  let rest = html;
  for (const found of [...diagrams].reverse()) rest = rest.slice(0, found.start) + rest.slice(found.end);
  if (/<svg\b[^>]*\bclass="[^"]*\bdg\b/.test(rest)) errors.push("a diagram sits outside a diagram block; put its data in a block and run render");

  // 2b. Widgets: each widget must be the one that render makes from its data.
  const widgets = findBlocks(rest, "widget"), widgetIds = new Set(), kinds = new Set();
  widgets.forEach((found, n) => {
    const name = `widget ${n + 1}`;
    let data;
    try { data = JSON.parse(found.json); } catch (error) { return errors.push(`${name}: the data is not valid JSON: ${error.message}`); }
    try {
      const built = renderWidget(data);
      const label = `${name} ("${built.id}")`;
      if (widgetIds.has(built.id)) errors.push(`${label}: another widget has the same id`);
      widgetIds.add(built.id);
      if (found.text !== block("widget", found.json, built.html)) errors.push(`${label}: the widget does not match its data; run render`);
      kinds.add(built.key == null ? built.id : `chooser ${built.key}`); // choosers with the same options change together and count as one
    } catch (error) {
      errors.push(`${name}${data && data.id ? ` ("${data.id}")` : ""}: ${error.message}`);
    }
  });
  for (const found of [...widgets].reverse()) rest = rest.slice(0, found.start) + rest.slice(found.end);
  if (/\bclass="(?:[^"]*\s)?(choose|checks|decide)(?:\s[^"]*)?"/.test(rest)) errors.push("a widget sits outside a widget block; put its data in a block and run render");
  if (kinds.size > MOST_WIDGETS) warnings.push(`the document has ${kinds.size} widgets; a widget is for a reader who must choose, track or decide, and more than ${MOST_WIDGETS} in one document is a sign that some are not needed`);

  // A walkthrough lights leg n for step n, so the numbers must agree.
  const lists = [...rest.matchAll(/<ol\b[^>]*\bclass="[^"]*\bsteps\b[^"]*"[^>]*>([\s\S]*?)<\/ol>/g)].map((m) => m[1]);
  if (lists.length !== walks.length) errors.push(`the document has ${lists.length} walkthrough step lists and ${walks.length} diagrams with "place": "walk"; each walkthrough needs one`);
  lists.forEach((list, i) => {
    const steps = (list.match(/<li\b/g) || []).length;
    if (walks[i] && steps !== walks[i].legs) errors.push(`${walks[i].label} has ${walks[i].legs} legs, but its walkthrough has ${steps} steps`);
    for (const [, heading] of list.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)) {
      const count = plain(heading).split(" ").filter(Boolean).length;
      if (count > 6) warnings.push(`the step heading "${plain(heading)}" has ${count} words; a step heading has at most six`);
    }
  });

  // From here on, test the author's own content: everything except the kit, the drawings and the widgets.
  for (const k of findKit(rest)) rest = rest.replace(k.text, "");
  const noComments = rest.replace(/<!--[\s\S]*?-->/g, "");
  const css = [...noComments.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).concat([...noComments.matchAll(/\bstyle="([^"]*)"/g)].map((m) => m[1])).join("\n");
  const scripts = [...noComments.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const markup = noComments.replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g, (m) => m.slice(0, m.indexOf(">") + 1));

  // 3. One file, no network.
  for (const [, tag, attrs] of markup.matchAll(/<([A-Za-z][\w:-]*)\b([^>]*)>/g)) {
    const name = tag.toLowerCase();
    if (name === "link" || name === "base") { errors.push(`<${name}> loads or points outside the file; a document is one file with no network`); continue; }
    for (const [, attr, value] of attrs.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) {
      const a = attr.toLowerCase();
      if (name === "a" && a === "href") continue; // a link for the reader to follow loads nothing
      if (["src", "srcset", "href", "xlink:href", "poster", "data", "action", "background"].includes(a) && !local(value)) errors.push(`<${name} ${a}="${value.slice(0, 60)}"> loads from outside the file; a document is one file with no network`);
    }
  }
  if (/@import\b/i.test(css)) errors.push("a style uses @import; a document is one file with no network");
  for (const [, target] of css.matchAll(/url\(\s*["']?([^"')]*)/gi)) if (!local(target)) errors.push(`a style loads url(${target.slice(0, 60)}); a document is one file with no network`);
  if (scripts.trim()) {
    warnings.push("the document has a script outside the kit; the page must still be readable with scripts off");
    if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|\bimport\s*\(/.test(scripts)) errors.push("a script outside the kit can use the network; a document is one file with no network");
  }

  // 4. Flat: no gradients, shadows or filters, and no pattern on a ground.
  const flat = [[/gradient\s*\(/i, "a gradient"], [/\b(box|text)-shadow\s*:/i, "a shadow"], [/drop-shadow\s*\(/i, "a shadow"], [/(^|[;{\s])(backdrop-)?filter\s*:/i, "a filter"]];
  for (const [pattern, what] of flat) if (pattern.test(css)) errors.push(`a style uses ${what}; the page is flat`);
  for (const [, tag] of markup.matchAll(/<(linearGradient|radialGradient|filter|pattern)\b/g)) errors.push(`<${tag}> is used; the page is flat, with no gradient, shadow or pattern`);
  if (/text-transform\s*:\s*uppercase/i.test(css)) errors.push("a style sets text in uppercase; a label is written in sentence case");
  if (/background(-color)?\s*:\s*(#fff(fff)?\b|white\b|#000(000)?\b|black\b)/i.test(css)) errors.push("a style sets a pure white or pure black background; use the page tokens");

  // 5. No text below 14px outside diagrams.
  const small = (value, unit) => (unit === "px" ? value < 14 : unit === "%" ? value < 87.5 : value < 0.875);
  for (const [, value, unit] of css.matchAll(/font-size\s*:\s*([\d.]+)(px|rem|em|%)/gi)) if (small(Number(value), unit.toLowerCase())) errors.push(`a style sets font-size: ${value}${unit}; no text is below 14px outside diagrams`);
  for (const [, value, unit] of css.matchAll(/(?:^|[;{\s])font\s*:[^;}]*?\b([\d.]+)(px|rem|em|%)/gi)) if (small(Number(value), unit.toLowerCase())) errors.push(`a style sets font: ${value}${unit}; no text is below 14px outside diagrams`);
  for (const [, value] of markup.matchAll(/\bfont-size="([\d.]+)(?:px)?"/g)) if (Number(value) < 14) errors.push(`an element has font-size="${value}"; no text is below 14px outside diagrams`);
  for (const [, tag] of markup.matchAll(/<(small|sub|sup)\b/gi)) errors.push(`<${tag.toLowerCase()}> makes text smaller than its line; no text is below 14px outside diagrams`);

  // 6. The frame of the document.
  if (!/<html\b[^>]*\blang="[^"]+"/i.test(markup)) errors.push('<html> has no lang attribute');
  if (!/<meta\b[^>]*name="viewport"/i.test(markup)) errors.push('the document has no <meta name="viewport">');
  const h1 = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1.length !== 1) errors.push(`the document has ${h1.length} <h1> headings; it must have one`);
  const title = (markup.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const host = (markup.match(/<[a-z]+\b[^>]*\bclass="[^"]*\bhost\b[^"]*"[^>]*>([\s\S]*?)<\//i) || [])[1];
  if (title == null || !plain(title)) errors.push("the document has no <title>");
  else {
    const at = plain(title).lastIndexOf(" — ");
    if (at < 1) errors.push(`the <title> is "${plain(title)}"; its format is "Document title — Host project"`);
    else {
      const [left, right] = [plain(title).slice(0, at), plain(title).slice(at + 3)];
      // The window title may be a shorter form of the h1: its words appear in the h1, in the same order.
      if (h1.length === 1 && !shorter(left, plain(h1[0][1]))) warnings.push(`the <title> starts with "${left}", but the <h1> is "${plain(h1[0][1])}"; the window title is the h1, or a shorter form of it made of the h1's own words in the same order`);
      if (host != null && right !== plain(host)) warnings.push(`the <title> ends with "${right}", but the host project in the top bar is "${plain(host)}"`);
      if (/docent/i.test(plain(title)) && !(host != null && /docent/i.test(plain(host)))) errors.push('the <title> names Docent; the title holds the document and the host project only');
    }
  }
  return { errors, warnings };
}

function main(files) {
  if (!files.length) {
    console.error("usage: node check.cjs <document.html> [more.html ...]");
    return 2;
  }
  let failed = 0;
  for (const file of files) {
    let result;
    try { result = checkDocument(fs.readFileSync(file, "utf8")); } catch (error) { result = { errors: [error.message], warnings: [] }; }
    result.errors.forEach((e) => console.log(`check ${file}: error: ${e}`));
    result.warnings.forEach((w) => console.log(`check ${file}: warning: ${w}`));
    const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    console.log(`check ${file}: ${count(result.errors.length, "error")}, ${count(result.warnings.length, "warning")}`);
    if (result.errors.length) failed += 1;
  }
  console.log("check reads the source only. It does not open a browser, so it does not test contrast, the phone layout, print or motion.");
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { checkDocument, main };
