// The custom palette in the pages (docs/proposals/repo-config.md, PR 7): data-palette="custom" with data-palette-hue on <html>; stamp
// writes its four blocks and its deck block, render its light values as each drawing's fallback, and check works it out again.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { stampHtml, findKit } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { derive } = require("../skills/docent/scripts/lib/hue.cjs");
const { paletteFor } = require("../skills/docent/scripts/lib/palettes.cjs");
const { readConfig } = require("../skills/docent/scripts/lib/config.cjs");

const assets = path.join(__dirname, "..", "skills", "docent", "assets");
const specimen = fs.readFileSync(path.join(assets, "specimen.html"), "utf8");
const deckSource = fs.readFileSync(path.join(__dirname, "fixtures", "deck.html"), "utf8");
const build = (html) => stampHtml(renderDocument(html).html).html;
const custom = (html, hue) => html.replace(/<html lang="en" data-profile="(\w+)">/, `<html lang="en" data-profile="$1" data-palette="custom" data-palette-hue="${hue}">`);
const BLUE = "#eef2ff", TEAL = "#0b6574";

test("a page with a palette from a hue is built by render and stamp, carries the palette, and passes check", () => {
  const page = build(custom(specimen, BLUE)), p = derive(BLUE);
  const kit = findKit(page).find((k) => k.kind === "styles").text;
  assert.match(kit, /:root\[data-palette="custom"\] \{ --bg: #[0-9a-f]{6};/);
  assert.ok(kit.includes(`--bg: ${p.light.bg};`) && kit.includes(`--bg: ${p.dark.bg};`), "the light and dark pages of the palette");
  assert.ok(kit.includes(`--heat-1: ${p.light["heat-1"]};`), "its heat steps");
  assert.ok(!/data-palette="(harbor|plum|sepia)"/.test(kit), "and no named palette");
  assert.ok(page.includes(`var(--bg,${p.light.bg})`), "each drawing carries the palette's light values as its fallback");
  assert.deepEqual(checkDocument(page).errors, []);
  assert.equal(build(page), page, "building it again changes nothing");
  const other = page.replace(`data-palette-hue="${BLUE}"`, 'data-palette-hue="#fdf2f8"');
  assert.match(checkDocument(other).errors.join("\n"), /\[kit\.blocks\] the kit styles were changed by hand[\s\S]*\[diagram\.match\]/, "a new hue needs render and stamp again");
});

test("a deck with a palette from a hue gets the present-mode block, with an accent at 7:1", () => {
  const deck = build(custom(deckSource, BLUE)), p = derive(BLUE);
  assert.match(deck, /html:root\[data-palette="custom"\]\.presenting/);
  assert.ok(deck.includes(`--primary: var(--host-accent, ${p.present ? p.present.primary : p.light.primary});`));
  assert.deepEqual(checkDocument(deck).errors, []);
});

test("check and stamp refuse a palette from a hue that fails a pair, in plain words, with the closest color that passes", () => {
  const teal = custom(specimen, TEAL);
  const { error } = paletteFor(teal);
  assert.match(error, /^a palette from #0b6574 is refused: The muted color and the accent in light mode stand 2\d\.\d apart \(CIE76\); they need 25, so a note would look like a link, and 1 more pair\. The closest color that passes is #[0-9a-f]{6}$/);
  assert.ok(checkDocument(teal).errors.includes(`[kit.palette] ${error}`));
  assert.throws(() => stampHtml(teal), (e) => e.message === error);
  assert.match(checkDocument(specimen.replace('<html lang="en"', '<html lang="en" data-palette="custom"')).errors.join("\n"), /\[kit\.palette\] <html> has data-palette="custom" and no data-palette-hue/);
  assert.match(checkDocument(specimen.replace('<html lang="en"', '<html lang="en" data-palette-hue="#eef2ff"')).errors.join("\n"), /\[kit\.palette\] <html> has data-palette-hue="#eef2ff" and no data-palette="custom"/);
});

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docent-custom-"));
  fs.mkdirSync(path.join(root, ".git"));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), typeof text === "string" ? text : JSON.stringify(text));
  }
  return root;
}

test("the repo file names a palette from a hue as { \"hue\": … }, is refused for one that fails, and check notes a page with another", () => {
  const read = (palette) => readConfig(path.join(repo({ ".docent/config.json": { version: 1, palette } }), ".docent/config.json"), { palettes: ["harbor", "plum", "sepia"], profiles: [] });
  assert.deepEqual(read({ hue: BLUE }).errors, []);
  assert.match(read({ hue: TEAL }).errors[0], /^"palette": a palette from #0b6574 is refused: The muted color and the accent/);
  assert.deepEqual(read({ hue: "blue" }).errors, ['"palette"."hue": is "blue"; it is a hex color, such as "#eef2ff"']);
  assert.deepEqual(read({ hue: BLUE, accent: "#000000" }).errors, ['"palette": a palette from a hue is { "hue": "#…" } and nothing else']);
  const config = { label: ".docent/config.json", base: os.tmpdir(), data: { version: 1, palette: { hue: BLUE } } };
  assert.deepEqual(checkDocument(build(custom(specimen, BLUE)), { config }).notes, [], "the page has the file's palette");
  assert.match(checkDocument(build(custom(specimen, "#EEF2FF")), { config }).notes.join(), /^$/, "a hue in capitals is the same hue");
  assert.match(checkDocument(specimen, { config }).notes[0], /^\[brand\.differs\] the palette \(the page has none, the file a palette from #eef2ff\) differs/);
});

test("brand --hue names the closest tested palette and says whether a palette from that hue passes", () => {
  const brand = path.join(__dirname, "..", "skills", "docent", "scripts", "brand.cjs");
  const out = (hue) => execFileSync(process.execPath, [brand, "--hue", hue], { encoding: "utf8" });
  assert.match(out("#eef2ff"), /A palette built from #eef2ff passes every tested pair: "palette": \{ "hue": "#eef2ff" \}/);
  assert.match(out("#f3ece0"), /The closest tested page is Sepia[\s\S]*A palette from #f3ece0 is refused: The accent and the amber status color[\s\S]*The closest color that passes is #[0-9a-f]{6}\./);
});
