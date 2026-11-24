// A palette from a host's own hue (docs/proposals/repo-config.md, section 2, item b, and PR 6): the pairs of tests/contrast.py in Node,
// a script that works out a whole palette from one color, and a refusal in plain words, with the closest color that passes.
const test = require("node:test");
const assert = require("node:assert/strict");
const { palettePairs, failing, PAPER_HEAT } = require("../skills/docent/scripts/lib/pairs.cjs");
const { derive, customPalette, heatHue } = require("../skills/docent/scripts/lib/hue.cjs");
const { PALETTES, PAPER_HEAT: KIT_PAPER_HEAT } = require("../skills/docent/scripts/lib/palettes.cjs");
const { lab, contrast, distance } = require("../skills/docent/scripts/lib/color.cjs");

const GRAYS = ["bg", "panel", "line", "muted", "text"];
const HEAT = ["heat-1", "heat-2", "heat-3", "heat-4", "heat-5"];

test("the pairs in Node are the palette pairs of tests/contrast.py, and every named palette passes them", () => {
  assert.deepEqual(PAPER_HEAT, KIT_PAPER_HEAT, "paper keeps Docent's gray heat steps");
  for (const [name, p] of Object.entries(PALETTES)) {
    const { rows, gaps } = palettePairs(p);
    assert.equal(rows.length, 82, `${name}: 82 pairs, as contrast.py tests`);
    assert.equal(gaps.length, 16, `${name}: 16 distances`);
    assert.deepEqual(failing(p), [], `${name} passes`);
  }
});

test("Harbor, Plum and Sepia, worked out again from their page's hue around their own accent, come close to their picked values", () => {
  assert.equal(heatHue("#2f3fd0", "#8e9bff"), 220, "Docent's own heat hue, as DESIGN.md says");
  for (const [name, p] of Object.entries(PALETTES)) {
    const again = derive(p.light.bg, { accent: [p.light.primary, p.dark.primary] });
    assert.equal(again.heatHue, p.heatHue, `${name}: the heat hue`);
    for (const mode of ["light", "dark"]) for (const token of [...GRAYS, ...HEAT]) {
      const d = distance(again[mode][token], p[mode][token]);
      assert.ok(d < 4, `${name} ${mode} ${token}: ${again[mode][token]} is ${d.toFixed(1)} from the picked ${p[mode][token]}`);
      assert.ok(Math.abs(lab(again[mode][token]).L - lab(p[mode][token]).L) < 0.6, `${name} ${mode} ${token} keeps the lightness`);
    }
  }
});

test("a hue that passes gives a whole palette: Docent's lightness, the input's hue, every pair passing, and the same palette each time", () => {
  const { palette, failing: bad, closest } = customPalette("#eef2ff");
  assert.deepEqual(bad, []);
  assert.equal(closest, null);
  assert.deepEqual(derive("#eef2ff"), palette, "the same color always gives the same palette");
  assert.equal(palette.name, "Custom");
  assert.equal(palette.hue, "#eef2ff");
  const h = lab("#eef2ff").h;
  for (const mode of ["light", "dark"]) for (const token of GRAYS) assert.ok(Math.abs(((lab(palette[mode][token]).h - h + 540) % 360) - 180) < 6, `${mode} ${token} takes the input's hue`);
  assert.ok(lab(palette.light.bg).L > 98, "a light page of that hue, not the color itself");
  assert.ok(contrast(palette.present ? palette.present.primary : palette.light.primary, palette.light.bg) >= 7, "present mode has an accent at 7:1");
  assert.throws(() => derive("blue"), /"blue" is not a hex color/);
});

test("a teal is refused, with the failing pair in plain words and the closest color that passes", () => {
  const teal = customPalette("#0b6574"); // Harbor's first accent: a teal cannot be both dark enough for text and strongly colored
  assert.ok(teal.failing.length > 0);
  assert.match(teal.failing[0].words, /^The muted color and the accent in light mode stand 2\d\.\d apart \(CIE76\); they need 25, so a note would look like a link$/);
  assert.match(teal.closest, /^#[0-9a-f]{6}$/);
  assert.deepEqual(failing(derive(teal.closest)), [], "the closest color passes");
  assert.ok(distance(teal.closest, "#0b6574") < 20, `${teal.closest} is near the teal`);
  const beige = customPalette("#f3ece0"); // its accent would be a brown that reads as the amber status
  assert.match(beige.failing.map((f) => f.words).join("\n"), /The accent and the amber status color in light mode stand \d+\.\d apart \(CIE76\); they need 25, so a link would read as a status/);
  assert.deepEqual(failing(derive(beige.closest)), []);
});

test("a failing contrast pair is named in plain words, with the one number that matters", () => {
  const p = derive("#eef2ff");
  const beigeWell = { ...p, light: { ...p.light, panel: "#f3ece0" } }; // a page color alone: the green status text falls below 4.5:1
  assert.ok(failing(beigeWell).some((f) => f.words === "Green status text on the well in light mode is too hard to read (4.33:1, needs 4.5:1)"));
});
