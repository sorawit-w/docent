// Palettes: a page names one on <html>; stamp writes only that one, render paints each drawing with its light values, and check tests the rest.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PALETTES, NAMES, DOCENT, PAPER_HEAT, paletteOf, paletteCss, paint } = require("../skills/docent/scripts/lib/palettes.cjs");
const { stampHtml, cssBlock } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");

const assets = path.join(__dirname, "..", "skills", "docent", "assets");
const template = fs.readFileSync(path.join(assets, "template.html"), "utf8");
const named = (name) => template.replace('<html lang="en" data-profile="standard">', `<html lang="en" data-profile="standard" data-palette="${name}">`);
const build = (html) => stampHtml(renderDocument(html).html).html;

test("three palettes, each with Docent's tokens in light and dark", () => {
  assert.deepEqual(NAMES, ["harbor", "plum", "sepia"]);
  for (const name of NAMES) {
    const p = PALETTES[name];
    assert.deepEqual(Object.keys(p.light).sort(), ["bg", "fig", "heat-1", "heat-2", "heat-3", "heat-4", "heat-5", "ink", "line", "muted", "panel", "primary", "text"]);
    assert.deepEqual(Object.keys(p.dark).sort(), ["bg", "fig", "heat-1", "heat-2", "heat-3", "heat-4", "heat-5", "line", "muted", "panel", "primary", "text"]);
  }
});

test("the fallback colors and the paper heat steps match the kit", () => {
  const svg = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "scripts", "lib", "svg.cjs"), "utf8");
  for (const [token, hex] of Object.entries(DOCENT)) assert.match(svg, new RegExp(`"?${token}"?: "${hex}"`), `${token} is ${hex} in svg.cjs`);
  const css = fs.readFileSync(path.join(assets, "kit.css"), "utf8");
  assert.match(css, new RegExp(PAPER_HEAT.map((h, i) => `--heat-${i + 1}: ${h};`).join(" ")), "paper keeps Docent's gray steps, for every palette");
});

test("stamp writes only the palette that the page names, in the four places that set tokens", () => {
  const harbor = build(named("harbor"));
  assert.ok(harbor.includes(paletteCss("harbor")));
  assert.ok(!harbor.includes("Palette: Plum") && !harbor.includes("Palette: Sepia"), "a page carries one palette, not three");
  const css = paletteCss("plum");
  assert.match(css, /^:root\[data-palette="plum"\] \{/m);
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{ :root\[data-palette="plum"\]:not\(\[data-theme="light"\]\)/);
  assert.match(css, /^:root\[data-palette="plum"\]\[data-theme="dark"\] \{/m);
  assert.match(css, /@media print \{ html:root\[data-palette="plum"\]:not\(\[data-never\]\) \{ color-scheme: light; --bg: #ffffff;/);
  assert.match(css, /--primary: var\(--host-accent, #86307f\)/, "a host accent still wins over the palette's");
  assert.match(css, /--dot: var\(--host-dot-dark, var\(--host-accent-dark, #e49ad9\)\)/, "the dark dot is the palette's dark accent");
  assert.match(paletteCss("harbor"), /--serif: var\(--host-serif, system-ui,[^;]*\); --heading-weight: 600;/, "sans-serif headings take weight 600");
  assert.ok(!/--heading-weight/.test(paletteCss("sepia")));
  assert.match(css, /--heat-text: #251d24; --heat-page: #fefafe;/, "the text on a heat step is the palette's own text and page colors");
  assert.match(css, /@media screen and \(prefers-contrast: more\) and \(forced-colors: none\) \{ html:root\[data-palette="plum"\]:not\(\[data-never\]\) \{ --line: #645b63; --muted: #251d24; \}/, "more contrast uses the palette's own muted and text colors");
  assert.match(css, /@media \(forced-colors: active\) \{ html:root\[data-palette="plum"\]:not\(\[data-never\]\) \{ --bg: Canvas;/, "the reader's system colors win over the palette, also over its dark block");
  assert.ok(css.indexOf("forced-colors: active") < css.indexOf("@media print"), "paper wins over forced colors, as in the kit");
  assert.throws(() => stampHtml(named("dusk")), /"dusk" is not a palette; the palettes are "harbor", "plum", "sepia"/);
});

test("render paints each drawing with the palette's light values, so a drawing copied out of the page keeps the palette", () => {
  const harbor = build(named("harbor"));
  const drawings = harbor.match(/<svg id="dg-[\s\S]*?<\/svg>/g);
  assert.ok(drawings.length >= 2);
  const p = PALETTES.harbor.light;
  for (const svg of drawings) {
    for (const [token, hex] of Object.entries(DOCENT)) assert.ok(!svg.includes(`var(--${token},${hex})`), `no Docent fallback for --${token} is left`);
    assert.ok(svg.includes(`var(--bg,${p.bg})`) || svg.includes(`var(--text,${p.text})`));
  }
  assert.equal(paint("var(--ok,#1a7f37) var(--text,#1c1f2e)", "harbor"), `var(--ok,#1a7f37) var(--text,${p.text})`, "status colors stay Docent's own");
  assert.equal(paint("var(--text,#1c1f2e)", null), "var(--text,#1c1f2e)");
});

test("check: a known palette name, the kit and drawings of that palette, and host colors on the palette's pages", () => {
  for (const name of NAMES) assert.deepEqual(checkDocument(build(named(name))), { errors: [], warnings: [], notes: [] }, name);
  assert.equal(paletteOf('<html lang="en" data-palette="plum">'), "plum");
  assert.deepEqual([`<html data-palette='plum'>`, "<html data-palette=plum>", '<html lang="en" DATA-PALETTE = "plum">', '<html lang="en">'].map(paletteOf), ["plum", "plum", "plum", null], "single quotes, no quotes and capitals name a palette too");
  const plum = build(named("plum"));
  assert.match(checkDocument(plum.replace('data-palette="plum"', 'data-palette="dusk"')).errors.join("\n"), /data-palette="dusk"; the palettes are "harbor", "plum", "sepia"/);
  assert.match(checkDocument(plum.replace('data-palette="plum"', 'data-palette="sepia"')).errors.join("\n"), /the kit styles carry the palette "plum", but <html> names "sepia"; run stamp[\s\S]*the drawing does not match its data; run render/);
  assert.match(checkDocument(plum.replace(' data-palette="plum"', "")).errors.join("\n"), /the kit styles carry the palette "plum", but <html> names none; run stamp/);
  const accent = (h, css) => checkDocument(h.replace("</head>", `<style>:root { ${css} }</style></head>`)).errors.join("\n");
  assert.match(accent(plum, "--host-accent: #767676; --host-accent-dark: #a0a0a0;"), /--host-accent #767676 has a contrast of 4\.40:1 on #fefafe and 4\.11:1 on #faf1f8; text needs 4\.5:1/, "a host accent is tested on the palette's well");
  assert.match(checkDocument(build(named("sepia")).replace("</head>", "<style>:root { --bg: #ffffff; }</style></head>")).warnings.join(), /a style sets --bg[\s\S]*or a palette for the page and the grays/);
});

test("the palette table in DESIGN.md shows the values of palettes.json", () => {
  const design = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "references", "DESIGN.md"), "utf8");
  for (const name of NAMES) for (const mode of ["light", "dark"]) for (const [token, hex] of Object.entries(PALETTES[name][mode])) if (token !== "fig") assert.ok(design.includes(`\`${hex}\``), `${name} ${mode} ${token} ${hex} is in the table`);
});
