// Palettes: named sets of Docent's own tokens, turned toward one hue (assets/palettes.json). A page names one on <html>,
// as data-palette="harbor". stamp writes only that palette into the kit, and render writes its light values as the
// fallback colors of each drawing, so a drawing copied out of the page keeps the palette. tests/contrast.py tests every pair.
const fs = require("node:fs");
const path = require("node:path");

const PALETTES = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "assets", "palettes.json"), "utf8"));
const NAMES = Object.keys(PALETTES);
// Docent's own light values, which every drawing carries as its fallback (LIGHT in svg.cjs and uml.cjs).
const DOCENT = { bg: "#fbfbfe", fig: "#f2f3f9", text: "#1c1f2e", muted: "#575d75", line: "#d3d6e3", primary: "#2f3fd0", dot: "#2f3fd0", "heat-1": "#c6e9ef", "heat-2": "#86c9d5", "heat-3": "#3da6b6", "heat-4": "#00707e", "heat-5": "#004a53", "heat-text": "#1c1f2e", "heat-page": "#fbfbfe" };
// Paper keeps Docent's five gray heat steps for every palette: color for the screen, gray on paper.
const PAPER_HEAT = ["#dee2f0", "#babecb", "#9498a5", "#616571", "#3e424d"];
const SANS = /^system-ui\b/;

/** The palette that a page names on <html>, or null. */
function paletteOf(html) {
  const tag = (html.match(/<html\b[^>]*>/i) || [""])[0];
  const m = tag.match(/\sdata-palette\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i);
  return m ? m[1] ?? m[2] ?? m[3] : null;
}

/** The four blocks of tokens for one palette, as the kit sets its own: light, dark by the system, dark by the switch, and print. */
function paletteCss(name) {
  const p = PALETTES[name];
  if (!p) throw new Error(`"${name}" is not a palette; the palettes are ${NAMES.map((n) => `"${n}"`).join(", ")}`);
  const sel = `:root[data-palette="${name}"]`;
  const heat = (steps) => steps.map((s, i) => `--heat-${i + 1}: ${s};`).join(" ");
  const on = (t, page = t.bg) => `--heat-text: ${t.text}; --heat-page: ${page};`; // the text on a heat step: the palette's own text and page colors
  const grays = (t) => `--bg: ${t.bg}; --panel: ${t.panel}; --fig: ${t.fig}; --text: ${t.text}; --muted: ${t.muted}; --line: ${t.line};`;
  const steps = (t) => [1, 2, 3, 4, 5].map((i) => t[`heat-${i}`]);
  const light = `${grays(p.light)} --primary: var(--host-accent, ${p.light.primary}); --ink: var(--host-ink, ${p.light.ink}); --dot: var(--host-accent, ${p.light.primary});`;
  const dark = `color-scheme: dark; ${grays(p.dark)} --primary: var(--host-accent-dark, ${p.dark.primary}); --ink: ${p.dark.text}; --dot: var(--host-dot-dark, var(--host-accent-dark, ${p.dark.primary})); ${heat(steps(p.dark))} ${on(p.dark)} --tile-light: ${p.light.bg}; --tile-dark: transparent;`; // the light block applies in dark too (same weight, later), so dark sets every token it changes
  // Headings in a sans-serif take weight 600, so the sans-serif keeps two weights, 400 and 600.
  const type = `--serif: var(--host-serif, ${p.serif});${SANS.test(p.serif) ? " --heading-weight: 600;" : ""}`;
  return [
    `/* Palette: ${p.name}. ${p.mood}. Docent's own tokens turned to one hue; every pair is tested in tests/contrast.py. */`,
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

/** A drawing with the palette's light values as its fallback colors in place of Docent's. */
function paint(svg, name) {
  const p = name && PALETTES[name];
  if (!p) return svg;
  const light = { ...p.light, dot: p.light.primary, "heat-text": p.light.text, "heat-page": p.light.bg };
  return svg.replace(/var\(--([\w-]+),(#[0-9a-f]{6})\)/g, (all, token, hex) => (DOCENT[token] === hex && light[token] ? `var(--${token},${light[token]})` : all));
}

/** The pages a host color is tested on: the page and the well of each theme. */
function grounds(name) {
  const p = name && PALETTES[name];
  return p ? { light: [p.light.bg, p.light.panel], dark: [p.dark.bg, p.dark.panel] } : { light: ["#fbfbfe", "#f2f3f9"], dark: ["#12141f", "#0b0d15"] };
}

module.exports = { PALETTES, NAMES, DOCENT, PAPER_HEAT, paletteOf, paletteCss, paint, grounds };
