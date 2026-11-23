// brand: a host's DESIGN.md fills the six host tokens and nothing else, with fixed rules for what is missing.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { brand, frontMatter, print } = require("../skills/docent/scripts/brand.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { contrast, lab } = require("../skills/docent/scripts/lib/color.cjs");

const design = (colors, typography = "") => `---\nversion: alpha\nname: Example\ncolors:\n${colors}\n${typography ? `typography:\n${typography}\n` : ""}rounded:\n  sm: 4px\n---\n\n# Example\n`;
const tokens = (text) => Object.fromEntries(brand(text).tokens.map(([name, value, note]) => [name, { value, note }]));

test("the front matter reader takes plain keys, quotes and comments, and only what sits between the two --- lines", () => {
  const data = frontMatter('---\nname: "A: b"\ncolors:\n  primary: "#2f3fd0"   # a comment\n  "on-surface": \'#111111\'\ntypography:\n  h1:\n    fontFamily: "Brand Serif", Georgia, serif\n---\ncolors:\n  primary: "#000000"\n');
  assert.deepEqual(data, { name: "A: b", colors: { primary: "#2f3fd0", "on-surface": "#111111" }, typography: { h1: { fontFamily: '"Brand Serif", Georgia, serif' } } });
  assert.equal(frontMatter("# A DESIGN.md with no front matter\n"), null);
});

test("each host token comes from its own key, and every other key is named as not used", () => {
  const result = brand(design('  primary: "#a21caf"\n  secondary: "#4d0055"\n  dark-primary: "#ec6cf7"\n  surface: "#f3ece0"\n  error: "#c00000"', '  h1:\n    fontFamily: "Brand Serif"\n  body-md:\n    fontFamily: Inter, sans-serif\n  code:\n    fontFamily: "Brand Mono", monospace'));
  const t = Object.fromEntries(result.tokens.map(([n, v]) => [n, v]));
  assert.deepEqual(t, {
    "host-accent": "#a21caf", "host-accent-dark": "#ec6cf7", "host-ink": "#4d0055",
    "host-serif": '"Brand Serif", Charter, "Bitstream Charter", "Sitka Heading", "Sitka Text", Cambria, Georgia, serif',
    "host-sans": 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    "host-mono": '"Brand Mono", ui-monospace, "SF Mono", "Cascadia Code", Consolas, Menlo, monospace',
  });
  assert.deepEqual(result.unused, ["colors.surface", "colors.error", "rounded"], "the page, status and shape values are read and left out on purpose");
  assert.equal(tokens(design('  primary: "#a21caf"\n  primary-dark: "#ec6cf7"'))["host-accent-dark"].value, "#ec6cf7", "primary-dark is read too");
});

test("a light accent below 4.5:1 keeps its hue and gets darker until 4.6:1; brand shows both values", () => {
  const t = tokens(design('  primary: "#f2b824"'));
  assert.equal(t["host-accent"].value, "#8d6800");
  assert.match(t["host-accent"].note, /colors.primary #f2b824 is 1.63:1 on the well, below 4.5:1; the same hue made darker, 4.61:1/);
  assert.ok(Math.abs(lab("#8d6800").h - lab("#f2b824").h) < 1);
  assert.equal(t["host-accent-dark"].value, "#f2b824", "dark mode keeps the brand's own yellow, which passes on the dark page");
  assert.match(brand(design('  primary: "#f2b824"')).notes.join("\n"), /--host-accent #8d6800 is close to the status color "warn"[\s\S]*--host-accent-dark #f2b824 is close to the dark status color "warn"/, "a yellow brand reads as a warning; brand says so before check does");
});

test("a missing dark accent is worked out at 7:1, and a missing or weak heading color takes the accent's hue at Docent's ink lightness", () => {
  const t = tokens(design('  primary: "#0b6e4f"'));
  assert.equal(t["host-accent-dark"].value, "#5ab08d");
  assert.match(t["host-accent-dark"].note, /the file has no dark accent, so worked out: the same hue at 7.01:1 on the dark page/);
  assert.equal(t["host-ink"].value, "#003020");
  assert.ok(contrast("#003020", "#fbfbfe") > 14);
  assert.match(tokens(design('  primary: "#0b6e4f"\n  secondary: "#4caf50"'))["host-ink"].note, /colors.secondary #4caf50 is 2\.\d\d:1 on the page/, "a secondary color that is too light for text is not a heading color");
  assert.match(tokens(design('  primary: "#0b6e4f"\n  secondary: "#4a5560"'))["host-ink"].note, /too light for a heading \(L\* 36\)/, "a secondary color that reads but is not dark enough for a heading");
  assert.match(tokens(design('  primary: "#0b6e4f"\n  dark-primary: "#0b6e4f"'))["host-accent-dark"].note, /colors.dark-primary #0b6e4f is .* below 4.5:1, so worked out/);
});

test("a font is kept by name, with Docent's fonts after it, because the page loads no font", () => {
  const result = brand(design('  primary: "#a21caf"', '  h1:\n    fontFamily: Brand Display, serif\n  body-lg:\n    fontFamily: "Not Installed Sans"'));
  const t = Object.fromEntries(result.tokens.map(([n, v]) => [n, v]));
  assert.match(t["host-serif"], /^"Brand Display", Charter,.* serif$/, "a brand's generic family would hide Docent's fonts, so Docent's own ends the stack");
  assert.match(t["host-sans"], /^"Not Installed Sans", system-ui,/, "with no body-md, the first body-* is used");
  assert.ok(result.notes.some((n) => /loads no font/.test(n)));
});

test("a file with no front matter, or no primary color, gives no accent and says why", () => {
  assert.match(brand("# Example\nNo front matter here.\n").error, /no front matter/);
  const result = brand(design('  primary: "blue"\n  surface: "#ffffff"'));
  assert.deepEqual(result.tokens, []);
  assert.match(result.notes.join("\n"), /colors.primary is "blue"; brand reads hex colors only[\s\S]*keeps Docent's own accent/);
});

test("the printed style block passes check on the starting page, and the script exits with 1 for a file with no front matter", () => {
  const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
  const { stampHtml } = require("../skills/docent/scripts/lib/kit.cjs");
  const template = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "template.html"), "utf8");
  const style = print(brand(design('  primary: "#d946ef"', '  h1:\n    fontFamily: "Brand Serif"')));
  const page = stampHtml(renderDocument(template).html).html.replace("</head>", `${style}\n</head>`);
  assert.deepEqual(checkDocument(page), { errors: [], warnings: [] }, "the values that brand gives pass check's contrast and warnings");
  const tmp = path.join(require("node:os").tmpdir(), `docent-brand-${process.pid}.md`);
  fs.writeFileSync(tmp, "# no front matter\n");
  assert.throws(() => execFileSync(process.execPath, [path.join(__dirname, "..", "skills", "docent", "scripts", "brand.cjs"), tmp], { stdio: "pipe" }), (e) => e.status === 1 && /no front matter/.test(e.stderr));
  fs.unlinkSync(tmp);
});
