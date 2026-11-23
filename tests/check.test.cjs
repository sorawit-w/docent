const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { VERSION, stampHtml, cssBlock } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");

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
  assert.ok(template.length < 16000, `the starting page has ${template.length} bytes; an agent reads all of it, so it stays below 16000`);
  const made = renderDocument(template);
  assert.deepEqual([...made.results, ...made.widgets].map((r) => [r.id, r.error, r.warnings.length]), [["glance", null, 0], ["steps", null, 0], ["case", null, 0], ["list", null, 0], ["choice", null, 0], ["where", null, 0]]);
  assert.deepEqual(made.places, { count: 2, unknown: [], clash: [] }, "render fills both places of the value picker");
  const stamped = stampHtml(made.html);
  assert.deepEqual(stamped.actions, ["styles added", "script added"]);
  assert.deepEqual(checkDocument(stamped.html), { errors: [], warnings: [] });
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
  assert.deepEqual(checkDocument(page).errors, ["the document has no kit styles; run stamp", "the document has no kit script; run stamp"]);
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
  assert.deepEqual(style(":root { --host-accent: #a21caf; --host-accent-dark: #ec6cf7; --host-ink: #4d0055; }"), { errors: [], warnings: style("").warnings });
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
  assert.deepEqual(checkDocument(reference), { errors: [], warnings: [] }, "the reference sample passes check");
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
  assert.deepEqual(result((h) => h.replace('<span class="host">', `<span class="host">${shaded}`)), { errors: [], warnings: [] }, "a host's logo is the one place where a gradient is allowed");
  assert.match(result((h) => h.replace("</main>", `<p>${shaded}</p></main>`)).errors.join("\n"), /a logo stands outside the top bar[\s\S]*<linearGradient> is used; the page is flat/);
  const word = '<svg class="logo" viewBox="0 0 96 24" width="96" height="24" role="img" aria-label="Example project"><path d="M0 0h96v24H0z" fill="currentColor"/></svg>';
  assert.deepEqual(result((h) => h.replace('<span class="host">Host project</span>', `<span class="host">${word}</span>`).replace("<title>Document title — Host project", "<title>Document title — Example project")), { errors: [], warnings: [] }, "the title ends with the name the wordmark carries");
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
