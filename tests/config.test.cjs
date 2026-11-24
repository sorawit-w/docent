// The repo file, .docent/config.json (docs/proposals/repo-config.md, sections 1, 2 and 7): the scripts find the nearest one above the
// page, read it, and refuse a bad one. Each test builds its own small repo in a temporary folder.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { findConfig, readConfig, repoRoot } = require("../skills/docent/scripts/lib/config.cjs");
const { NAMES: PALETTES } = require("../skills/docent/scripts/lib/palettes.cjs");
const { PROFILES } = require("../skills/docent/scripts/lib/profile.cjs");

const DESIGN = "---\nname: Example\ncolors:\n  primary: \"#0b6e4f\"\n  surface: \"#f3ece0\"\n---\n# Example\n";
/** A temporary repo: { "path/in/repo": "text" }, with a .git folder at its root. Returns its folder. */
function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docent-config-"));
  fs.mkdirSync(path.join(root, ".git"));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), typeof text === "string" ? text : JSON.stringify(text, null, 2));
  }
  return root;
}
const read = (root, name = ".docent/config.json") => readConfig(path.join(root, name), { palettes: PALETTES, profiles: PROFILES });
const errorsOf = (config, extra = {}) => read(repo({ ".docent/config.json": config, ...extra })).errors;

test("the nearest file wins: in the page's folder, or two folders up; the search stops at the root of the repo", () => {
  const root = repo({ ".docent/config.json": { version: 1 }, "docs/team/.docent/config.json": { version: 1 }, "docs/team/page.html": "", "docs/a/b/page.html": "" });
  assert.equal(findConfig(path.join(root, "docs/team")), path.join(root, "docs/team/.docent/config.json"), "a file in the page's folder");
  assert.equal(findConfig(path.join(root, "docs/a/b")), path.join(root, ".docent/config.json"), "a file two folders up");
  assert.equal(repoRoot(path.join(root, "docs/a/b")), root);
  const outer = fs.mkdtempSync(path.join(os.tmpdir(), "docent-outer-"));
  fs.mkdirSync(path.join(outer, ".docent"));
  fs.writeFileSync(path.join(outer, ".docent/config.json"), '{"version": 1}');
  fs.mkdirSync(path.join(outer, "inner/.git"), { recursive: true });
  fs.mkdirSync(path.join(outer, "inner/docs"));
  assert.equal(findConfig(path.join(outer, "inner/docs")), null, "a file above the repo is not used");
});

test("a good file is read, and every path is read from the folder that holds .docent/", () => {
  const root = repo({
    ".docent/config.json": { version: 1, design: "docs/DESIGN.md", palette: "sepia", tokens: { "host-ink": { value: "#3b2a5c", reason: "Our headings are violet." }, "host-sans": { value: "Inter, system-ui, sans-serif", reason: "The product's font." } }, logo: { light: "brand/logo.svg", dark: ".docent/logo-dark.svg" }, tagline: "Small tools for careful teams.", credit: "text", profile: "brief", rules: {} },
    "docs/DESIGN.md": DESIGN, "brand/logo.svg": "<svg/>", ".docent/logo-dark.svg": "<svg/>",
  });
  const config = read(root);
  assert.deepEqual(config.errors, []);
  assert.equal(config.base, root);
  assert.equal(config.data.tokens["host-ink"].value, "#3b2a5c");
});

test("a bad file is refused, field by field, and none of it is used", () => {
  const bad = (text) => { const root = repo({}); fs.mkdirSync(path.join(root, ".docent")); fs.writeFileSync(path.join(root, ".docent/config.json"), text); return read(root); };
  assert.match(bad("{ version: 1 }").errors[0], /^it is not valid JSON: /);
  assert.equal(bad("{ version: 1 }").data, null);
  assert.deepEqual(bad("[1]").errors, ["it holds no JSON object; it starts with { and holds the fields"]);
  assert.deepEqual(errorsOf({ design: null }), ['"version": missing; write "version": 1, so that a later Docent can read the file']);
  assert.deepEqual(errorsOf({ version: 2 }), ['"version": is 2; this Docent reads version 1']);
  assert.deepEqual(errorsOf({ version: 1, design: "../DESIGN.md" }), ['"design": "../DESIGN.md" leaves the repo; a path stays inside it']);
  assert.deepEqual(errorsOf({ version: 1, design: "https://example.com/DESIGN.md" }), ['"design": "https://example.com/DESIGN.md" is a web address; a path names a file inside the repo, because the scripts use no network']);
  assert.deepEqual(errorsOf({ version: 1, design: "/etc/DESIGN.md" }), ['"design": "/etc/DESIGN.md" is an absolute path; write it from the folder that holds .docent/, so it works on every machine']);
  assert.deepEqual(errorsOf({ version: 1, design: "docs/MISSING.md" }), ['"design": there is no file at "docs/MISSING.md", read from the folder that holds .docent/']);
  assert.deepEqual(errorsOf({ version: 1, logo: "brand/logo.jpg" }, { "brand/logo.jpg": "x" }), ['"logo": "brand/logo.jpg" is not an SVG, PNG or WebP file']);
  assert.deepEqual(errorsOf({ version: 1, pallete: "sepia" }), ['"pallete": no field has this name; the fields are "version", "design", "tokens", "palette", "logo", "tagline", "credit", "profile", "rules"']);
  assert.deepEqual(errorsOf({ version: 1, palette: "teal" }), ['"palette": is "teal"; the palettes are "harbor", "plum", "sepia", or null for Docent\'s own colors']);
  assert.deepEqual(errorsOf({ version: 1, credit: "yes" }), ['"credit": is "yes"; it is "link", "text", "none"']);
  assert.deepEqual(errorsOf({ version: 1, tagline: "x".repeat(91) }), ['"tagline": has 91 characters; it is one line of at most 90']);
  assert.deepEqual(errorsOf({ version: 1, tokens: { "host-ink": { value: "#3b2a5c" } } }), ['"tokens"."host-ink": no "reason"; write why the team chose this value']);
  assert.deepEqual(errorsOf({ version: 1, tokens: { "host-ink": { value: "violet", reason: "r" } } }), ['"tokens"."host-ink"."value": is "violet"; a host color is a hex color, such as "#3b2a5c"']);
  assert.deepEqual(errorsOf({ version: 1, tokens: { bg: { value: "#f3ece0", reason: "r" } } }), ['"tokens"."bg": no host token has this name; the host tokens are "host-accent", "host-accent-dark", "host-ink", "host-dot-dark", "host-serif", "host-sans", "host-mono"']);
  assert.deepEqual(errorsOf({ version: 1, tokens: { "host-sans": { value: "Inter; } body { color: red", reason: "r" } } }).length, 1, "a font token cannot close the style block");
});

test("a path that is a link to a file outside the repo is refused", () => {
  const root = repo({ ".docent/config.json": { version: 1, design: "docs/DESIGN.md" } });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "docent-elsewhere-"));
  fs.writeFileSync(path.join(outside, "DESIGN.md"), DESIGN);
  fs.mkdirSync(path.join(root, "docs"));
  fs.symlinkSync(path.join(outside, "DESIGN.md"), path.join(root, "docs/DESIGN.md"));
  assert.deepEqual(read(root).errors, ['"design": "docs/DESIGN.md" is a link to a file outside the repo; a path stays inside it']);
});

// brand and check with the repo file: each runs as a command in a small repo, as an agent runs it.
const { execFileSync } = require("node:child_process");
const SCRIPTS = path.join(__dirname, "..", "skills", "docent", "scripts");
const run = (script, args, cwd) => { try { return { code: 0, out: execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], { cwd, encoding: "utf8", stdio: "pipe" }) }; } catch (e) { return { code: e.status, out: `${e.stdout}${e.stderr}` }; } };
const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
const INK = { "host-ink": { value: "#3b2a5c", reason: "Our docs use the violet of the product's headings." } };

test("brand with no argument reads the DESIGN.md that the repo file names, and the file's heading color wins over it", () => {
  const root = repo({ ".docent/config.json": { version: 1, design: "docs/DESIGN.md", tokens: INK }, "docs/DESIGN.md": DESIGN, "docs/guides/x.txt": "" });
  const { code, out } = run("brand.cjs", [], path.join(root, "docs/guides"));
  assert.equal(code, 0, out);
  assert.match(out, /--host-accent: #0b6e4f;/, "the accent comes from DESIGN.md");
  assert.match(out, /--host-ink: #3b2a5c; +\/\* from \.\.\/\.\.\/\.docent\/config\.json, 11\.34:1 on the well: Our docs use the violet/, "the heading color comes from the file, with its reason");
  assert.match(out, /brand: colors\.surface #f3ece0 is a page color\. Docent keeps its own page color, because some text would become hard to read in dark mode and on paper\. The closest tested page is Sepia \(#fffbf6\), a distance of 6\.4; then Docent's own page 9\.5, Plum 9\.7, Harbor 9\.8\./);
  assert.match(run("brand.cjs", ["--no-config", "docs/DESIGN.md"], root).out, /--host-ink: #003020;/, "--no-config reads no file: the heading color is worked out from the accent");
  const gray = repo({ "DESIGN.md": DESIGN.replace("#f3ece0", "#e9e9ec") });
  assert.match(run("brand.cjs", ["DESIGN.md"], gray).out, /The closest tested page is Docent's own page \(#fbfbfe\), a distance of 6\.3; then Plum 6\.4, Harbor 6\.5, Sepia 7\.7/, "for a gray page, Docent's own page is the closest");
});

test("brand keeps a heading color from the file that fails 4.5:1, says check will refuse it, and refuses a bad file", () => {
  const root = repo({ ".docent/config.json": { version: 1, design: null, tokens: { "host-ink": { value: "#9a8fb5", reason: "A lighter violet." } } } });
  const { code, out } = run("brand.cjs", [], root);
  assert.equal(code, 0, out);
  assert.match(out, /--host-ink: #9a8fb5;/);
  assert.match(out, /brand: \.docent\/config\.json names no DESIGN\.md \("design" is null\), so only its own tokens are used/);
  assert.match(out, /brand: --host-ink #9a8fb5 from \.docent\/config\.json has 2\.\d\d:1 on Docent's well, below 4\.5:1; check will refuse it/);
  const bad = repo({ ".docent/config.json": { design: "../DESIGN.md" } });
  const refused = run("brand.cjs", [], bad);
  assert.equal(refused.code, 1);
  assert.match(refused.out, /brand: error: \.docent\/config\.json, "version": missing/);
  assert.match(refused.out, /brand: error: \.docent\/config\.json, "design": "\.\.\/DESIGN\.md" leaves the repo/);
  assert.equal(run("brand.cjs", [], repo({})).code, 2, "with no argument and no repo file, brand prints its usage");
});

test("check tests the file's heading color on each page, reports a bad file once, and still checks the pages without it", () => {
  const root = repo({ ".docent/config.json": { version: 1, tokens: { "host-ink": { value: "#9a8fb5", reason: "A lighter violet." } } }, "docs/a.html": specimen, "docs/deep/b.html": specimen });
  const failed = run("check.cjs", ["docs/a.html", "docs/deep/b.html"], root);
  assert.equal(failed.code, 1);
  assert.match(failed.out, /check docs\/a\.html: error \[host\.contrast\]: --host-ink #9a8fb5 from \.docent\/config\.json has a contrast of 2\.\d\d:1 on #fbfbfe and 2\.\d\d:1 on #f2f3f9; text needs 4\.5:1/);
  assert.match(failed.out, /check docs\/deep\/b\.html: error \[host\.contrast\]/, "a file two folders up holds for the page too");
  assert.equal(run("check.cjs", ["--no-config", "docs/a.html"], root).code, 0, "--no-config reads no file");
  // A page's own value wins over the file's.
  fs.writeFileSync(path.join(root, "docs/c.html"), specimen.replace("</head>", "<style>:root { --host-ink: #3b2a5c; }</style></head>"));
  assert.equal(run("check.cjs", ["docs/c.html"], root).code, 0);
  // A good heading color in the file passes.
  fs.writeFileSync(path.join(root, ".docent/config.json"), JSON.stringify({ version: 1, tokens: INK }));
  assert.equal(run("check.cjs", ["docs/a.html"], root).code, 0);
  // A bad file: one error for the file, before the pages, and the pages are checked without it.
  fs.writeFileSync(path.join(root, ".docent/config.json"), "{ not json");
  const bad = run("check.cjs", ["docs/a.html", "docs/deep/b.html"], root);
  assert.equal(bad.code, 1);
  assert.equal(bad.out.match(/check: error: \.docent\/config\.json, it is not valid JSON/g).length, 1);
  assert.ok(bad.out.indexOf("check: error") < bad.out.indexOf("check docs/a.html"), "the file comes before the pages");
  assert.match(bad.out, /check docs\/a\.html: 0 errors/);
  // --config names another file.
  fs.writeFileSync(path.join(root, "other.json"), JSON.stringify({ version: 1, tokens: { "host-ink": { value: "#9a8fb5", reason: "r" } } }));
  assert.match(run("check.cjs", ["--config", "other.json", "docs/a.html"], root).out, /from other\.json has a contrast/);
});
