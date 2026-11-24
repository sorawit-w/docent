// The brand from the repo file (docs/proposals/repo-config.md, sections 6 to 8): stamp writes the host tokens between docent:host
// markers, a page about another product (data-brand="off") takes none, and the sample repo builds its branded page from the file.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { stampHtml, hostOf } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { readConfig } = require("../skills/docent/scripts/lib/config.cjs");
const { hostTokens } = require("../skills/docent/scripts/brand.cjs");
const { NAMES: PALETTES } = require("../skills/docent/scripts/lib/palettes.cjs");
const { PROFILES } = require("../skills/docent/scripts/lib/profile.cjs");

const assets = path.join(__dirname, "..", "skills", "docent", "assets");
const SCRIPTS = path.join(__dirname, "..", "skills", "docent", "scripts");
const specimen = fs.readFileSync(path.join(assets, "specimen.html"), "utf8");
const DESIGN = "---\nname: Example\ncolors:\n  primary: \"#5b3fa8\"\n---\n";
const INK = { "host-ink": { value: "#3b2a5c", reason: "Our headings are violet." } };
function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "docent-brand-"));
  fs.mkdirSync(path.join(root, ".git"));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), typeof text === "string" ? text : JSON.stringify(text, null, 2));
  }
  return root;
}
const run = (script, args, cwd) => { try { return { code: 0, out: execFileSync(process.execPath, [path.join(SCRIPTS, script), ...args], { cwd, encoding: "utf8", stdio: "pipe" }) }; } catch (e) { return { code: e.status, out: `${e.stdout}${e.stderr}` }; } };
const read = (root, file) => fs.readFileSync(path.join(root, file), "utf8");

test("stamp writes the host tokens of the repo file in :where(:root), between docent:host markers, and again when the file changes", () => {
  const root = repo({ ".docent/config.json": { version: 1, design: "DESIGN.md", tokens: INK }, "DESIGN.md": DESIGN, "docs/a.html": specimen });
  assert.match(run("stamp.cjs", ["docs/a.html"], root).out, /stamp docs\/a\.html: styles already current, script already current, host tokens added/);
  assert.equal(hostOf(read(root, "docs/a.html")).split("\n")[2], ":where(:root) { --host-accent: #5b3fa8; --host-accent-dark: #b18cff; --host-ink: #3b2a5c; }", "the accent from DESIGN.md, the heading color from the file");
  assert.match(run("stamp.cjs", ["docs/a.html"], root).out, /host tokens already current/, "stamp is the same when it runs twice");
  assert.equal(run("check.cjs", ["docs/a.html"], root).code, 0);
  fs.writeFileSync(path.join(root, ".docent/config.json"), JSON.stringify({ version: 1, design: "DESIGN.md" }));
  assert.match(run("stamp.cjs", ["docs/a.html"], root).out, /host tokens replaced/);
  assert.match(hostOf(read(root, "docs/a.html")), /--host-ink: #251477;/, "with no heading color in the file, brand works one out again");
  assert.match(run("stamp.cjs", ["--no-config", "docs/a.html"], root).out, /host tokens taken out/);
  assert.equal(hostOf(read(root, "docs/a.html")), null);
  assert.equal(read(root, "docs/a.html"), specimen, "taking the block out leaves the page as it was");
});

test("a page about another product (data-brand=\"off\") takes no brand field of the file, and keeps its rule changes", () => {
  const off = specimen.replace('<html lang="en" data-profile="standard">', '<html lang="en" data-profile="standard" data-brand="off">').replace("</main>", '<ul class="cards"><li><p class="big">1</p><p>one</p></li></ul></main>');
  const root = repo({ ".docent/config.json": { version: 1, tokens: { "host-ink": { value: "#9a8fb5", reason: "A lighter violet." } }, rules: { "cards.count": { off: true, reason: "Short grids are fine here." } } }, "docs/a.html": stampHtml(off, { host: [["host-ink", "#3b2a5c"]] }).html });
  assert.match(run("stamp.cjs", ["docs/a.html"], root).out, /host tokens taken out/);
  const out = run("check.cjs", ["docs/a.html"], root).out;
  assert.ok(!/host\.contrast/.test(out), "the file's heading color is not the page's");
  assert.match(out, /note \[cards\.count\]: off in \.docent\/config\.json/, "the house style still holds");
  assert.match(checkDocument(specimen.replace("<html lang=\"en\"", "<html lang=\"en\" data-brand=\"on\"")).errors.join("\n"), /\[frame\.brand\] <html> has data-brand="on"; the only value is "off"/);
});

test("stamp with a repo file that is refused still stamps the kit, leaves the host tokens, and says why", () => {
  const root = repo({ ".docent/config.json": { version: 1, design: "../DESIGN.md" }, "docs/a.html": specimen.replace(/\/\* docent:kit [^ ]+ \*\//, "/* docent:kit 0.0.1 */") });
  const { code, out } = run("stamp.cjs", ["docs/a.html"], root);
  assert.equal(code, 1);
  assert.match(out, /stamp docs\/a\.html: styles replaced/);
  assert.match(out, /stamp docs\/a\.html: \.docent\/config\.json is refused, so stamp leaves the host tokens as they are: "design": "\.\.\/DESIGN\.md" leaves the repo/);
});

test("the sample repo: its branded page is built from its repo file, and passes check", () => {
  const root = path.join(assets, "sample-repo");
  const config = readConfig(path.join(root, ".docent", "config.json"), { palettes: PALETTES, profiles: PROFILES });
  assert.deepEqual(config.errors, []);
  const page = fs.readFileSync(path.join(root, "docs", "report-a-bug.html"), "utf8");
  assert.equal(stampHtml(renderDocument(page).html, { host: hostTokens(config).tokens }).html, page, "run render and stamp on sample-repo/docs/report-a-bug.html, then commit it");
  const { errors, warnings, notes } = checkDocument(page, { config: { ...config, label: ".docent/config.json" } });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, checkDocument(specimen).warnings, "the same two warnings as the specimen");
  assert.deepEqual(notes, []);
  const { data } = config;
  assert.match(page, new RegExp(`<html lang="en" data-profile="${data.profile}" data-palette="${data.palette}">`), "the file's profile and palette");
  assert.ok(page.includes(`<p class="tagline">${data.tagline}</p>`), "the file's tagline");
  assert.ok(page.includes("Made with Docent</p>") && data.credit === "text", "the credit as plain text");
  const shapes = (svg) => svg.replace(/^<svg[^>]*>/, "");
  assert.ok(page.includes(shapes(fs.readFileSync(path.join(root, data.logo), "utf8").trim())), "the worked logo of the file, inline");
  assert.match(hostOf(page), new RegExp(`--host-ink: ${data.tokens["host-ink"].value};`), "the file's heading color, written by stamp");
  for (const text of [page, fs.readFileSync(path.join(root, "DESIGN.md"), "utf8"), JSON.stringify(data)]) assert.ok(!/@(?!example\.)[\w-]+\.\w+|\/Users\//.test(text), "invented content only: no address and no machine path");
});

test("after stamp, a page's own host color still wins over the file's, as it does in the browser", () => {
  const own = specimen.replace("</head>", "<style>:root { --host-ink: #3b2a5c; }</style></head>");
  const root = repo({ ".docent/config.json": { version: 1, tokens: { "host-ink": { value: "#9a8fb5", reason: "A lighter violet." } } }, "docs/a.html": own });
  assert.equal(run("check.cjs", ["docs/a.html"], root).code, 0, "before stamp");
  run("stamp.cjs", ["docs/a.html"], root);
  assert.match(hostOf(read(root, "docs/a.html")), /--host-ink: #9a8fb5;/);
  assert.equal(run("check.cjs", ["docs/a.html"], root).code, 0, "after stamp: the page's own heading color wins");
  fs.writeFileSync(path.join(root, "docs/b.html"), specimen);
  run("stamp.cjs", ["docs/b.html"], root);
  assert.match(run("check.cjs", ["--no-config", "docs/b.html"], root).out, /error \[host\.contrast\]: --host-ink #9a8fb5 from the docent:host block has a contrast/, "a stamped value that the page does not override is tested");
});
