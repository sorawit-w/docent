#!/usr/bin/env node
// check: tests a Docent document against the rules that can be tested from its source.
// Usage: node check.cjs <document.html> [more.html ...]
// It does not open a browser. So it cannot test contrast, the phone layout, print or motion as a reader sees them.
const fs = require("node:fs");
const { VERSION, cssBlock, jsBlock, findKit } = require("./lib/kit.cjs");
const { renderDiagram } = require("./lib/diagram.cjs");
const { renderWidget, PLACE, esc } = require("./lib/widget.cjs");
const { findBlocks, block } = require("./lib/blocks.cjs");
const { PROFILES, suggestProfile } = require("./lib/profile.cjs");
const { checkLogos } = require("./lib/logo.cjs");
const { lab, darkAccent, nearestStatus } = require("./lib/color.cjs");
const { NAMES: PALETTES, paletteOf, paint, grounds } = require("./lib/palettes.cjs");
const { findPersonal, findTel } = require("./lib/personal.cjs");

const MOST_WIDGETS = 4; // more widgets than this in one document gives a warning
const CARDS = [3, 8]; // a card grid holds 3 to 8 cards
const TAGLINE = 90; // characters: the tagline is one line
// Each host color, the theme it shows in, and the contrast it needs: text needs 4.5:1, the dot is a mark and needs 3:1 (WCAG 1.4.11).
const HOST = { "host-accent": ["light", 4.5], "host-accent-dark": ["dark", 4.5], "host-ink": ["light", 4.5], "host-dot-dark": ["dark", 3] };
const NEAR = 25; // CIE76: an accent closer than this to a status color reads as that status
const GRAY = 10; // CIELAB chroma: an accent with less looks like the body text

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
const hasClass = (attrs, name) => new RegExp(`\\bclass="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"`).test(attrs);
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

/** Returns { errors, warnings }: two lists of plain sentences. */
function checkDocument(html) {
  const errors = [], warnings = [];
  // A palette turns Docent's own tokens to one hue. A host color is tested on the palette's pages, and each drawing carries its light values.
  const named = paletteOf(html), palette = PALETTES.includes(named) ? named : null;
  if (named != null && !palette) errors.push(`<html> has data-palette="${named}"; the palettes are ${PALETTES.map((n) => `"${n}"`).join(", ")} (see "Palettes" in DESIGN.md)`);
  const carried = (text) => [null, ...PALETTES].findIndex((p) => text === cssBlock(p)); // 0: no palette, n: the nth palette, -1: neither
  const GROUNDS = grounds(palette); // the pages that the kit draws on, light and dark: a host color must read on both the page and the well

  // 1. The kit: the same styles and script in every document.
  for (const [kind, current] of [["styles", cssBlock(palette)], ["script", jsBlock()]]) {
    const found = findKit(html).filter((k) => k.kind === kind);
    if (!found.length) errors.push(`the document has no kit ${kind}; run stamp`);
    else if (found.length > 1) errors.push(`the document has ${found.length} kit ${kind} blocks; it must have one`);
    else if (found[0].version !== VERSION) errors.push(`the kit ${kind} are version ${found[0].version}; this skill has ${VERSION}; run stamp`);
    else if (found[0].text !== current && kind === "styles" && carried(found[0].text) >= 0) errors.push(`the kit styles carry ${carried(found[0].text) ? `the palette "${PALETTES[carried(found[0].text) - 1]}"` : "no palette"}, but <html> names ${palette ? `"${palette}"` : "none"}; run stamp`);
    else if (found[0].text !== current) errors.push(`the kit ${kind} were changed by hand or by a code formatter; run stamp, keep your own styles outside the markers, and keep the document out of the formatter (see SKILL.md)`);
  }

  // 2. Diagrams: each drawing must be the one that render makes from its data.
  const diagrams = findBlocks(html, "diagram"), ids = new Set(), shapes = new Map(), walks = [], refs = [];
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
      if (found.text !== block("diagram", found.json, paint(drawn.svg, palette))) errors.push(`${label}: the drawing does not match its data; run render`);
      // A document should not draw the same thing twice.
      const shape = drawn.model.legs ? JSON.stringify([drawn.model.lanes.map((l) => l.name), drawn.model.parts.map((p) => [p.lane, p.name, p.note]), drawn.model.legs.map((l) => [l.from, l.to, l.verb])]) : JSON.stringify({ ...data, id: null, label: null }); // a UML graph kind: its data without the id and label
      if (shapes.has(shape)) warnings.push(`${label} shows the same ${drawn.model.legs ? "lanes, parts and legs" : "data"} as diagram "${shapes.get(shape)}"; a document should not draw the same thing twice`);
      else shapes.set(shape, drawn.model.id);
      if (drawn.model.place === "walk") walks.push({ label, legs: drawn.model.legs.length });
      for (const ref of drawn.model.refs || []) refs.push({ label, ref });
    } catch (error) {
      errors.push(`${name}${data && data.id ? ` ("${data.id}")` : ""}: ${error.message}`);
    }
  });
  // An interaction overview links each ref frame to a sequence diagram in the same document.
  for (const { label, ref } of refs) if (!ids.has(ref)) errors.push(`${label}: a ref frame links to the diagram "${ref}", which is not in this document`);
  // A well holds one drawing, or two for two separate chains. Beside walkthrough steps it holds one, because step n lights leg n.
  for (const { attrs, inner } of wells(html)) {
    const count = (inner.match(/<!-- docent:diagram\b/g) || []).length, name = (attrs.match(/aria-label="([^"]*)"/) || [])[1] || "a figure";
    if (count > 2) errors.push(`${name} holds ${count} diagrams; a figure holds one, or two for two separate chains`);
    if (count > 1 && /"place"\s*:\s*"walk"/.test(inner)) errors.push(`${name} holds ${count} diagrams beside walkthrough steps; there it holds one`);
  }
  let rest = html;
  for (const found of [...diagrams].reverse()) rest = rest.slice(0, found.start) + rest.slice(found.end);
  if (/<svg\b[^>]*\bclass="[^"]*\bdg\b/.test(rest)) errors.push("a diagram sits outside a diagram block; put its data in a block and run render");
  // Every drawing in a figure well comes from a diagram block: a hand-drawn SVG there cannot be drawn again or checked.
  for (const { attrs, inner } of wells(rest)) {
    if (/<svg\b/i.test(inner.replace(/<!--[\s\S]*?-->/g, ""))) errors.push(`${(attrs.match(/aria-label="([^"]*)"/) || [])[1] || "a figure"} holds a drawing that no diagram block made; write its data in a block and run render`);
  }

  // 2b. Widgets: each widget must be the one that render makes from its data.
  const widgets = findBlocks(rest, "widget"), widgetIds = new Set(), kinds = new Set(), defaults = {};
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
      kinds.add(built.key == null ? built.id : `${built.kind} ${built.key}`); // choosers or value pickers with the same options change together and count as one
      for (const [key, value] of Object.entries(built.defaults || {})) {
        if (Object.hasOwn(defaults, key)) errors.push(`${label}: another value picker has the key "${key}"; each key belongs to one value picker`);
        defaults[key] = value;
      }
    } catch (error) {
      errors.push(`${name}${data && data.id ? ` ("${data.id}")` : ""}: ${error.message}`);
    }
  });
  for (const found of [...widgets].reverse()) rest = rest.slice(0, found.start) + rest.slice(found.end);
  if (/\bclass="(?:[^"]*\s)?(choose|checks|decide|values)(?:\s[^"]*)?"/.test(rest)) errors.push("a widget sits outside a widget block; put its data in a block and run render");
  if (kinds.size > MOST_WIDGETS) warnings.push(`the document has ${kinds.size} widgets; a widget is for a reader who must choose, track or decide, and more than ${MOST_WIDGETS} in one document is a sign that some are not needed`);

  // Places that show a value: each names a key of a value picker and holds the value of its first option.
  const used = new Set();
  for (const [, , key, , inner] of rest.replace(/<!--[\s\S]*?-->/g, "").matchAll(PLACE)) {
    if (!Object.hasOwn(defaults, key)) { errors.push(`a place <var data-v="${key}"> names a value that no value picker has`); continue; }
    used.add(key);
    if (inner !== esc(defaults[key])) errors.push(`a place <var data-v="${key}"> holds "${plain(inner)}", not the value of the first option; run render`);
  }
  for (const key of Object.keys(defaults)) if (!used.has(key)) warnings.push(`the value "${key}" of a value picker is shown in no place; mark each place with <var data-v="${key}"></var>, or take the value out`);

  // A card grid holds a few short items.
  for (const [, inner] of rest.matchAll(/<ul\b[^>]*\bclass="[^"]*\bcards\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)) {
    const n = (inner.match(/<li\b/g) || []).length;
    if (n < CARDS[0] || n > CARDS[1]) warnings.push(`a card grid has ${n} cards; it holds ${CARDS[0]} to ${CARDS[1]}. Use a list or a table for ${n < CARDS[0] ? "fewer" : "more"}`);
  }

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
  // Host colors and fonts go through the --host-* tokens. The kit sets its own tokens in four places (light, dark by the system, dark by the switch, print), so an author's value for one of them is lost in some of them.
  for (const [, name] of css.matchAll(/(?:^|[;{\s])--(bg|panel|fig|text|muted|line|primary|ink|dot|ok|warn|err|heat-[1-5]|heat-text|heat-page|serif|sans|mono)\s*:/g)) warnings.push(`a style sets --${name}; the kit sets it in four places, so your value is lost in dark mode or in print. Use the --host-* tokens, or a palette for the page and the grays (see SKILL.md)`);
  const hosts = {};
  for (const [, name, value] of css.matchAll(/--(host-accent-dark|host-accent|host-ink|host-dot-dark)\s*:\s*([^;}]+)/g)) {
    const color = value.trim();
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) { warnings.push(`--${name} is "${color}"; check tests the contrast of a hex color only, such as #2f3fd0`); hosts[name] = null; continue; }
    hosts[name] = color;
    const [theme, need] = HOST[name];
    const low = GROUNDS[theme].map((ground) => [ground, contrast(color, ground)]).filter(([, ratio]) => ratio < need);
    if (low.length) errors.push(`--${name} ${color} has a contrast of ${low.map(([g, r]) => `${r.toFixed(2)}:1 on ${g}`).join(" and ")}; ${need === 3 ? "the dot is a mark and needs 3:1" : "text needs 4.5:1"}`);
  }
  // An accent can pass contrast and still mislead: it looks like a status, or like the body text, or dark mode falls back to Docent's own accent.
  for (const [name, theme] of [["host-accent", "light"], ["host-accent-dark", "dark"]]) {
    const color = hosts[name];
    if (!color) continue;
    const near = nearestStatus(color, theme);
    if (near.distance < NEAR) warnings.push(`--${name} ${color} is close to the ${theme === "dark" ? "dark " : ""}status color "${near.name}" (a distance of ${near.distance.toFixed(1)}); its links and dots would read as ${{ ok: "success", warn: "a warning", err: "an error" }[near.name]}. Choose an accent further from green, amber and red`);
    if (lab(color).C < GRAY) warnings.push(`--${name} ${color} has almost no color (chroma ${lab(color).C.toFixed(1)}); it looks like the body text, so a link is told apart by its underline only`);
  }
  if (hosts["host-accent"] && !("host-accent-dark" in hosts)) warnings.push(`--host-accent is set and --host-accent-dark is not, so dark mode shows Docent's ultramarine links on the host's page. The same hue at 7:1 on the dark page is ${darkAccent(hosts["host-accent"])}: --host-accent-dark: ${darkAccent(hosts["host-accent"])};`);
  if (/@import\b/i.test(css)) errors.push("a style uses @import; a document is one file with no network");
  for (const [, target] of css.matchAll(/url\(\s*["']?([^"')]*)/gi)) if (!local(target)) errors.push(`a style loads url(${target.slice(0, 60)}); a document is one file with no network`);
  if (scripts.trim()) {
    warnings.push("the document has a script outside the kit; the page must still be readable with scripts off");
    if (/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b|\bimport\s*\(/.test(scripts)) errors.push("a script outside the kit can use the network; a document is one file with no network");
  }

  // 3b. The host's logo in the top bar: plain shapes only, inside the file, in its slot, and readable in both themes.
  const logo = checkLogos(markup, { light: GROUNDS.light[0], dark: GROUNDS.dark[0] });
  errors.push(...logo.errors);
  warnings.push(...logo.warnings);
  let unbranded = markup; // the page without its logo: a logo is the host's own mark, so it may hold a gradient
  for (const l of [...logo.logos].reverse()) unbranded = unbranded.slice(0, l.start) + unbranded.slice(l.end);

  // 4. Flat: no gradients, shadows or filters, and no pattern on a ground.
  const flat = [[/gradient\s*\(/i, "a gradient"], [/\b(box|text)-shadow\s*:/i, "a shadow"], [/drop-shadow\s*\(/i, "a shadow"], [/(^|[;{\s])(backdrop-)?filter\s*:/i, "a filter"]];
  for (const [pattern, what] of flat) if (pattern.test(css)) errors.push(`a style uses ${what}; the page is flat`);
  for (const [, tag] of unbranded.matchAll(/<(linearGradient|radialGradient|filter|pattern)\b/g)) errors.push(`<${tag}> is used; the page is flat, with no gradient, shadow or pattern${/Gradient/.test(tag) ? " (only a host's logo in the top bar may hold a gradient)" : ""}`);
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
  const fixed = (markup.match(/<html\b[^>]*\bdata-theme="([^"]*)"/i) || [])[1];
  if (fixed != null && !["light", "dark"].includes(fixed)) errors.push(`<html> has data-theme="${fixed}"; a fixed theme is "light" or "dark"`);
  if (!/<meta\b[^>]*name="viewport"/i.test(markup)) errors.push('the document has no <meta name="viewport">');
  const h1 = [...markup.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1.length !== 1) errors.push(`the document has ${h1.length} <h1> headings; it must have one`);
  const title = (markup.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  const host = logo.name; // the host's name in the top bar, or the name that a wordmark carries
  if (title == null || !plain(title)) errors.push("the document has no <title>");
  else {
    const at = plain(title).lastIndexOf(" — ");
    if (at < 1) errors.push(`the <title> is "${plain(title)}"; its format is "Document title — Host project"`);
    else {
      const [left, right] = [plain(title).slice(0, at), plain(title).slice(at + 3)];
      // The window title may be a shorter form of the h1: its words appear in the h1, in the same order.
      if (h1.length === 1 && !shorter(left, plain(h1[0][1]))) warnings.push(`the <title> starts with "${left}", but the <h1> is "${plain(h1[0][1])}"; the window title is the h1, or a shorter form of it made of the h1's own words in the same order`);
      if (host != null && right !== host) warnings.push(`the <title> ends with "${right}", but the host project in the top bar is "${host}"`);
      if (/docent/i.test(plain(title)) && !(host != null && /docent/i.test(host))) errors.push('the <title> names Docent; the title holds the document and the host project only');
    }
  }

  // 6b. The footer: the host's tagline, in its own words, and the credit. Docent is MIT-licensed, so a missing credit is a warning, to make sure it is a choice.
  const footer = (markup.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i) || [])[1];
  if (!(host != null && /docent/i.test(host)) && !(footer != null && /Made with Docent/.test(plain(footer)))) warnings.push('the footer has no "Made with Docent"; keep the credit unless the host chose to remove it (see "Logo, tagline and credit" in SKILL.md)');
  for (const [, inner] of (footer || "").matchAll(/<[a-z]+\b[^>]*\bclass="(?:[^"]*\s)?tagline(?:\s[^"]*)?"[^>]*>([\s\S]*?)<\/[a-z]+>/gi)) {
    if (/<[a-z]/i.test(inner)) warnings.push("the tagline holds markup or a link; it is one line of plain text");
    if (plain(inner).length > TAGLINE) warnings.push(`the tagline has ${plain(inner).length} characters; it is one line of at most ${TAGLINE}`);
  }

  // 7. Facts about one item go in a margin note, not in one line of text joined by | or ·. Code may hold a | of its own.
  for (const [, inner] of markup.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
    const line = plain(inner.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, ""));
    if (line.split(/\s[|·]\s/).length >= 3) warnings.push(`the paragraph "${line.length > 60 ? `${line.slice(0, 60)}…` : line}" joins facts with "|" or "·"; list them in a margin note beside the item (see "Facts about one item go in the margin" in DESIGN.md)`);
  }

  // 8. The profile of the page. The agent chooses it; check names a suggestion only when one rule wins clearly.
  const profile = (markup.match(/<html\b[^>]*\bdata-profile="([^"]*)"/i) || [])[1];
  const text = (markup.match(/<html\b[^>]*\bdata-text="([^"]*)"/i) || [])[1];
  if (profile != null && !PROFILES.includes(profile)) errors.push(`<html> has data-profile="${profile}"; a profile is ${PROFILES.map((p) => `"${p}"`).join(", ")}`);
  if (text != null && text !== "large") errors.push(`<html> has data-text="${text}"; the only value is "large", for a page for the public`);
  const suggested = suggestProfile(markup);
  const looks = suggested.sure && suggested.profile !== "standard" ? `; the page looks like "${suggested.profile}": ${suggested.reasons[0]}` : "";
  if (profile == null) warnings.push(`<html> has no data-profile, so the page uses "standard"${looks}; write the profile on <html> (see "Choose a profile" in SKILL.md)`);
  else if (PROFILES.includes(profile) && looks && suggested.profile !== profile) warnings.push(`<html> has data-profile="${profile}"${looks}; keep the profile only if the readers need it (see "Choose a profile" in SKILL.md)`);

  // 9. A skip link: the first thing a keyboard reaches, so the reader can jump past the top bar to <main>.
  const mainId = ((markup.match(/<main\b[^>]*>/i) || [""])[0].match(/\bid="([^"]+)"/) || [])[1];
  const skip = [...markup.matchAll(/<a\b([^>]*)>/gi)].find(([, attrs]) => hasClass(attrs, "skip"));
  const skipHint = '<a class="skip" href="#content">Skip to the content</a> first in <body>, and id="content" on <main> (see the starting page)';
  if (!skip) warnings.push(`the page has no skip link; a keyboard reader must tab through the whole top bar first. Put ${skipHint}`);
  else {
    const target = (skip[1].match(/\bhref="#([^"]*)"/) || [])[1];
    if (target == null || target !== mainId) warnings.push(`the skip link points at ${target == null ? "no place on the page" : `"#${target}"`}, but <main> has ${mainId ? `id="${mainId}"` : "no id"}; it jumps to <main>`);
    const before = markup.slice(markup.search(/<body\b/i), skip.index);
    if (/<(?:a\b[^>]*\bhref=|button\b|input\b|select\b|textarea\b|summary\b)|\btabindex="(?!-)/i.test(before)) warnings.push("the skip link is not the first thing a keyboard reaches; put it first in <body>");
  }

  // 10. Numbers line up on the right: a column of an author's table that holds numbers only takes the class "num".
  for (const table of markup.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    const head = (table[1].match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i) || [])[1] || "";
    const body = table[1].replace(/<thead\b[^>]*>[\s\S]*?<\/thead>/i, "");
    if (/\b(colspan|rowspan)=/i.test(body)) continue; // the columns of a merged cell are not clear from the source
    const cells = (rows) => [...rows.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(([, row]) => [...row.matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map(([, tag, attrs, inner]) => ({ tag: tag.toLowerCase(), attrs, text: plain(inner) })));
    const rows = cells(body), names = (cells(head)[0] || []).map((c) => c.text);
    const label = (markup.slice(0, table.index).match(/aria-label="([^"]*)"[^>]*>\s*$/) || [])[1];
    for (let c = 0; c < Math.max(0, ...rows.map((r) => r.length)); c += 1) {
      const column = rows.map((r) => r[c]).filter(Boolean);
      if (column.some((cell) => cell.tag === "th")) continue; // a row heading names its row, like an id, even when it is a number
      const numbers = column.filter((cell) => NUMBER.test(cell.text));
      if (!numbers.length || !column.every((cell) => NUMBER.test(cell.text) || BLANK.test(cell.text)) || numbers.every((cell) => hasClass(cell.attrs, "num"))) continue;
      warnings.push(`${label ? `the table "${label}"` : "a table"}: the column ${names[c] ? `"${names[c]}"` : c + 1} holds numbers only; add class="num" to its th and td cells, so the numbers line up on the right`);
    }
  }

  // 11. Personal data: email addresses and phone numbers, in the page text and in the data of each diagram and widget. A warning only:
  // the author decides. Reserved example names (example.com, .test, 555-0100 to 555-0199) pass. Names and postal addresses are not found.
  const pageText = [textOf(markup), ...[...markup.matchAll(/\b(?:alt|title|aria-label)="([^"]*)"/gi)].map((m) => m[1])].join(" \n ");
  const places = [["the page text", [...findPersonal(pageText), ...[...markup.matchAll(/\bhref="(mailto:[^"]*|tel:[^"]*)"/gi)].flatMap(([, href]) => (/^tel:/i.test(href) ? findTel(href) : findPersonal(decodeURIComponent(href.slice(7)))))]]];
  for (const [kind, list] of [["diagram", diagrams], ["widget", widgets]]) list.forEach((found, n) => {
    let data;
    try { data = JSON.parse(found.json); } catch { return; } // an error above already names it
    places.push([`the data of ${kind} ${n + 1}${data && data.id ? ` ("${data.id}")` : ""}`, findPersonal(strings(data).join(" \n "))]);
  });
  for (const [where, found] of places) {
    const unique = found.filter((f, i) => found.findIndex((g) => g.masked === f.masked) === i);
    if (!unique.length) continue;
    const named = unique.slice(0, 3).map((f) => `${f.kind === "email" ? "an email address" : "a phone number"} ${f.masked}`).join(", ");
    warnings.push(`${where} holds what looks like personal data: ${named}${unique.length > 3 ? `, and ${unique.length - 3} more` : ""}. Remove it or mask it, or use a reserved example such as name@example.com or 555-0100`);
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
