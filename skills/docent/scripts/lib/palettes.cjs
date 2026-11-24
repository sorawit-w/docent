// Palettes: named sets of Docent's own tokens, turned toward one hue (assets/palettes.json). A page names one on <html>,
// as data-palette="harbor". stamp writes only that palette into the kit, and render writes its light values as the
// fallback colors of each drawing, so a drawing copied out of the page keeps the palette. tests/contrast.py tests every pair.
const fs = require("node:fs");
const path = require("node:path");
const { distance } = require("./color.cjs");
const { customPalette } = require("./hue.cjs");

const PALETTES = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "assets", "palettes.json"), "utf8"));
const NAMES = Object.keys(PALETTES);
// Docent's own light values, which every drawing carries as its fallback (LIGHT in svg.cjs and uml.cjs).
const DOCENT = { bg: "#fbfbfe", fig: "#f2f3f9", text: "#1c1f2e", muted: "#575d75", line: "#d3d6e3", primary: "#2f3fd0", dot: "#2f3fd0", "heat-1": "#c6e9ef", "heat-2": "#86c9d5", "heat-3": "#3da6b6", "heat-4": "#00707e", "heat-5": "#004a53", "heat-text": "#1c1f2e", "heat-page": "#fbfbfe" };
// Paper keeps Docent's five gray heat steps for every palette: color for the screen, gray on paper.
const PAPER_HEAT = ["#dee2f0", "#babecb", "#9498a5", "#616571", "#3e424d"];
const SANS = /^system-ui\b/;

/** The value of an attribute on <html>, or null. */
function attrOf(html, name) {
  const tag = (html.match(/<html\b[^>]*>/i) || [""])[0];
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return m ? m[1] ?? m[2] ?? m[3] : null;
}
/** The palette that a page names on <html>, or null. */
const paletteOf = (html) => attrOf(html, "data-palette");
/** A palette by its name, or a palette worked out from a hue, as it is. */
const get = (p) => (typeof p === "string" ? PALETTES[p] : p);
/** The name a palette has on <html>: its own name, or "custom" for one worked out from a hue. */
const keyOf = (p) => (typeof p === "string" ? p : p && p.hue ? "custom" : null);

/** The palette of a page: { name, palette, error }. palette is a palette's name, or for data-palette="custom", the palette worked out
    from data-palette-hue (hue.cjs); error says why the page's palette cannot be used. */
function paletteFor(html) {
  const name = paletteOf(html), hue = attrOf(html, "data-palette-hue");
  if (name == null) return { name, palette: null, error: hue != null ? `<html> has data-palette-hue="${hue}" and no data-palette="custom"; write both, or neither` : null };
  if (NAMES.includes(name)) return { name, palette: name, error: hue != null ? `<html> has data-palette-hue="${hue}", but data-palette="${name}" is a named palette; take out data-palette-hue` : null };
  if (name !== "custom") return { name, palette: null, error: `<html> has data-palette="${name}"; the palettes are ${NAMES.map((n) => `"${n}"`).join(", ")}, and "custom" with data-palette-hue (see "Palettes" in DESIGN.md)` };
  if (hue == null || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hue)) return { name, palette: null, error: `<html> has data-palette="custom" and ${hue == null ? "no data-palette-hue" : `data-palette-hue="${hue}"`}; write the hue the palette is worked out from, as a hex color, such as data-palette-hue="#eef2ff"` };
  const tested = customPalette(hue);
  if (tested.failing.length) return { name, palette: null, error: refusal(hue, tested) };
  return { name, palette: tested.palette, error: null };
}
/** Why a palette from a hue is refused, in plain words: the first failing pair, and the closest color that passes. */
const refusal = (hue, tested) => `a palette from ${hue} is refused: ${tested.failing[0].words}${tested.failing.length > 1 ? `, and ${tested.failing.length - 1} more pair${tested.failing.length > 2 ? "s" : ""}` : ""}. ${tested.closest ? `The closest color that passes is ${tested.closest}` : "No nearby color passes; use a named palette"}`;

/** The four blocks of tokens for one palette, as the kit sets its own: light, dark by the system, dark by the switch, and print. */
function paletteCss(name) {
  const p = get(name);
  if (!p) throw new Error(`"${name}" is not a palette; the palettes are ${NAMES.map((n) => `"${n}"`).join(", ")}`);
  const sel = `:root[data-palette="${keyOf(name)}"]`;
  const heat = (steps) => steps.map((s, i) => `--heat-${i + 1}: ${s};`).join(" ");
  const on = (t, page = t.bg) => `--heat-text: ${t.text}; --heat-page: ${page};`; // the text on a heat step: the palette's own text and page colors
  const grays = (t) => `--bg: ${t.bg}; --panel: ${t.panel}; --fig: ${t.fig}; --text: ${t.text}; --muted: ${t.muted}; --line: ${t.line};`;
  const steps = (t) => [1, 2, 3, 4, 5].map((i) => t[`heat-${i}`]);
  const light = `${grays(p.light)} --primary: var(--host-accent, ${p.light.primary}); --ink: var(--host-ink, ${p.light.ink}); --dot: var(--host-accent, ${p.light.primary});`;
  const dark = `color-scheme: dark; ${grays(p.dark)} --primary: var(--host-accent-dark, ${p.dark.primary}); --ink: ${p.dark.text}; --dot: var(--host-dot-dark, var(--host-accent-dark, ${p.dark.primary})); ${heat(steps(p.dark))} ${on(p.dark)} --tile-light: ${p.light.bg}; --tile-dark: transparent;`; // the light block applies in dark too (same weight, later), so dark sets every token it changes
  // Headings in a sans-serif take weight 600, so the sans-serif keeps two weights, 400 and 600.
  const type = `--serif: var(--host-serif, ${p.serif});${SANS.test(p.serif) ? " --heading-weight: 600;" : ""}`;
  return [
    `/* Palette: ${p.name}. ${p.mood}. Docent's own tokens turned to one hue; every pair is tested ${p.hue ? "by stamp and check (scripts/lib/pairs.cjs)" : "in tests/contrast.py"}. */`,
    `${sel} { ${light} ${heat(steps(p.light))} ${on(p.light)} --tile-dark: ${p.dark.bg}; ${type} }`,
    `@media (prefers-color-scheme: dark) { ${sel}:not([data-theme="light"]) { ${dark} } }`,
    `${sel}[data-theme="dark"] { ${dark} }`,
    // More contrast: the line takes the palette's muted color, and muted text its text color. Screen only, and not with forced colors.
    `@media screen and (prefers-contrast: more) and (forced-colors: none) { html${sel}:not([data-never]) { --line: ${p.light.muted}; --muted: ${p.light.text}; } html${sel}:not([data-never])[data-theme="dark"] { --line: ${p.dark.muted}; --muted: ${p.dark.text}; } }`,
    `@media screen and (prefers-contrast: more) and (forced-colors: none) and (prefers-color-scheme: dark) { html${sel}:not([data-never]):not([data-theme="light"]) { --line: ${p.dark.muted}; --muted: ${p.dark.text}; } }`,
    // Forced colors: the reader's system colors win over the palette, as they win over Docent's own colors.
    `@media (forced-colors: active) { html${sel}:not([data-never]) { --bg: Canvas; --fig: Canvas; --text: CanvasText; --muted: CanvasText; --line: CanvasText; --primary: Highlight; --dot: Highlight; } }`,
    `@media print { html${sel}:not([data-never]) { color-scheme: light; --bg: #ffffff; --panel: ${p.light.panel}; --fig: ${p.light.fig}; --text: ${p.light.text}; --muted: ${p.light.muted}; --line: ${p.light.line}; --primary: var(--host-accent, ${p.light.primary}); --ink: var(--host-ink, ${p.light.ink}); --dot: var(--host-accent, ${p.light.primary}); ${heat(PAPER_HEAT)} ${on(p.light, "#ffffff")} --tile-dark: ${p.dark.bg}; } }`,
  ].join("\n");
}

/** Present mode of a deck, with a palette: always light, with the "more contrast" tokens (the line takes the muted color, and muted
    text the text color), so every text pair reaches 7:1 on the page. A palette whose accent has less than 7:1 on its light page gives
    a darker accent of the same hue for present mode ("present" in palettes.json). Screen only, and not with forced colors. */
function presentCss(name) {
  const p = get(name);
  if (!p) throw new Error(`"${name}" is not a palette; the palettes are ${NAMES.map((n) => `"${n}"`).join(", ")}`);
  const t = p.light, accent = (p.present && p.present.primary) || t.primary;
  const heat = [1, 2, 3, 4, 5].map((i) => `--heat-${i}: ${t[`heat-${i}`]};`).join(" ");
  return `@media screen and (forced-colors: none) { html:root[data-palette="${keyOf(name)}"].presenting:not([data-never]) { color-scheme: light; --bg: ${t.bg}; --panel: ${t.panel}; --fig: ${t.fig}; --text: ${t.text}; --muted: ${t.text}; --line: ${t.muted}; --primary: var(--host-accent, ${accent}); --ink: var(--host-ink, ${t.ink}); --dot: var(--host-accent, ${accent}); ${heat} --heat-text: ${t.text}; --heat-page: ${t.bg}; } }`;
}

/** A drawing with the palette's light values as its fallback colors in place of Docent's. */
function paint(svg, name) {
  const p = name && get(name);
  if (!p) return svg;
  const light = { ...p.light, dot: p.light.primary, "heat-text": p.light.text, "heat-page": p.light.bg };
  return svg.replace(/var\(--([\w-]+),(#[0-9a-f]{6})\)/g, (all, token, hex) => (DOCENT[token] === hex && light[token] ? `var(--${token},${light[token]})` : all));
}

/** The pages a host color is tested on: the page and the well of each theme. */
function grounds(name) {
  const p = name && get(name);
  return p ? { light: [p.light.bg, p.light.panel], dark: [p.dark.bg, p.dark.panel] } : { light: ["#fbfbfe", "#f2f3f9"], dark: ["#12141f", "#0b0d15"] };
}

/** The tested light pages, Docent's own first, from the closest to a host's page color: [{ name, page, distance }], by CIE76 distance.
    The distance, not the hue alone, because a near-gray has almost no hue to compare. */
function closest(hex) {
  const pages = [["docent", DOCENT.bg], ...NAMES.map((n) => [n, PALETTES[n].light.bg])];
  return pages.map(([name, page]) => ({ name, page, distance: distance(hex, page) })).sort((a, b) => a.distance - b.distance);
}

module.exports = { PALETTES, NAMES, DOCENT, PAPER_HEAT, paletteOf, paletteFor, keyOf, refusal, paletteCss, presentCss, paint, grounds, closest };
