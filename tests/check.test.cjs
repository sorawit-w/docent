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
  assert.match(errorsOf((h) => h.replace('<html lang="en">', "<html>")), /<html> has no lang/);
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

test("check tests the host tokens: contrast for a hex color, and a warning for a kit token set by hand", () => {
  const style = (css) => checkDocument(specimen.replace("</head>", `<style>${css}</style></head>`));
  assert.deepEqual(style(":root { --host-accent: #0b6e4f; --host-accent-dark: #6fd3a8; --host-ink: #0b3d2e; }"), { errors: [], warnings: style("").warnings });
  assert.match(style(":root { --host-accent: #f2b824; }").errors.join(), /--host-accent #f2b824 has a contrast of 1\.\d\d:1 on #fbfbfe and 1\.\d\d:1 on #f2f3f9; text needs 4\.5:1/);
  assert.match(style(":root { --host-accent-dark: #2f3fd0; }").errors.join(), /--host-accent-dark #2f3fd0 has a contrast of/);
  assert.match(style(":root { --host-accent: rebeccapurple; }").warnings.join(), /check tests the contrast of a hex color only/);
  assert.match(style(":root { --primary: #0b6e4f; }").warnings.join(), /a style sets --primary; the kit sets it in four places/);
  assert.match(errorsOf((h) => h.replace('<html lang="en">', '<html lang="en" data-theme="sepia">')), /a fixed theme is "light" or "dark"/);
  assert.equal(errorsOf((h) => h.replace('<html lang="en">', '<html lang="en" data-theme="light">')), "");
});
