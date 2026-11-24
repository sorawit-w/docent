// A palette from a host's own hue (docs/proposals/repo-config.md, section 2, item b): one color in, a whole palette out, by the rules
// that made Harbor, Plum and Sepia (docs/proposals/white-label.md, section 6, and "Palettes" in DESIGN.md). Only the color's CIELAB hue
// is used: each gray keeps the lightness of Docent's own, so the page is a light page of that hue, not the color itself. Then every
// pair of tests/contrast.py is tested (pairs.cjs), and a palette with a failing pair is refused, with the pair in plain words and the
// closest color that passes. The same color always gives the same palette.
const { lab, contrast, atLightness, darkAccent, distance, STATUS } = require("./color.cjs");
const { failing } = require("./pairs.cjs");

// Docent's own colors: each derived color takes the lightness of the one it replaces.
const DOCENT = {
  light: { bg: "#fbfbfe", panel: "#f2f3f9", text: "#1c1f2e", muted: "#575d75", line: "#d3d6e3", primary: "#2f3fd0", ink: "#1b2260", heat: ["#c6e9ef", "#86c9d5", "#3da6b6", "#00707e", "#004a53"] },
  dark: { bg: "#12141f", panel: "#0b0d15", text: "#e7e9f3", muted: "#959bb3", line: "#2d3146", heat: ["#093339", "#054e58", "#006b78", "#36a0b1", "#80cad7"] },
};
// The chroma of each gray: the page and the well take twice Docent's tint, where sRGB can show it; the line at most 10, and the muted and
// text colors at most 6, so a note never looks like a link.
const CHROMA = { bg: (c) => 2 * c, panel: (c) => 2 * c, line: () => 10, muted: () => 6, text: () => 6 };
const ACCENT = { from: 30, to: 46, step: 0.5 }; // the lightness the accent may take: dark enough for 4.5:1, light enough to stand apart from the text
const PRESENT = 7; // a deck in present mode needs 7:1 for the accent on the page
const SERIF = 'Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif'; // Docent's own headings
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const angle = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const statusHues = () => [...Object.values(STATUS.light), ...Object.values(STATUS.dark)].map((c) => lab(c).h);

/** The heat hue: in steps of 5°, the hue that stands furthest from the accent (light and dark) and the three status colors (light and dark). */
function heatHue(light, dark) {
  const avoid = [lab(light).h, lab(dark).h, ...statusHues()];
  let best = null;
  for (let h = 0; h < 360; h += 5) { const s = Math.min(...avoid.map((x) => angle(h, x))); if (!best || s > best.s) best = { h, s }; }
  return best.h;
}

/** The accent of a hue: the lightness between 30 and 46 that keeps the most room on the rules that an accent must pass (4.5:1 on the
    page and the well, 25 from the muted color and from each status color, in light and in dark), with the most chroma sRGB can show. */
function accentOf(h, muted) {
  let best = null;
  for (let L = ACCENT.from; L <= ACCENT.to + 1e-9; L += ACCENT.step) {
    const light = atLightness(L, 150, h);
    if (contrast(light, DOCENT.light.bg) < 4.5 || contrast(light, DOCENT.light.panel) < 4.5) continue;
    const dark = darkAccent(light);
    const room = Math.min(distance(light, muted.light) - 25, distance(dark, muted.dark) - 25, ...Object.values(STATUS.light).map((s) => distance(light, s) - 25), ...Object.values(STATUS.dark).map((s) => distance(dark, s) - 25));
    if (!best || room > best.room) best = { light, dark, room };
  }
  return best;
}

/** The palette of one color, as palettes.json holds a palette. With { accent: [light, dark] }, the accent is given, not worked out:
    the tests use it to work out Harbor, Plum and Sepia again around their own accents. */
function derive(color, { accent } = {}) {
  if (!HEX.test(color || "")) throw new Error(`"${color}" is not a hex color, such as "#f3ece0"`);
  const h = lab(color).h, out = { light: {}, dark: {} };
  for (const mode of ["light", "dark"]) for (const [token, rule] of Object.entries(CHROMA)) { const { L, C } = lab(DOCENT[mode][token]); out[mode][token] = atLightness(L, rule(C), h); }
  const [light, dark] = accent || (({ light: l, dark: d }) => [l, d])(accentOf(h, { light: out.light.muted, dark: out.dark.muted }));
  const heat = heatHue(light, dark);
  for (const mode of ["light", "dark"]) {
    out[mode].fig = out[mode].panel;
    DOCENT[mode].heat.forEach((step, i) => { const { L, C } = lab(step); out[mode][`heat-${i + 1}`] = atLightness(L, C, heat); });
  }
  out.light.primary = light;
  out.light.ink = atLightness(lab(DOCENT.light.ink).L, lab(light).C, h); // the accent's hue at the lightness of Docent's heading color
  out.dark.primary = dark;
  const palette = { name: "Custom", mood: `From the host's own hue, ${color.toLowerCase()}`, hue: color.toLowerCase(), heatHue: heat, serif: SERIF, light: out.light, dark: out.dark };
  if (contrast(light, out.light.bg) < PRESENT) {
    const { L, C } = lab(light);
    for (let l = L; l >= 0; l -= 0.1) { const c = atLightness(l, C, h); if (contrast(c, out.light.bg) >= PRESENT) { palette.present = { primary: c }; break; } }
  }
  return palette;
}

/** The palette of a color, tested: { palette, failing, closest }. failing lists each pair that fails, in plain words; closest is the
    nearest color, of the same lightness and chroma in another hue, whose palette passes, or null. */
function customPalette(color) {
  const palette = derive(color), bad = failing(palette);
  return { palette, failing: bad, closest: bad.length ? closestPassing(color) : null };
}

/** The nearest color that gives a palette with no failing pair: the same lightness and chroma, the hue turned 5° at a time. */
function closestPassing(color) {
  const { L, C, h } = lab(color);
  for (let d = 5; d <= 180; d += 5) {
    const found = [h + d, h - d].map((x) => atLightness(L, C, (x + 360) % 360)).filter((c) => c && !failing(derive(c)).length);
    if (found.length) return found.sort((a, b) => distance(a, color) - distance(b, color))[0];
  }
  return null;
}

module.exports = { DOCENT, heatHue, derive, customPalette, closestPassing };
