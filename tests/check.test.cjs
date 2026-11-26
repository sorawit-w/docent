const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { VERSION, stampHtml, cssBlock } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { split, NUMBER_RULES } = require("../skills/docent/scripts/lib/rules.cjs");
const textOf = (line) => split(line).text;

const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
const errorsOf = (change) => checkDocument(change(specimen)).errors.join("\n");
const add = (where, what) => (html) => html.replace(where, `${what}${where}`);

test("the sample page is the output of stamp and render, and it passes check", () => {
  assert.equal(renderDocument(stampHtml(specimen).html).html, specimen, "run render and stamp on specimen.html, then commit it");
  const { errors, warnings } = checkDocument(specimen);
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 2, "the sample page shows one workflow in three forms, so check warns twice");
  assert.match(warnings[0], /should not draw the same thing twice/);
});

test("the starting page holds content and data only; render and stamp build it into a page that passes check with no warning", () => {
  const template = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "template.html"), "utf8");
  assert.ok(!/docent:kit|<svg id="dg-|class="(choose|checks|decide|values)"|<var data-v="[^"]+">[^<]/.test(template), "the starting page is not built: it has no kit, no drawing and no widget markup");
  assert.ok(template.length < 18500, `the starting page has ${template.length} bytes; an agent reads all of it, so it stays below 18500 (raised from 16000 for "Method and limits" and "Sources", and from 18000 for key findings, a total row and a quote)`);
  const made = renderDocument(template);
  assert.deepEqual([...made.results, ...made.widgets].map((r) => [r.id, r.error, r.warnings.length]), [["glance", null, 0], ["steps", null, 0], ["case", null, 0], ["list", null, 0], ["choice", null, 0], ["where", null, 0]]);
  assert.deepEqual(made.places, { count: 2, unknown: [], clash: [] }, "render fills both places of the value picker");
  const stamped = stampHtml(made.html);
  assert.deepEqual(stamped.actions, ["styles added", "script added"]);
  assert.deepEqual(checkDocument(stamped.html), { errors: [], warnings: [], notes: [] });
  assert.equal(stampHtml(renderDocument(stamped.html).html).html, stamped.html, "building it again changes nothing");
  assert.match(checkDocument(template).errors.join("\n"), /the document has no kit styles; run stamp/, "check says what an unbuilt page still needs");
});

test("check refuses anything that loads from the network", () => {
  assert.match(errorsOf(add("</head>", '<link rel="stylesheet" href="https://example.com/a.css">')), /<link> loads or points outside the file/);
  assert.match(errorsOf(add("</main>", '<img src="https://example.com/a.png" alt="">')), /<img src="https:\/\/example.com\/a.png"> loads from outside the file/);
  assert.match(errorsOf(add("</main>", '<script src="a.js"></script>')), /<script src="a.js"> loads from outside the file/);
  assert.match(errorsOf(add("</head>", "<style>@import 'a.css';</style>")), /@import/);
  assert.match(errorsOf(add("</head>", "<style>.x { background: url(https://example.com/a.png); }</style>")), /a style loads url\(https:\/\/example.com\/a.png\)/);
  assert.match(errorsOf(add("</body>", "<script>fetch('/x')</script>")), /a script outside the kit can use the network/);
  assert.equal(errorsOf(add("</main>", '<p><a href="https://example.com">a link to follow</a> <img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></p>')), "", "a link for the reader and an image inside the file are fine");
});

test("check keeps the page flat and the text at 14px or more", () => {
  const style = (css) => add("</head>", `<style>${css}</style>`);
  assert.match(errorsOf(style(".x { background: linear-gradient(red, blue); }")), /a gradient; the page is flat/);
  assert.match(errorsOf(style(".x { box-shadow: 0 1px 2px gray; }")), /a shadow; the page is flat/);
  assert.match(errorsOf(style(".x { filter: blur(2px); }")), /a filter; the page is flat/);
  assert.match(errorsOf(add("</main>", '<svg viewBox="0 0 8 8"><defs><pattern id="p"/></defs></svg>')), /<pattern> is used/);
  assert.match(errorsOf(style(".x { font-size: 12px; }")), /font-size: 12px; no text is below 14px/);
  assert.match(errorsOf(style(".x { font: 600 13px/1.4 sans-serif; }")), /font: 13px; no text is below 14px/);
  assert.match(errorsOf(add("</main>", '<p style="font-size: 0.8em">x</p>')), /font-size: 0.8em/);
  assert.match(errorsOf(add("</main>", "<p><small>x</small></p>")), /<small> makes text smaller/);
  assert.match(errorsOf(style(".x { text-transform: uppercase; }")), /uppercase/);
  assert.match(errorsOf(style(".x { background: #fff; }")), /pure white or pure black/);
  assert.equal(errorsOf(style(".x { font-size: 14px; margin: 0 0 12px; }")), "");
});

test("check tests the frame of the document and the format of its title", () => {
  assert.match(errorsOf((h) => h.replace('<html lang="en" data-profile="standard">', "<html>")), /<html> has no lang/);
  assert.match(errorsOf(add("</main>", "<h1>Second</h1>")), /2 <h1> headings/);
  assert.match(errorsOf((h) => h.replace(/<title>.*<\/title>/, "<title>Report a bug</title>")), /its format is "Document title — Host project"/);
  assert.match(errorsOf((h) => h.replace(/<title>.*<\/title>/, "<title>Report a bug and get a fix — Docent sample</title>")), /the <title> names Docent/);
  const warned = checkDocument(specimen.replace(/<title>.*<\/title>/, "<title>Another title — Example project</title>")).warnings.join("\n");
  assert.match(warned, /the <title> starts with "Another title", but the <h1> is "Report a bug and get a fix"/);
  // A long h1 may have a shorter window title, made of the h1's own words in the same order.
  const short = (title) => checkDocument(specimen.replace(/<title>.*<\/title>/, `<title>${title} — Example project</title>`)).warnings.filter((w) => w.includes("<title>"));
  assert.deepEqual(short("Report a bug"), []);
  assert.deepEqual(short("report a fix"), [], "case does not matter");
  assert.equal(short("A fix for a bug").length, 1, "the same words in another order are not a shorter form");
  assert.equal(short("Report a problem").length, 1, "a word that is not in the h1");
});

test("check finds a kit or a drawing that was changed by hand", () => {
  assert.match(errorsOf((h) => h.replace("--bg: #fbfbfe;", "--bg: #ff0000;")), /the kit styles were changed by hand or by a code formatter; run stamp/);
  assert.match(errorsOf((h) => h.replace(cssBlock(), "")), /the document has no kit styles; run stamp/);
  assert.match(errorsOf((h) => h.replace(`docent:kit ${VERSION} */`, "docent:kit 0.0.9 */")), /the kit styles are version 0\.0\.9/);
  assert.match(errorsOf((h) => h.replace(' r="13" class="stop"/>', ' r="15" class="stop"/>')), /diagram 1 \("path"\): the drawing does not match its data; run render/);
  assert.match(errorsOf((h) => h.replace('"verb": "file"', '"verb": "send"')), /the drawing does not match its data; run render/);
  assert.match(errorsOf(add("</main>", '<svg class="dg dg-wide" viewBox="0 0 8 8"></svg>')), /a diagram sits outside a diagram block/);
});

test("check rejects an icon that is not made of plain shapes", () => {
  const bad = specimen.replace('"id": "path",', '"id": "path",\n  "icons": {"bug": "<image href=\\"x.png\\"/>"},').replace('"note": "what went wrong", "icon": "document"', '"note": "what went wrong", "icon": "bug"');
  const errors = checkDocument(renderDocument(bad).html).errors.join("\n");
  assert.match(errors, /diagram 1 \("path"\): part "report": the icon "bug" is left out because <image> is not a plain shape/);
});

test("check finds a widget that was changed by hand, or that has no data", () => {
  assert.match(errorsOf((h) => h.replace('<label class="opt" for="wd-system-1">macOS</label>', '<label class="opt" for="wd-system-1">Mac</label>')), /widget 2 \("system"\): the widget does not match its data; run render/);
  assert.match(errorsOf((h) => h.replace('"Write the steps that lead to the problem.",', '"Write the steps.",')), /widget 3 \("ready"\): the widget does not match its data; run render/);
  assert.match(errorsOf((h) => h.replace('{"when": ["No", "No"], "title": "A question first"', '{"when": ["No", "Yes"], "title": "A question first"')), /widget 1 \("kind"\): answers 2 and 3 both fit "No" and "Yes"/);
  assert.match(errorsOf(add("</main>", '<form class="checks"><ul><li><input type="checkbox" id="a"><label for="a">By hand</label></li></ul></form>')), /a widget sits outside a widget block/);
  assert.match(errorsOf(add("</main>", '<div class="choose extra"></div>')), /a widget sits outside a widget block/);
  assert.equal(errorsOf(add("</main>", '<p class="chooser-note">A class with a longer name is fine.</p>')), "");
});

test("check warns when a document has more than 4 widgets; choosers with the same cases count as one", () => {
  const list = (id) => `<!-- docent:widget\n{"id": "${id}", "kind": "checklist", "label": "List ${id}", "items": ["One line.", "Another line."]}\n-->\n<!-- /docent:widget -->\n`;
  const chooser = (id) => `<!-- docent:widget\n{"id": "${id}", "kind": "chooser", "label": "Your system", "cases": [{"name": "macOS", "body": ["Text."]}, {"name": "Windows", "body": ["Text."]}, {"name": "Linux", "body": ["Text."]}]}\n-->\n<!-- /docent:widget -->\n`;
  const withMore = (blocks) => checkDocument(renderDocument(specimen.replace("</main>", `${blocks}</main>`)).html);
  const four = withMore(chooser("extra-b") + chooser("extra-c"));
  assert.deepEqual(four.errors, []);
  assert.equal(four.warnings.length, 2, "four widgets of the sample page, and choosers that change with its chooser");
  const five = withMore(list("extra-a"));
  assert.deepEqual(five.errors, []);
  assert.match(five.warnings.join("\n"), /the document has 5 widgets; a widget is for a reader who must choose, track or decide/);
});

test("check ties a walkthrough to its diagram: one step for each leg", () => {
  assert.match(errorsOf((h) => h.replace(/<li>\s*<h3>The maintainers release the fix\.<\/h3>[\s\S]*?<\/li>/, "")), /diagram 2 \("steps"\) has 4 legs, but its walkthrough has 3 steps/);
  const long = checkDocument(specimen.replace("<h3>You file the report.</h3>", "<h3>You write and then file the full report.</h3>")).warnings.join("\n");
  assert.match(long, /has 8 words; a step heading has at most six/);
});

test("the kit keeps the rules that check applies to an author's own styles", () => {
  const page = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width"><title>T — H</title><style>${cssBlock().replace(/docent:kit/g, "kit")}</style></head><body><span class="host">H</span><h1>T</h1></body></html>`;
  assert.deepEqual(checkDocument(page).errors, ["[kit.blocks] the document has no kit styles; run stamp", "[kit.blocks] the document has no kit script; run stamp"]);
});

test("check ties each value place to a value picker", () => {
  assert.match(errorsOf(add("</main>", '<p><var data-v="nope">x</var></p>')), /a place <var data-v="nope"> names a value that no value picker has/);
  assert.match(errorsOf((h) => h.replace('<var data-v="channel">stable</var>', '<var data-v="channel">beta</var>')), /a place <var data-v="channel"> holds "beta", not the value of the first option; run render/);
  const unused = checkDocument(specimen.replace(/File the report at <var data-v="tracker">[^<]*<\/var>\./, "File the report.")).warnings.join("\n");
  assert.match(unused, /the value "tracker" of a value picker is shown in no place/);
  const twice = specimen.replace("</main>", '<!-- docent:widget\n{"id": "again", "kind": "values", "label": "Again", "options": ["A", "B"], "values": [{"key": "channel", "values": ["a", "b"]}]}\n-->\n<!-- /docent:widget -->\n</main>');
  assert.match(checkDocument(renderDocument(twice).html).errors.join("\n"), /another value picker has the key "channel"/);
});

test("check warns about a card grid with fewer than 3 or more than 8 cards", () => {
  const grid = (n) => checkDocument(specimen.replace("</main>", `<ul class="cards">${"<li><h3>A</h3><p>B.</p></li>".repeat(n)}</ul></main>`)).warnings.filter((w) => w.includes("card grid"));
  assert.deepEqual(grid(3), []);
  assert.deepEqual(grid(8), []);
  assert.match(grid(2).join(), /a card grid has 2 cards; it holds 3 to 8/);
  assert.match(grid(9).join(), /a card grid has 9 cards/);
});

test("check warns about facts joined into one line of text; they go in a margin note", () => {
  const line = (p) => checkDocument(specimen.replace("</main>", `${p}</main>`)).warnings.filter((w) => w.includes("joins facts"));
  assert.match(line("<p>10:42 UTC | Bug tracker | ref BUG-12</p>").join(), /the paragraph "10:42 UTC \| Bug tracker \| ref BUG-12" joins facts with "\|" or "·"; list them in a margin note/);
  assert.equal(line("<p><time>10:42</time> UTC · Bug tracker · ref BUG-12</p>").length, 1, "tags between the facts do not hide them");
  assert.deepEqual(line("<p>Two facts | one bar.</p>"), [], "two facts are a line of text, not a list");
  assert.deepEqual(line("<p>Run <code>a | b | c</code> to filter.</p>"), [], "a | in code is not a separator");
});

test("check tests the host tokens: contrast for a hex color, and a warning for a kit token set by hand", () => {
  const style = (css) => checkDocument(specimen.replace("</head>", `<style>${css}</style></head>`));
  assert.deepEqual(style(":root { --host-accent: #a21caf; --host-accent-dark: #ec6cf7; --host-ink: #4d0055; }"), { errors: [], warnings: style("").warnings, notes: [] });
  assert.match(style(":root { --host-accent: #f2b824; }").errors.join(), /--host-accent #f2b824 has a contrast of 1\.\d\d:1 on #fbfbfe and 1\.\d\d:1 on #f2f3f9; text needs 4\.5:1/);
  assert.match(style(":root { --host-accent-dark: #2f3fd0; }").errors.join(), /--host-accent-dark #2f3fd0 has a contrast of/);
  assert.match(style(":root { --host-accent: rebeccapurple; }").warnings.join(), /check tests the contrast of a hex color only/);
  assert.match(style(":root { --primary: #0b6e4f; }").warnings.join(), /a style sets --primary; the kit sets it in four places/);
  assert.match(errorsOf((h) => h.replace('<html lang="en" data-profile="standard">', '<html lang="en" data-profile="standard" data-theme="sepia">')), /a fixed theme is "light" or "dark"/);
  assert.equal(errorsOf((h) => h.replace('<html lang="en">', '<html lang="en" data-theme="light">')), "");
});

test("the dark dot: --host-dot-dark needs 3:1 on the dark page and the dark well; three warnings on an accent that passes contrast but misleads", () => {
  const style = (css) => checkDocument(specimen.replace("</head>", `<style>${css}</style></head>`));
  const base = style("").warnings;
  const extra = (css) => style(css).warnings.filter((w) => !base.includes(w)).join("\n");
  assert.deepEqual(style(":root { --host-accent: #a21caf; --host-accent-dark: #ec6cf7; --host-dot-dark: #8a6d1f; }").errors, [], "a muted gold dot is 3.74:1 on the dark page");
  assert.match(style(":root { --host-dot-dark: #1b2260; }").errors.join(), /--host-dot-dark #1b2260 has a contrast of 1\.26:1 on #12141f and 1\.3\d:1 on #0b0d15; the dot is a mark and needs 3:1/);
  assert.match(extra(":root { --host-accent: #c8102e; --host-accent-dark: #ff7570; }"), /--host-accent #c8102e is close to the status color "err" \(a distance of 4\.3\); its links and dots would read as an error/);
  assert.match(extra(":root { --host-accent: #0b6e4f; --host-accent-dark: #6fd3a8; }"), /--host-accent #0b6e4f is close to the status color "ok" \(a distance of 23\.9\)/);
  assert.match(extra(":root { --host-accent: #a21caf; --host-accent-dark: #3fb950; }"), /--host-accent-dark #3fb950 is close to the dark status color "ok"/);
  assert.match(extra(":root { --host-accent: #3d3d3d; --host-accent-dark: #a0a0a0; }"), /--host-accent #3d3d3d has almost no color \(chroma 0\.0\)[\s\S]*--host-accent-dark #a0a0a0 has almost no color/);
  assert.match(extra(":root { --host-accent: #a21caf; }"), /--host-accent is set and --host-accent-dark is not[\s\S]*--host-accent-dark: #ec6cf7;/, "the warning names the dark accent that the rule gives");
  assert.equal(extra(":root { --host-accent: #a21caf; --host-accent-dark: #ec6cf7; }"), "");
});

test("a figure holds one drawing, or two for two separate chains", () => {
  const block = (id, extra = "") => `<!-- docent:diagram\n{"id": "${id}",${extra} "label": "Two steps.", "lanes": [{"id": "a", "name": "A"}], "parts": [{"id": "p", "lane": "a", "name": "P"}, {"id": "q", "lane": "a", "name": "Q"}], "legs": [{"from": "p", "to": "q", "verb": "go"}]}\n-->\n<!-- /docent:diagram -->\n`;
  const figure = (blocks) => checkDocument(renderDocument(specimen.replace("</main>", `<figure><div class="fig" role="region" aria-label="Figure 9" tabindex="0">\n${blocks}</div></figure></main>`)).html).errors.join("\n");
  assert.equal(figure(block("one") + block("two")), "");
  assert.match(figure(block("one") + block("two") + block("three")), /Figure 9 holds 3 diagrams; a figure holds one, or two for two separate chains/);
  assert.match(figure(block("one", ' "place": "walk",') + block("two")), /Figure 9 holds 2 diagrams beside walkthrough steps; there it holds one/);
});

test("check counts the legs of the route for a walkthrough, not the side legs", () => {
  const side = fs.readFileSync(path.join(__dirname, "fixtures", "side.json"), "utf8").replace('"id": "side"', '"id": "steps"');
  const html = specimen.replace(/(<!-- docent:diagram\n)\{\n  "id": "steps"[\s\S]*?(\n-->)/, (all, open, close) => `${open}${side.trim()}${close}`);
  assert.notEqual(html, specimen, "the walkthrough diagram of the sample page was replaced");
  const { errors } = checkDocument(renderDocument(html).html);
  assert.deepEqual(errors, [], "four steps for four legs; the side leg has no step");
});

test("check tests the profile: a known value, a warning when it is missing, and a warning when the page looks like another profile", () => {
  const html = (attrs) => specimen.replace('<html lang="en" data-profile="standard">', `<html lang="en"${attrs}>`);
  assert.match(checkDocument(html(' data-profile="dense"')).errors.join("\n"), /data-profile="dense"; a profile is "standard", "task", "reference", "brief"/);
  assert.match(checkDocument(html(' data-profile="standard" data-text="huge"')).errors.join("\n"), /data-text="huge"; the only value is "large"/);
  assert.equal(checkDocument(html(' data-profile="task" data-text="large"')).errors.length, 0);
  assert.match(checkDocument(html("")).warnings.join("\n"), /no data-profile, so the page uses "standard"/);
  const reference = stampHtml(renderDocument(fs.readFileSync(path.join(__dirname, "fixtures", "reference-page.html"), "utf8")).html).html;
  assert.deepEqual(checkDocument(reference), { errors: [], warnings: [], notes: [] }, "the reference sample passes check");
  assert.match(checkDocument(reference.replace('data-profile="reference"', 'data-profile="task"')).warnings.join("\n"), /data-profile="task"; the page looks like "reference": 3 code blocks and 3 tables/);
});

test("check refuses a hand-drawn drawing in a figure well, and leaves icons outside wells alone", () => {
  const well = (inner) => `<figure><div class="fig" role="region" aria-label="Figure 9, a chart" tabindex="0">${inner}</div><figcaption><strong>Figure 9</strong>A chart.</figcaption></figure>`;
  const svg = '<svg class="gc" width="8" height="8" viewBox="0 0 8 8" role="img" aria-label="A chart"><rect width="8" height="8"/></svg>';
  assert.match(errorsOf(add("</main>", well(svg))), /Figure 9, a chart holds a drawing that no diagram block made; write its data in a block and run render/);
  assert.match(errorsOf(add("</main>", well(`<div class="inner"><p>A note.</p></div>${svg}`))), /Figure 9, a chart holds a drawing/, "a nested div before the drawing does not end the well");
  assert.doesNotMatch(errorsOf(add("</main>", `<p>${svg.replace('role="img" aria-label="A chart"', 'aria-hidden="true"')}</p>`)), /holds a drawing/, "an icon outside a well is not a figure");
  for (const file of ["docs/research/document-layout.html", "skills/docent/assets/specimen.html"]) {
    assert.deepEqual(checkDocument(fs.readFileSync(path.join(__dirname, "..", file), "utf8")).errors, [], `${file} passes`);
  }
});

test("a figure well is found by its class word in any place, and a class that only starts with fig is not a well", () => {
  const svg = '<svg width="8" height="8" viewBox="0 0 8 8" role="img" aria-label="A chart"><rect width="8" height="8"/></svg>';
  assert.match(errorsOf(add("</main>", `<div class="extra fig" role="region" aria-label="Figure 9, a chart" tabindex="0">${svg}</div>`)), /Figure 9, a chart holds a drawing/);
  assert.doesNotMatch(errorsOf(add("</main>", `<div class="fig-icon">${svg}</div>`)), /holds a drawing/);
});

test("a <div> written in a diagram's data does not change where a figure well ends", () => {
  const page = renderDocument(specimen.replace(/("label": ")/, "$1A <div> wrapper holds the page. ")).html;
  assert.doesNotMatch(checkDocument(page).errors.join("\n"), /holds \d diagrams|holds a drawing/);
});

test("an svg named only in a comment inside a figure well is not a drawing", () => {
  assert.doesNotMatch(errorsOf((html) => html.replace(/(<div class="fig"[^>]*>)/, "$1<!-- Old <svg> removed; use diagram data below. -->")), /holds a drawing/);
});

test("the logo, the tagline and the credit: a logo may hold a gradient, the title follows a wordmark, and the credit and the tagline are tested", () => {
  const template = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "template.html"), "utf8");
  const built = stampHtml(renderDocument(template).html).html;
  const result = (change) => checkDocument(change(built));
  const shaded = '<svg class="logo" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><defs><linearGradient id="host-g"><stop offset="0" stop-color="#0a5f8a"/><stop offset="1" stop-color="#72c2ee"/></linearGradient></defs><path d="M2 2h20v20H2z" fill="url(#host-g)"/></svg>';
  assert.deepEqual(result((h) => h.replace('<span class="host">', `<span class="host">${shaded}`)), { errors: [], warnings: [], notes: [] }, "a host's logo is the one place where a gradient is allowed");
  assert.match(result((h) => h.replace("</main>", `<p>${shaded}</p></main>`)).errors.join("\n"), /a logo stands outside the top bar[\s\S]*<linearGradient> is used; the page is flat/);
  const word = '<svg class="logo" viewBox="0 0 96 24" width="96" height="24" role="img" aria-label="Example project"><path d="M0 0h96v24H0z" fill="currentColor"/></svg>';
  assert.deepEqual(result((h) => h.replace('<span class="host">Host project</span>', `<span class="host">${word}</span>`).replace("<title>Document title — Host project", "<title>Document title — Example project")), { errors: [], warnings: [], notes: [] }, "the title ends with the name the wordmark carries");
  assert.match(result((h) => h.replace('<span class="host">Host project</span>', `<span class="host">${word}</span>`)).warnings.join(), /the <title> ends with "Host project", but the host project in the top bar is "Example project"/);
  assert.match(result((h) => h.replace(/<p class="credit">[\s\S]*?<\/p>/, "")).warnings.join(), /the footer has no "Made with Docent"/);
  assert.deepEqual(result((h) => h.replace('Made with <a href="https://github.com/sorawit-w/docent">Docent</a>', "Made with Docent")).warnings, [], "plain text is the host's choice");
  assert.deepEqual(result((h) => h.replace(/<p class="credit">[\s\S]*?<\/p>/, "").replace(/Host project/g, "Docent")).warnings, [], "Docent's own pages carry the mark's tile, not the credit");
  assert.match(result((h) => h.replace("The host's tagline, in its own words.", "x".repeat(91))).warnings.join(), /the tagline has 91 characters; it is one line of at most 90/);
  assert.match(result((h) => h.replace("in its own words.", '<a href="#short">in its own words</a>.')).warnings.join(), /the tagline holds markup or a link/);
});

test("the branded sample page is the specimen with a logo, a tagline and the Harbor palette; it is built and passes check", () => {
  const branded = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen-branded.html"), "utf8");
  assert.equal(renderDocument(stampHtml(branded).html).html, branded, "run render and stamp on specimen-branded.html, then commit it");
  const { errors, warnings } = checkDocument(branded);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, checkDocument(specimen).warnings, "the same two warnings as the specimen, which shows one workflow in three forms");
  assert.match(branded, /<html lang="en" data-profile="standard" data-palette="harbor">/);
  assert.equal((branded.match(/<svg class="logo"/g) || []).length, 2, "a light and a dark version of the logo");
  assert.match(branded, /<p class="tagline">[^<]+<\/p>/);
  const strip = (h) => h.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<svg id="dg-[\s\S]*?<\/svg>/g, "").replace(/<header[\s\S]*?<\/header>/, "").replace(/<footer[\s\S]*?<\/footer>/, "").replace(/ data-palette="harbor"/, "");
  assert.equal(strip(branded), strip(specimen), "apart from the palette, the top bar, the footer and the drawings' fallback colors, it is the specimen word for word");
  assert.ok(!/data-palette|class="logo"|class="tagline"/.test(specimen), "the specimen itself stays unbranded");
});

test("the skip link: check warns when it is missing, points elsewhere, or is not the first thing a keyboard reaches", () => {
  const warned = (change) => checkDocument(change(specimen)).warnings.filter((w) => /skip link/.test(w)).join("\n");
  assert.equal(warned((h) => h), "", "the sample page has one, first in <body>, pointing at <main>");
  assert.match(warned((h) => h.replace('<a class="skip" href="#content">Skip to the content</a>\n', "")), /the page has no skip link[\s\S]*<a class="skip" href="#content">/);
  assert.match(warned((h) => h.replace('<main class="shell" id="content">', '<main class="shell">')), /the skip link points at "#content", but <main> has no id/);
  assert.match(warned((h) => h.replace('href="#content">Skip', 'href="#short">Skip')), /points at "#short", but <main> has id="content"/);
  assert.match(warned((h) => h.replace('<a class="skip" href="#content">Skip to the content</a>\n', "").replace("</header>", '</header>\n<a class="skip" href="#content">Skip to the content</a>')), /is not the first thing a keyboard reaches/);
});

test("a column of numbers: check warns when every body cell is a number and the column is not marked with num", () => {
  const table = (head, rows) => `<div class="table-wrap" role="region" aria-label="Counts" tabindex="0"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => (c.startsWith("<") ? c : `<td>${c}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
  const warned = (html) => checkDocument(specimen.replace("</main>", `${html}</main>`)).warnings.filter((w) => /holds numbers only/.test(w));
  assert.deepEqual(checkDocument(specimen).warnings.filter((w) => /holds numbers only/.test(w)), [], "the sample page marks its column of numbers");
  assert.deepEqual(warned(table(["Team", "Bugs", "Share"], [["Web", "1,204", "62%"], ["API", "−38", "4.5%"], ["Docs", "—", "0.5 ms"]])).length, 2);
  assert.match(warned(table(["Team", "Bugs"], [["Web", "12"], ["API", "7"]])).join(), /the table "Counts": the column "Bugs" holds numbers only; add class="num" to its th and td cells/);
  assert.deepEqual(warned(table(["Team", "Bugs"], [["Web", '<td class="num">12</td>'], ["API", '<td class="num">7</td>']])), [], "a marked column");
  for (const [what, cells] of [["dates", ["2026-11-23", "2026-11-24"]], ["versions", ["1.2.3", "0.15.0"]], ["ids", ["BUG-12", "BUG-13"]], ["words and numbers", ["12", "about 7"]], ["empty cells only", ["—", ""]], ["times", ["10:42", "11:05"]]]) {
    assert.deepEqual(warned(table(["Team", "Value"], [["Web", cells[0]], ["API", cells[1]]])), [], what);
  }
  assert.deepEqual(warned(table(["Team", "Bugs"], [["Web", '<td colspan="2">none</td>'], ["API", "7"]])), [], "a merged cell makes the columns unclear, so check does not guess");
  assert.deepEqual(warned(table(["Code", "Meaning"], [['<th scope="row">0</th>', "It worked."], ['<th scope="row">2</th>', "An option is wrong."]])), [], "a row heading names its row, like an id");
});

test("personal data: email addresses and phone numbers are found, and dates, times, versions, IP addresses, thousands, ids and hashes are not", () => {
  const { findPersonal, findTel } = require("../skills/docent/scripts/lib/personal.cjs");
  const found = {
    "jane.doe@company.com": "j***@company.com", "Write to j.smith+bugs@mail.acme.co.uk.": "j***@mail.acme.co.uk",
    "+1 415 555 2671": "+* *** *** **71", "+1 (415) 555-2671": "+* (***) ***-**71", "Call (415) 555-2671.": "(***) ***-**71",
    "415-555-2671": "***-***-**71", "415.555.2671": "***.***.**71", "415 555 2671": "*** *** **71",
    "+44 20 7946 0958": "+** ** **** **58", "020 7946 0958": "*** **** **58", "+66 81 234 5678": "+** ** *** **78", "081 234 5678": "*** *** **78",
  };
  for (const [text, masked] of Object.entries(found)) assert.deepEqual(findPersonal(text).map((f) => f.masked), [masked], text);
  const reserved = ["name@example.com", "ops@mail.example.org", "team@example.net", "a@b.example", "x@host.test", "y@z.invalid", "dev@app.localhost", "555-0100", "(415) 555-0123", "+1 415 555 0199"];
  const nearMisses = ["git@github.com:org/repo.git", "noreply@github.com", "icon@2x.png", "@types/node", "pkg@1.2.3",
    "2026-11-23", "2026-11-23T10:42:00Z", "23.11.2026", "11/23/2026", "10:42:07", "2026-11-23 10:42", "v1.22.333", "10.0.19045.3803",
    "192.168.100.200", "10.0.0.1", "1,234,567,890", "12 345 678", "1 234 567 890", "$1,415.55", "port 8080 and 443",
    "BUG-415-555-2671", "id 4155552671", "a3f9c2e1b4d5", "sha 9f86d081884c7d659a2feaa0c55ad015", "415-555-2671-9", "build 415.555.2671.3"];
  for (const text of [...reserved, ...nearMisses]) assert.deepEqual(findPersonal(text), [], text);
  assert.deepEqual(findTel("tel:+14155552671").map((f) => f.masked), ["+*********71"], "a tel: link is a phone number whatever its shape");
  assert.deepEqual(findTel("tel:+14155550123"), [], "the fake range");
});

test("check warns about personal data in the page text, in a link, and in the data of a diagram or a widget, and names it masked", () => {
  const warned = (html) => checkDocument(html).warnings.filter((w) => /personal data/.test(w));
  assert.deepEqual(warned(specimen), [], "the sample page uses reserved example names only");
  assert.match(warned(specimen.replace("</main>", "<p>Ask Jane at jane.doe@company.com or (415) 555-2671.</p></main>")).join(), /the page text holds what looks like personal data: an email address j\*\*\*@company\.com, a phone number \(\*\*\*\) \*\*\*-\*\*71\. Remove it or mask it, or use a reserved example such as name@example\.com or 555-0100/);
  assert.match(warned(specimen.replace("</main>", '<p><a href="mailto:jane.doe@company.com">Write to Jane</a>, or <a href="tel:+14155552671">call her</a>.</p></main>')).join(), /an email address j\*\*\*@company\.com, a phone number \+\*{9}71/);
  const bare = checkDocument(specimen.replace("</main>", '<p><a href="mailto:ops@company.com?subject=100% done">Write to ops</a>.</p></main>'));
  assert.deepEqual(bare.errors, [], "a bare % in a mailto link does not stop the check");
  assert.match(bare.warnings.join(), /an email address o\*\*\*@company\.com/);
  assert.equal(warned(specimen.replace("</main>", "<p>Write to bugs@example.com, call 555-0142, or see 2026-11-23 10:42.</p></main>")).length, 0, "reserved names and a date pass");
  const inData = renderDocument(specimen.replace('"note": "what went wrong"', '"note": "ask ops@company.com"')).html;
  assert.match(warned(inData).join("\n"), /the data of diagram 1 \("path"\) holds what looks like personal data: an email address o\*\*\*@company\.com/);
  const inWidget = renderDocument(specimen.replace('"Write the steps that lead to the problem.",', '"Write the steps that lead to the problem. Call +44 20 7946 0958.",')).html;
  assert.match(warned(inWidget).join("\n"), /the data of widget 3 \("ready"\) holds what looks like personal data: a phone number \+\*\* \*\* \*\*\*\* \*\*58/);
});

test("a source line: a chart of measured numbers needs one in its caption; check warns about one that is missing, empty or outside a caption", () => {
  const warned = (html) => checkDocument(html).warnings.filter((w) => /source line/.test(w));
  assert.deepEqual(warned(specimen), [], "every chart of the sample page has a source line");
  const bare = specimen.replace(/\n\s*<span class="source">Source: invented sample data\.<\/span>(?=<\/figcaption>)/, "");
  assert.deepEqual(warned(bare), ['[source.chart] figure 4 ("reports-month") is a funnel with no source line; add <span class="source">Source: …</span> to its caption, or write "Source: invented sample data." when the numbers are made up']);
  // A workflow describes a design, not data, so it needs no source line; a chart with no caption is told to get one.
  const flow = '{"id": "flow-x", "label": "A goes to B.", "lanes": [{"id": "l", "name": "Lane"}], "parts": [{"id": "a", "lane": "l", "name": "A"}, {"id": "b", "lane": "l", "name": "B"}], "legs": [{"from": "a", "to": "b", "verb": "send"}]}';
  const bar = '{"id": "bar-x", "kind": "bar", "label": "Two amounts: A has 3 and B has 2.", "scale": {"from": 0, "to": 4, "step": 1, "unit": "reports"}, "rows": [{"name": "A", "value": 3}, {"name": "B", "value": 2}]}';
  const figure = (json, caption) => `<figure><div class="fig" role="region" aria-label="Figure 9, x" tabindex="0">\n<!-- docent:diagram\n${json}\n-->\n<!-- /docent:diagram -->\n</div>${caption}</figure>`;
  const page = (extra) => stampHtml(renderDocument(specimen.replace("</main>", `<section id="x" aria-labelledby="x-h"><h2 id="x-h">X</h2>${extra}</section></main>`)).html).html;
  assert.deepEqual(warned(page(figure(flow, "<figcaption><strong>Figure 9</strong>A flow.</figcaption>"))), []);
  assert.match(warned(page(figure(bar, ""))).join("\n"), /diagram 9 \("bar-x"\) is a bar chart with no source line; give its figure a <figcaption> that ends with <span class="source">/);
  assert.match(warned(page(figure(bar, "").replace(/<\/?figure>/g, ""))).join("\n"), /diagram 9 \("bar-x"\) is a bar chart with no source line; put it in a <figure> with a <figcaption>/);
  assert.deepEqual(warned(page(figure(bar, '<figcaption><strong>Figure 9</strong>Two amounts. <span class="source">Sources: the tracker; the survey, n = 5 reports.</span></figcaption>'))), []);
  // A table of outside data in a figure, with "Table n" and a source line, passes; a source line elsewhere, or with no source, does not.
  const table = '<figure><div class="table-wrap" role="region" aria-label="Table 1, reports" tabindex="0"><table><thead><tr><th scope="col">Area</th><th scope="col" class="num">Reports</th></tr></thead><tbody><tr><th scope="row">Sign-in</th><td class="num">412</td></tr></tbody></table></div><figcaption><strong>Table 1</strong>Reports by area. <span class="source">Source: the team\'s bug tracker, n = 412 reports.</span></figcaption></figure>';
  assert.deepEqual(warned(page(table)), []);
  assert.match(warned(page('<p><span class="source">Source: the tracker.</span></p>')).join("\n"), /stands outside a figure caption/);
  assert.match(warned(page(figure(bar, '<figcaption><strong>Figure 9</strong>Two amounts. <span class="source">Source: </span></figcaption>'))).join("\n"), /a source line is empty \("Source:"\)/);
  assert.match(warned(page(figure(bar, '<figcaption><strong>Figure 9</strong>Two amounts. <span class="source"></span></figcaption>'))).join("\n"), /a source line is empty;/);
});

test("the number rules: check warns about each tested rule, quotes what it found, and reads no code, web address or look-alike", () => {
  const fixture = (name) => fs.readFileSync(path.join(__dirname, "fixtures", `numbers-${name}.html`), "utf8");
  const numbers = (warnings) => warnings.filter((w) => /^numbers, rule/.test(textOf(w)));
  const warned = (name) => numbers(checkDocument(specimen.replace("</main>", `${fixture(name)}</main>`)).warnings);
  assert.deepEqual(numbers(checkDocument(specimen).warnings), [], "the sample page keeps the rules");
  const found = warned("break");
  const expect = [
    [2, '"1.2 s" and "0.95 s" in the column "Time" of the table "Times and counts"'], [2, '"17.981%" in "…the rules The share was 17.981% of reports, and the gro…", "123.456%" in "…reports, and the growth 123.456%. The count fell to -12…"'], [3, '"1090" in the column "Reports"'], [3, '"12400" in a card'],
    [4, '"-12"'], [5, '"45-76"'], [6, '"6 pp"'], [9, '"7/1/2026"'], [10, '"~250"'],
  ];
  assert.equal(found.length, expect.length, found.join("\n"));
  expect.forEach(([rule, text], i) => {
    assert.equal(split(found[i]).id, NUMBER_RULES[rule], "each number rule has its own ID");
    assert.ok(textOf(found[i]).startsWith(`numbers, rule ${rule} (`), found[i]);
    assert.ok(found[i].includes(text), `${found[i]} names ${text}`);
    assert.match(found[i], /\(see "Numbers" in DESIGN\.md\)$/);
  });
  assert.match(found[6], /"6 pp" in "…orts\. The fix rate rose 6 pp\. It closed on 7\/1\/2026,…", "6\.3 pts" in "[^"]*", "1\.2 pts" in "[^"]*"; write "percentage points" in full/, "one warning for each rule, with up to three places");
  assert.deepEqual(warned("keep"), [], "code, a web address, an ISO date, a time, a phone number, a fraction, a share near 0 or 100, a year, a column of mixed measures, and code in a number cell or a card pass");
});

test("a number with its change: the third line of a card, with the direction as a word and the period after against, and no status or color", () => {
  const warned = (html) => checkDocument(specimen.replace("</main>", `<section id="x" aria-labelledby="x-h"><h2 id="x-h">X</h2>${html}</section></main>`)).warnings.filter((w) => /a change line/.test(w));
  const cards = (third) => `<ul class="cards"><li><p class="big">1,090</p><p>bug reports in Q3 2026</p>${third}</li><li><p class="big">46%</p><p>of reports fixed</p></li><li><p class="big">18%</p><p>of reports could not be repeated</p><p class="change"><span class="dir">No change</span> against Q2 2026 (18%)</p></li></ul>`;
  assert.ok(/<p class="change"><span class="dir">Down<\/span>/.test(specimen), "the sample page shows a change line");
  assert.deepEqual(checkDocument(specimen).warnings.filter((w) => /a change line/.test(w)), []);
  assert.deepEqual(warned(cards('<p class="change"><span class="dir">Up</span> 12% against Q2 2026 (973)</p>')), []);
  assert.match(warned('<p class="change"><span class="dir">Up</span> 12% against Q2 2026 (973)</p>').join("\n"), /\("Up 12% against Q2 2026 \(973\)"\) stands outside a card grid; in a sentence, write the same parts with no markup/);
  assert.match(warned(cards("").replace("<p>bug reports in Q3 2026</p>", '<p class="change"><span class="dir">Up</span> 12% against Q2 2026 (973)</p><p>bug reports in Q3 2026</p>')).join("\n"), /comes before the line that says what the card's number counts/);
  assert.match(warned(cards('<p class="change">12% more than in Q2 2026</p>')).join("\n"), /\("12% more than in Q2 2026"\) starts with the direction as a word/);
  assert.match(warned(cards('<p class="change"><span class="dir">Up</span> 12%</p>')).join("\n"), /\("Up 12%"\) starts with the direction as a word \("Up", "Down" or "No change"\) and names the period/);
  for (const bad of ['<p class="change warn">', '<p class="change" style="color: #1a7f37">']) assert.match(warned(cards(`${bad}<span class="dir">Up</span> 12% against Q2 2026 (973)</p>`)).join("\n"), /takes a status or a color; the direction is not a status/, bad);
  assert.match(warned(cards('<p class="change"><span class="state err">Up</span> 12% against Q2 2026 (973)</p>')).join("\n"), /takes a status or a color/);
});

test("footnotes: each mark links to its note, each note links back, and the notes run 1, 2, 3 down the page", () => {
  const mark = (n, extra = "") => `<a class="fn" id="fn-${n}-ref" href="#fn-${n}" aria-label="Note ${n}"${extra}>[${n}]</a>`;
  const note = (n, text = "A detail that most readers skip.") => `<li id="fn-${n}">${text} <a class="back" href="#fn-${n}-ref" aria-label="Back to the text of note ${n}">Back</a></li>`;
  const notes = (start, ...items) => `<ol class="notes"${start > 1 ? ` start="${start}"` : ""} aria-label="Notes to this section">${items.join("")}</ol>`;
  const section = (id, body) => `<section id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">Part ${id}</h2>${body}</section>`;
  const page = (...parts) => specimen.replace(/<a class="fn"[^>]*>\[\d\]<\/a>/g, "").replace(/<ol class="notes"[\s\S]*?<\/ol>/g, "").replace("</main>", `${parts.join("")}</main>`);
  const result = (...parts) => { const r = checkDocument(page(...parts)); return { errors: r.errors.join("\n"), warnings: r.warnings.filter((w) => /footnote|note \d|notes run/.test(w)).join("\n") }; };
  const good = [section("a", `<p>One.${mark(1)} Two.${mark(2)}</p>${notes(1, note(1), note(2))}`), section("b", `<p>Three.${mark(3)}</p>${notes(3, note(3))}`)];
  assert.ok(/<ol class="notes" start="2"/.test(specimen) && /<a class="fn" id="fn-1-ref"/.test(specimen), "the sample page shows footnotes in two sections");
  assert.deepEqual(checkDocument(specimen).errors, []);
  assert.deepEqual(result(...good), { errors: "", warnings: "" }, "marks and notes in two sections, with start, pass");
  assert.match(result(section("a", `<p>One.${mark(1)} Two.${mark(2)}</p>${notes(1, note(1))}`)).errors, /the footnote mark "\[2\]" links to "#fn-2", which is no note in a notes list/, "a missing note");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>${notes(1, `<li id="fn-1">A detail.</li>`)}`)).errors, /note 1 has no link back to its mark; end it with <a class="back" href="#fn-1-ref"/, "a missing link back");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>${notes(1, note(1).replace('href="#fn-1-ref"', 'href="#top"'))}`)).errors, /the link back of note 1 points at "#top", but its mark has id="fn-1-ref"/);
  assert.match(result(section("a", `<p>One.${mark(1).replace('href="#fn-1"', 'href="fn-1"')}</p>${notes(1, note(1))}`)).errors, /the footnote mark "\[1\]" links to "fn-1", which is no note in a notes list \(<ol class="notes">\) on this page; a link to a place on the page starts with #, as in href="#fn-1"/, "a mark's link with no #");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>${notes(1, note(1).replace('href="#fn-1-ref"', 'href="fn-1-ref"'))}`)).errors, /the link back of note 1 points at "fn-1-ref", but its mark has id="fn-1-ref"; write href="#fn-1-ref"/, "a link back with no #");
  assert.match(result(good[0], section("b", `<p>Three.${mark(3)}</p>${notes(1, note(3))}`)).errors, /the notes run 1, 2, 1 down the page; they run 1, 2, 3 … with no gap and no repeat/, "a second list with no start");
  assert.match(result(good[0], section("b", `<p>Three.${mark(3)}</p>${notes(1, note(3))}`)).errors, /the footnote mark "\[3\]" links to note 1; write "\[1\]"/, "the mark's text names the note's number");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>${notes(1, note(1).replace('<li id="fn-1">', '<li id="fn-1" value="9">'))}`)).errors, /the notes run 9 down the page[\s\S]*the footnote mark "\[1\]" links to note 9/, "a note's own value is the number a reader sees");
  assert.equal(result(good[0], section("b", `<p>Three.${mark(3)}</p>${notes(1, note(3).replace('<li id="fn-3">', '<li id="fn-3" value="3">'))}`)).errors, "", "a value that keeps the order passes");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>${notes(1, note(1)).replace('<ol class="notes"', '<ol class="notes" reversed')}`)).errors, /a notes list is reversed/);
  assert.match(result(section("a", `<p>Two.${mark(2)} One.${mark(1)}</p>${notes(1, note(1), note(2))}`)).warnings, /the footnote marks run 2, 1 down the page/, "numbers out of order");
  assert.match(result(section("a", `<p>One.${mark(1)} Again.<a class="fn" href="#fn-1" aria-label="Note 1">[1]</a></p>${notes(1, note(1))}`)).errors, /note 1 has 2 marks; a note has one mark/);
  assert.match(result(section("a", `<p>Text.</p>${notes(1, note(1))}`)).errors, /note 1 has no mark in the text that links to it \(href="#fn-1"\)/);
  const heading = result(section("a", `<h3>A heading${mark(1)}</h3><p>Text.</p>${notes(1, note(1))}`));
  assert.equal(heading.errors, "");
  assert.match(heading.warnings, /the footnote mark "\[1\]" stands in a heading/, "a mark in a heading");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>`), section("b", `<p>Text.</p>${notes(1, note(1))}`)).warnings, /"\[1\]" and its note stand in different sections/);
  assert.match(result(section("a", `<p>One.<a class="fn" id="fn-1-ref" href="#fn-1">[1]</a></p>${notes(1, `<li id="fn-1">A detail. <a class="back" href="#fn-1-ref">Back</a></li>`)}`)).warnings, /has no aria-label; give it aria-label="Note 1"[\s\S]*the link back of note 1 has no aria-label/, "the names a screen reader hears");
  assert.match(result(section("a", `<p>One.${mark(1)}</p>${notes(1, note(1, "word ".repeat(61)))}`)).warnings, /note 1 has 61 words; a note is one to three sentences/);
  assert.match(checkDocument(page(section("a", `<p>One.<sup>${mark(1)}</sup></p>${notes(1, note(1))}`))).errors.join("\n"), /<sup> makes text smaller than its line/, "a raised mark stays refused");
});

test("the list of sources: each citation links to an entry, each entry is cited, in order, with its year and its address as the link's text", () => {
  const entry = (id, text = "Family, A. (2024). \"A title.\" <cite>A journal</cite>, 1(2), 3–4.", url = "https://example.org/a") => `<li id="${id}">${text} <a href="${url}">${url}</a></li>`;
  const page = (cites, ...entries) => specimen.replace(/\(<a href="#src-[^"]*">[^<]*<\/a>\)/g, "").replace(/\n  <section id="sources"[\s\S]*?<\/section>\n/, "\n").replace("</main>", `<section id="x" aria-labelledby="x-h"><h2 id="x-h">X</h2><p>${cites}</p></section><section id="sources" aria-labelledby="sources-h"><h2 id="sources-h">Sources</h2><ul class="sources">${entries.join("")}</ul></section></main>`);
  const result = (...args) => { const r = checkDocument(page(...args)); return { errors: r.errors.join("\n"), warnings: r.warnings.filter((w) => /source|citation/.test(w)).join("\n") }; };
  const cite = (id, words) => `(<a href="#${id}">${words}</a>)`;
  assert.ok(/<ul class="sources">/.test(specimen) && /href="#src-cleveland-1984"/.test(specimen), "the sample page cites a source and lists it");
  assert.deepEqual(result(`${cite("src-cleveland-1984", "Cleveland and McGill, 1984")} ${cite("src-family-2024", "Family, 2024")}`, entry("src-cleveland-1984"), entry("src-family-2024")), { errors: "", warnings: "" });
  assert.match(result(cite("src-nobody-2020", "Nobody, 2020"), entry("src-family-2024")).errors, /the citation "Nobody, 2020" links to "#src-nobody-2020", which is no entry in the list of sources/, "a citation with no entry");
  assert.match(result('(<a href="src-family-2024">Family, 2024</a>)', entry("src-family-2024")).errors, /links to "src-family-2024", which is no entry[^\n]*starts with #, as in href="#src-family-2024"/, "a citation with no #");
  assert.match(result(cite("src-family-2024", "Family, 2024"), entry("src-family-2024"), entry("src-other-2020")).warnings, /the source "src-other-2020" is not cited in the text/, "an entry never cited");
  assert.match(result(`${cite("src-family-2024", "F")} ${cite("src-cleveland-1984", "C")}`, entry("src-family-2024"), entry("src-cleveland-1984")).warnings, /the list of sources is not in order: family 2024, cleveland 1984; order it by the first family name, then the year/, "entries out of order");
  assert.match(result(`${cite("src-family-2024a", "F")} ${cite("src-family-2021", "F")}`, entry("src-family-2024a"), entry("src-family-2021")).warnings, /not in order: family 2024a, family 2021/, "the same name orders by year");
  assert.match(result(cite("src-family-2024", "F"), entry("src-family-2024", "Family, A. \"A title.\"", "https://example.org/a").replace('">https://example.org/a</a>', '">this study</a>')).warnings, /has no year in brackets[\s\S]*a link in the source "src-family-2024" reads "this study"; paper has no link, so write the address as the link's text/, "an address hidden behind words, and no year");
  assert.equal(result(cite("src-family-2024", "F"), entry("src-family-2024", "Family, A. (no date). \"A title.\"")).warnings, "", "(no date) is a year");
  assert.match(checkDocument(page(cite("src-family-2024", "F"), entry("src-family-2024")).replace("</main>", '<ul class="sources"><li>X</li></ul></main>')).warnings.join("\n"), /the page has 2 lists of sources; it has one/);
});

test("\"Method and limits\" holds its four parts in order; a page without it gets no warning", () => {
  const page = (parts) => specimen.replace("</main>", `<section id="method" aria-labelledby="method-h"><h2 id="method-h">Method and limits</h2>${parts.map((p) => `<h3>${p}</h3><p>Text.</p>`).join("")}</section></main>`);
  const warned = (parts) => checkDocument(page(parts)).warnings.filter((w) => /Method and limits/.test(w));
  assert.deepEqual(warned(["Method", "Data", "What was left out", "How sure the result is"]), []);
  assert.match(warned(["Method", "What was left out", "Data", "How sure the result is"]).join("\n"), /"Method and limits" has the block headings "method", "what was left out", "data", "how sure the result is"; it holds four, in this order/, "the four parts out of order");
  assert.match(warned(["Method", "Data", "How sure the result is"]).join("\n"), /it holds four, in this order/, "a part missing");
  assert.deepEqual(checkDocument(specimen).warnings.filter((w) => /Method and limits/.test(w)), [], "no section, no warning");
});

test("status words: each listed word in its own state passes; a listed word in another state warns, unless its label adds words", () => {
  const page = (...states) => specimen.replace("</main>", `<section id="w" aria-labelledby="w-h"><h2 id="w-h">W</h2><p>${states.map(([s, l]) => `<span class="state ${s}">${l}</span>`).join(" ")}</p></section></main>`);
  const warned = (...states) => checkDocument(page(...states)).warnings.filter((w) => /takes the state/.test(w));
  const right = [["ok", "Done"], ["ok", "Fixed"], ["ok", "Accepted"], ["ok", "Approved"], ["info", "In progress"], ["info", "Superseded"], ["info", "Superseded by record 15"], ["info", "Rejected"], ["plan", "Planned"], ["plan", "Proposed"], ["plan", "Open question"], ["plan", "Not decided yet"], ["err", "Blocked"]];
  assert.deepEqual(warned(...right), [], "every word of the table in its right state");
  const wrong = warned(["warn", "In progress"], ["err", "Rejected"]);
  assert.equal(wrong.length, 2);
  assert.match(textOf(wrong[0]), /^"In progress" takes the state info \(under way, nothing is wrong\), not warn; write warn with words that say why, such as "In progress, late"/);
  assert.match(textOf(wrong[1]), /^"Rejected" takes the state info \(closed; nothing is broken\), not err/);
  assert.deepEqual(warned(["warn", "In progress, late"]), [], "a longer label may hold a judgment");
  assert.match(warned(["err", "Superseded by this record"]).join("\n"), /"Superseded by this record" takes the state info/, "the word then by …");
  assert.match(warned(["ok", "open question"]).join("\n"), /takes the state plan \(not yet\), not ok/, "a word in lowercase");
});

test("key findings: each item opens with one <strong> sentence; check warns about a missing lead, no period, a long lead, 1 or 7 items, no label, and a link in the lead", () => {
  const item = (lead, support = "412 of 1,090 reports, 38%.") => `<li>${lead == null ? "" : `<strong>${lead}</strong> `}${support}</li>`;
  const page = (items, attrs = ' aria-label="Key findings"') => specimen.replace("</main>", `<section id="f" aria-labelledby="f-h"><h2 id="f-h">What we found</h2><ol class="findings"${attrs}>${items.join("")}</ol></section></main>`);
  const warned = (...args) => checkDocument(page(...args)).warnings.filter((w) => /finding/.test(w)).join("\n");
  const two = [item("Sign-in had the most bug reports."), item("About one report in five could not be repeated.")];
  assert.equal(warned(two), "", "a good list");
  assert.equal(warned([...two, item("Ask for the steps.", 'Reports with steps were repeated more often. <span class="state plan">Proposed</span> <a href="#f">The evidence</a>')]), "", "a state and a link after the lead");
  assert.match(warned([two[0], item(null, "Sign-in had the most bug reports.")]), /item 2 of the findings list "Key findings" does not start with <strong>; each key finding starts with one sentence in <strong>/, "a missing <strong>");
  assert.match(warned([two[0], item("Sign-in")]), /the lead sentence of item 2 of the findings list "Key findings" \("Sign-in"\) does not end with a period/, "a lead with no period");
  assert.match(warned([two[0], item(`${"word ".repeat(25)}more.`)]), /has 26 words; it has at most 25/, "a lead of 26 words");
  assert.match(warned([two[0]]), /the findings list "Key findings" has 1 item; it holds 2 to 6/, "one item");
  assert.match(warned(Array(7).fill(two[0])), /has 7 items; it holds 2 to 6/, "seven items");
  assert.match(warned(two, ""), /a findings list \(<ol class="findings">\) has no aria-label/, "no aria-label");
  assert.match(warned([two[0], item('Sign-in had <a href="#f">the most reports</a>.')]), /\("Sign-in had the most reports\."\) holds a link or a state/, "a link inside the lead");
  assert.match(warned([two[0], item('Sign-in is done. <span class="state ok">Done</span>')]), /holds a link or a state/, "a state inside the lead");
});

test("a total row: a <tfoot> row with a row heading; data-sum adds up its column, exactly or within the allowance for rounded parts", () => {
  const rows = [["Sign-in", "412", "58"], ["Search", "268", "61"], ["Checkout", "231", "49"], ["Settings", "97", "22"], ["Profile", "64", "6"], ["Help pages", "18", "0"]];
  const row = (cells, head = true) => `<tr>${cells.map((c, i) => (i === 0 && head ? `<th scope="row">${c}</th>` : `<td class="num">${c}</td>`)).join("")}</tr>`;
  const table = (body, foot) => `<section id="t" aria-labelledby="t-h"><h2 id="t-h">T</h2><div class="table-wrap" role="region" aria-label="Bug reports by area" tabindex="0"><table><thead><tr><th scope="col">Area</th><th scope="col" class="num">Reports</th><th scope="col" class="num">Could not be repeated</th></tr></thead><tbody>${body.map((r) => row(r)).join("")}</tbody>${foot == null ? "" : `<tfoot>${foot}</tfoot>`}</table></div></section>`;
  const warned = (body, foot) => checkDocument(specimen.replace("</main>", `${table(body, foot)}</main>`)).warnings.filter((w) => /Bug reports by area/.test(w) && !/^\[visual\./.test(w)).join("\n");
  const total = (a, b, sum = "data-sum", head = '<th scope="row">All areas</th>') => `<tr>${head}<td class="num" ${sum}>${a}</td><td class="num" ${sum}>${b}</td></tr>`;
  assert.equal(warned(rows, total("1,090", "196")), "", "a right sum");
  assert.match(warned(rows, total("1,090", "195")), /the total 195 in column "Could not be repeated" is not the sum of its column, 196/, "a wrong sum");
  const shares = [["A", "16.7%", "1"], ["B", "16.7%", "1"], ["C", "16.7%", "1"], ["D", "16.7%", "1"], ["E", "16.7%", "1"], ["F", "16.7%", "1"]]; // 100.2
  assert.match(warned(shares, total("100.0%", "6")), /the total 100.0% in column "Reports" is not the sum of its column, 100.2/, "plain data-sum is exact");
  assert.equal(warned(shares, total("100.0%", "6", 'data-sum="rounded"')), "", "a rounded sum within its allowance: 6 rows of 0.05");
  assert.match(warned(shares, total("99.8%", "6", 'data-sum="rounded"')), /the total 99.8% in column "Reports" is not the sum of its column, 100.2, within 0.3 for rounded parts/, "a rounded sum outside its allowance");
  assert.match(warned([...rows.slice(0, 5), ["Help pages", "about 18", "0"]], total("1,090", "196")), /the cell "about 18" in column "Reports" is not a number, so check cannot add up the column/, "a body cell that is not a number");
  assert.equal(warned(rows, total("1,090", "196", "")), "", "no data-sum, no sum test");
  assert.match(warned([...rows, ["Total", "1,090", "196"]]), /the last body row "Total" reads as a total; put it in a <tfoot>/, "a total in the body");
  assert.match(warned([...rows, ["All areas", "1,090", "196"]]), /the last body row "All areas" reads as a total/);
  assert.match(warned(rows, total("1,090", "196", "data-sum", '<td class="num"></td>')), /a row of its <tfoot> has no row heading in words/, "no row heading");
  assert.match(warned(rows, total("1,090", "196").repeat(3)), /has 3 rows in its <tfoot>; it holds one or two/);
  assert.equal(checkDocument(specimen).warnings.filter((w) => /total|tfoot/.test(w)).length, 0);
});

test("room on the line: check warns about a column of sentences in a table with too many columns for its profile", () => {
  const { frameOf, estimateColumns } = require("../skills/docent/scripts/lib/measure.cjs");
  assert.deepEqual([frameOf("standard"), frameOf("task"), frameOf("standard", true), frameOf("reference"), frameOf("brief")].map((f) => f.block), [828, 828, 898, 1120, 1120], "the block widths of kit.css");
  assert.equal(frameOf("deck"), null, "a deck's slides are checked on their own");
  const prose = ["The maintainers ask for the exact steps, because nobody could repeat the bug yet.", "Wait for the reply, then add the version and the operating system you use.", "Close the report when the fix ships, and say which version fixed it for you."];
  const table = (cols, { cell = (r, c) => `<td>${prose[(r + c) % 3]}</td>`, attrs = "", wrap = (t) => t } = {}) => wrap(`<div class="table-wrap" role="region" aria-label="Next steps" tabindex="0"><table${attrs}><thead><tr>${Array.from({ length: cols }, (_, c) => `<th scope="col">${c ? `Step ${c}` : "Result"}</th>`).join("")}</tr></thead><tbody>${["Confirmed", "Needs steps", "Not a bug"].map((name, r) => `<tr><th scope="row">${name}</th>${Array.from({ length: cols - 1 }, (_, c) => cell(r, c)).join("")}</tr>`).join("")}</tbody></table></div>`);
  const warned = (html, profile = 'data-profile="standard"') => checkDocument(specimen.replace('<html lang="en" data-profile="standard">', `<html lang="en" ${profile}>`).replace("</main>", `${html}</main>`)).warnings.filter((w) => /table\.measure/.test(w));
  assert.deepEqual(warned(""), [], "the sample page keeps its cells short");
  const five = warned(table(5));
  assert.equal(five.length, 4, "each of the four columns of sentences");
  assert.match(five[0], /the table "Next steps": the column "Step 1" holds cells of up to 15 words, but at the width of the "standard" profile a line of it has room for about 1\d characters/);
  assert.match(five[0], /Use fewer columns, or move the sentences out of the table: one section for each row with its facts in a margin note, a definition list, or a card grid/);
  assert.deepEqual(warned(table(3)), [], "the same sentences in fewer columns have room");
  assert.deepEqual(warned(table(5, { cell: (r, c) => (c === 0 ? `<td>${prose[r]}</td>` : `<td>${["Web team", "Today", "Open"][c - 1]}</td>`) })), [], "one column of sentences beside short facts gets most of the width");
  assert.equal(warned(table(5, { cell: (r, c) => `<td class="num">${prose[(r + c) % 3]}</td>` })).length, 0, "a column of numbers is never a column of sentences");
  assert.equal(warned(table(5, { cell: (r, c) => `<td><code>${prose[(r + c) % 3]}</code></td>` })).length, 0, "a cell that is code only");
  assert.equal(warned(table(5, { wrap: (t) => `<details class="dg-words"><summary>The diagram in words</summary>${t}</details>` })).length, 0, "render writes a diagram's table in words");
  assert.equal(warned(table(5, { cell: (r, c) => (r === 0 && c === 0 ? `<td colspan="2">${prose[0]}</td>` : `<td>${prose[(r + c) % 3]}</td>`) })).length, 0, "a merged cell makes the columns unclear, so check does not guess");
  const standard = warned(table(4)), reference = warned(table(4), 'data-profile="reference"');
  assert.equal(standard.length, 3, "4 columns are too many for sentences in Standard");
  assert.deepEqual(reference, [], "Reference has a block of 1120px, so the same table has room");
  const head = ["Result", "Step 1", "Step 2", "Step 3"], rows = ["Confirmed", "Needs steps", "Not a bug"].map((name, r) => [{ tag: "th", text: name }, ...[0, 1, 2].map((c) => ({ tag: "td", text: prose[(r + c) % 3] }))]);
  const [narrow, wide] = [frameOf("standard"), frameOf("reference")].map((f) => estimateColumns(head, rows, f)[1].chars);
  assert.ok(narrow < 30 && wide >= 30 && wide > narrow, `Reference gives a wider estimate: ${narrow} and ${wide} characters`);
  assert.match(warned(table(4), 'data-profile="standard" data-text="large"')[0] || "", /room for about \d+ characters/, "large text grows the block and the letters alike, so the line holds as few characters");
});

test("room on the line: the warning names a column of links only and a row heading repeated on several rows, and the regrouped table passes", () => {
  const rows = [
    ["Accounts", "Can one person hold two accounts?", "Yes, but each account needs its own email address and its own password.", "Each account is billed on its own.", "#types", "Account types"],
    ["Accounts", "Can an account change its owner?", "Yes, the owner names a new owner in the settings, and the new owner accepts.", "The old owner keeps read access.", "#owners", "Owners"],
    ["Billing", "When is a plan charged?", "Each plan is charged on the first day of each month for the month ahead.", "A plan bought mid-month is charged in part.", "#dates", "Billing dates"],
    ["Billing", "Can a charge be refunded?", "Yes, within 14 days of the charge, when the plan was not used in that time.", "The refund goes back to the same card.", "#refunds", "Refunds"],
  ];
  const narrow = `<div class="table-wrap" role="region" aria-label="Questions and answers" tabindex="0"><table><thead><tr><th scope="col">Area</th><th scope="col">Question</th><th scope="col">Answer</th><th scope="col">What it changes</th><th scope="col">Read more</th></tr></thead><tbody>${rows.map(([area, q, a, change, href, link]) => `<tr><th scope="row">${area}</th><td>${q}</td><td>${a}</td><td>${change}</td><td><a href="${href}">${link}</a></td></tr>`).join("")}</tbody></table></div>`;
  const grouped = ["Accounts", "Billing"].map((area) => `<h3>${area}</h3><div class="table-wrap" role="region" aria-label="Questions about ${area.toLowerCase()}" tabindex="0"><table><thead><tr><th scope="col">Question</th><th scope="col">Answer</th></tr></thead><tbody>${rows.filter((r) => r[0] === area).map(([, q, a, , href]) => `<tr><th scope="row"><a href="${href}">${q}</a></th><td>${a}</td></tr>`).join("")}</tbody></table></div>`).join("");
  const warned = (html) => checkDocument(specimen.replace("</main>", `<section id="faq" aria-labelledby="faq-h"><h2 id="faq-h">Questions</h2>${html}</section></main>`)).warnings.filter((w) => /table\.measure/.test(w));
  const found = warned(narrow);
  assert.ok(found.length >= 1, "the answers are sentences in a table of 5 columns");
  assert.match(found[0], /The column "Read more" holds only links: put each link on its row heading or on the cell it explains, and drop the column\./);
  assert.match(found[0], /2 rows start with "Accounts": group such rows under one heading, a block heading or a closed section for each group/);
  assert.deepEqual(warned(grouped), [], "one block heading for each area, the link on the question, and two columns: the answers have room");
});

test("a quote with its speaker: check warns about a blockquote alone, no speaker, typed quotation marks, more than 80 words, and code in the speaker line", () => {
  const quote = (said = "<p>I wrote the steps twice, and nobody could repeat the bug.</p>", speaker = "<figcaption>P3, tester</figcaption>") => `<figure class="quote"><blockquote>${said}</blockquote>${speaker}</figure>`;
  const warned = (...blocks) => checkDocument(specimen.replace("</main>", `<section id="q" aria-labelledby="q-h"><h2 id="q-h">Q</h2>${blocks.join("")}</section></main>`)).warnings.filter((w) => /quote|speaker/.test(w)).join("\n");
  assert.equal(warned(quote(), quote("<p>Setup never felt finished.</p><p>We gave up in week two.</p>", "<figcaption>Starter, 9 seats</figcaption>")), "", "two good quotes, one with two paragraphs");
  assert.equal(warned("<p>Five teams said setup <q>never felt finished</q>.</p>"), "", "a short phrase in a <q>");
  assert.match(warned("<blockquote><p>I wrote the steps twice.</p></blockquote>"), /a <blockquote> stands outside a quote figure; a quote needs its speaker/, "a blockquote alone");
  assert.match(warned(quote(undefined, "")), /the quote "I wrote the steps twice, and nobody…" has no speaker after its <blockquote>; a quote needs its speaker/, "no speaker");
  assert.match(warned(quote(undefined, "<figcaption></figcaption>")), /has no speaker/, "an empty speaker line");
  assert.match(warned(quote("<p>“I wrote the steps twice.”</p>")), /starts or ends with a quotation mark; the kit draws the quotation marks/, "typed curly marks");
  assert.match(warned(quote('<p>"I wrote the steps twice."</p>')), /starts or ends with a quotation mark/, "typed straight marks");
  assert.equal(warned(quote("<p>We call it the teams’ calendar.</p>")), "", "an apostrophe is not a quotation mark");
  assert.match(warned(quote(`<p>${"word ".repeat(80)}more.</p>`)), /has 81 words; a quote has at most 80/, "81 words");
  assert.equal(warned(quote(`<p>${"word ".repeat(79)}more.</p>`)), "", "80 words pass");
  assert.match(warned(quote(undefined, "<figcaption><code>P3</code>, tester</figcaption>")), /the speaker line of the quote "I wrote the steps twice, and nobody…" holds a <code> or a link; it is plain text/, "a <code> in the speaker line");
  assert.match(warned(quote("<p>One.</p></blockquote><blockquote><p>Two.</p>")), /holds more than one <blockquote>; a quote figure holds one <blockquote> and its speaker/, "two blockquotes");
  assert.match(warned(quote("<p>One.</p><table><tr><td>1</td></tr></table>")), /holds a table/, "a table in a quote");
});

test("a visual that may be missing: check hints at a table of amounts, a table over equally spaced periods, and a long section with nothing to look at", () => {
  const table = (rows, head = ["Area", "Reports"], label = "Reports by area") => `<div class="table-wrap" role="region" aria-label="${label}" tabindex="0"><table><thead><tr>${head.map((h, i) => `<th scope="col"${i ? ' class="num"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(([name, ...cells]) => `<tr><th scope="row">${name}</th>${cells.map((c) => `<td${/^[\d.,%−-]+$/.test(c) ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const section = (...blocks) => `<section id="v" aria-labelledby="v-h"><h2 id="v-h">Where the reports came from</h2>${blocks.join("")}</section>`;
  const hints = (html, base = specimen) => checkDocument(base.replace("</main>", `${html}</main>`)).warnings.filter((w) => /^\[visual\./.test(w));
  const areas = [["Sign-in", "412"], ["Search", "268"], ["Checkout", "231"], ["Settings", "97"]];

  const bar = hints(section(table(areas)));
  assert.equal(bar.length, 1);
  assert.match(bar[0], /^\[visual\.bar\] the table "Reports by area" in the section "Where the reports came from": 4 rows, each a name and one amount \(the column "Reports"\)\. When the reader asks which is largest, a bar chart \("kind": "bar"\)/);
  assert.equal(hints(section(table(areas.map(([a, n]) => [a, n, `${Math.round(n / 10)}%`]), ["Area", "Reports", "Share"]))).length, 1, "an amount and its share in percent is still a bar chart");
  assert.deepEqual(hints(section(table(areas.slice(0, 2)))), [], "two amounts are a sentence");
  assert.deepEqual(hints(section(table(areas.map(([a, n]) => [a, "The team checks it.", n]), ["Area", "What it means", "Reports"]))), [], "a column of words: the rows matter for more than their size");
  assert.deepEqual(hints(section(table(areas.map(([a, n]) => [a, n, String(n * 2)]), ["Area", "Reports", "Comments"]))), [], "two amounts in each row");
  assert.deepEqual(hints(section(table(areas.map(([a], i) => [a, String(i + 1)]), ["Area", "Rank"]))), [], "a count 1, 2, 3 is an order, not an amount");
  assert.deepEqual(hints(section(table([["Install", "152"], ["Settings", "117"], ["Search", "84"], ["Export", "51"]]))), [], "a chart on the page already holds these numbers");
  assert.equal(hints(section('<figure><div class="fig" role="region" aria-label="Figure 9" tabindex="0"></div></figure>', table(areas))).length, 1, "a figure of other data in the same section does not stand for this table");
  assert.deepEqual(hints(section(`<details><summary>The numbers</summary>${table(areas)}</details>`)), [], "the exact numbers in a closed section");
  assert.deepEqual(hints(section(table(areas)), fs.readFileSync(path.join(__dirname, "fixtures", "deck.html"), "utf8")).filter((w) => /visual/.test(w)), [], "a deck is never hinted");

  const months = [["Jan 2026", "86"], ["Feb 2026", "94"], ["Mar 2026", "109"], ["Apr 2026", "131"], ["May 2026", "128"]];
  const line = hints(section(table(months, ["Month", "Reports"], "Reports by month")));
  assert.equal(line.length, 1, "not also a bar chart");
  assert.match(line[0], /^\[visual\.line\] the table "Reports by month" in the section "Where the reports came from": its first column holds 5 equally spaced points in time, from "Jan 2026" to "May 2026", and the column "Reports" holds numbers\. When the reader asks how the numbers changed over time, a line chart \("kind": "line"\)/);
  assert.equal(hints(section(table([["Q3 2025", "4", "1"], ["Q4 2025", "6", "2"], ["Q1 2026", "9", "2"]], ["Quarter", "Open", "Closed"]))).length, 1, "quarters across a year, two series");
  assert.deepEqual(hints(section(table([["1 July 2026", "96"], ["3 July 2026", "104"], ["20 July 2026", "99"]], ["Day", "Reports"]))).filter((w) => /visual\.line/.test(w)), [], "dates that are not equally spaced");
  assert.deepEqual(hints(section(table([["08:12", "A deploy started"], ["08:31", "Alerts fired"], ["09:40", "Fixed"]], ["Time", "What happened"]))), [], "a timeline of events has no numbers");

  const para = `<p>${"The team read each report and wrote down where it came from and what it asked for. ".repeat(6)}</p>`;
  const prose = hints(section(para.repeat(5)));
  assert.equal(prose.length, 1);
  assert.match(prose[0], /^\[visual\.prose\] the section "Where the reports came from" has 510 words of paragraphs and nothing to look at\. Name the reader's question for it/);
  assert.deepEqual(hints(section(para.repeat(3))), [], "306 words is not too long");
  assert.deepEqual(hints(section(para.repeat(5), "<ul><li>One point.</li><li>Another point.</li></ul>")), [], "a list breaks up the text");
  assert.deepEqual(checkDocument(specimen).warnings.filter((w) => /^\[visual\./.test(w)), [], "the sample page gets no hint");
});

test("a table or a section kept as text on purpose: data-no-visual with a reason turns the hint into a note", () => {
  const table = (attrs = "", rows = [["Free", "0"], ["Team", "12"], ["Business", "30"], ["Enterprise", "55"]]) => `<div class="table-wrap" role="region" aria-label="Prices" tabindex="0"><table${attrs}><thead><tr><th scope="col">Plan</th><th scope="col" class="num">Price</th></tr></thead><tbody>${rows.map(([name, n]) => `<tr><th scope="row">${name}</th><td class="num">${n}</td></tr>`).join("")}</tbody></table></div>`;
  const section = (attrs, ...blocks) => `<section id="k" aria-labelledby="k-h"${attrs}><h2 id="k-h">Plans and prices</h2>${blocks.join("")}</section>`;
  const run = (html) => { const r = checkDocument(specimen.replace("</main>", `${html}</main>`)); return { hints: r.warnings.filter((w) => /^\[visual\./.test(w)), notes: r.notes.filter((n) => /^\[visual\./.test(n)) }; };

  assert.deepEqual(run(section("", table(' data-no-visual="Readers look up one price"'))), { hints: [], notes: ['[visual.bar] the table "Prices" in the section "Plans and prices" is kept as text on purpose ("Readers look up one price").'] }, "a marked table gives a note");
  for (const attrs of [' data-no-visual=""', ' data-no-visual="  "', " data-no-visual"]) {
    const { hints, notes } = run(section("", table(attrs)));
    assert.equal(hints.length, 1, `a mark with no reason (${attrs}) warns`);
    assert.match(hints[0], /^\[visual\.bar\] the table "Prices".* It has data-no-visual with no reason, so the hint stays/);
    assert.deepEqual(notes, []);
  }
  const plain = run(section("", table()));
  assert.equal(plain.hints.length, 1, "an unmarked table still warns");
  assert.doesNotMatch(plain.hints[0], /with no reason/);
  assert.deepEqual(run(section("", table(' data-no-visual="Readers look up one price"', [["Free", "0"], ["Team", "12"]]))), { hints: [], notes: [] }, "a mark on a table that no hint applies to does nothing");

  const para = `<p>${"The team read each report and wrote down where it came from and what it asked for. ".repeat(6)}</p>`.repeat(5);
  assert.deepEqual(run(section(' data-no-visual="A story told in order; no kind fits"', para)), { hints: [], notes: ['[visual.prose] the section "Plans and prices" is kept as text on purpose ("A story told in order; no kind fits").'] }, "a marked section gives a note");
  assert.match(run(section(' data-no-visual=""', para)).hints[0], /^\[visual\.prose\] the section "Plans and prices" has 510 words.* with no reason/);
});
