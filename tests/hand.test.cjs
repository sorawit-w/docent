// Hand-drawn figures: a drawing that the agent draws by hand, for a type in the hand-drawn list, under the contract that check tests.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { checkDrawing, TYPES } = require("../skills/docent/scripts/lib/hand.cjs");

const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
const figure = fs.readFileSync(path.join(__dirname, "fixtures", "hand-fishbone.html"), "utf8");
const page = (change = (f) => f) => specimen.replace('<section id="report"', `${change(figure)}<section id="report"`);
const swap = (from, to) => (f) => { assert.ok(f.includes(from), `the fixture holds ${from}`); return f.replace(from, to); };
const hand = (errors) => errors.filter((e) => /hand-drawn|no diagram block/.test(e));

test("a valid hand-drawn fishbone passes check, and check names it as hand-drawn and asks for a look in a browser", () => {
  const { errors, warnings } = checkDocument(page());
  assert.deepEqual(errors, [], "its 12px notes and its own style are not the author's content, so the page rules for 14px text do not apply");
  assert.deepEqual(warnings.filter((w) => /hand-drawn/.test(w)), ["Figure 9, why a bug report cannot be repeated is hand-drawn (fishbone); check cannot see its layout, so open the page in a browser in light and in dark, at 375px and in print preview, and look at it. Tell the user this figure is hand-drawn"]);
  assert.deepEqual(TYPES, ["quadrant", "nested", "venn", "fishbone", "wardley-map", "user-journey", "story-map"]);
  for (const type of TYPES) assert.deepEqual(hand(checkDocument(page(swap('data-type="fishbone"', `data-type="${type}"`))).errors), [], `${type} is in the list`);
});

// One broken page for each rule. Each fails with its own message, and with that message only.
const BROKEN = [
  ["a hex color", swap("stroke:var(--muted,#575d75);stroke-width:1}", "stroke:#cf222e;stroke-width:1}"), /rule 2, page tokens only: a <style> rule for "#hd-repeat \.cause" has stroke="#cf222e"; a color in a hand-drawn figure is a drawing token: var\(--text\), var\(--muted\), var\(--line\), var\(--bg\) or var\(--fig\), none or currentColor/],
  ["10px text", swap("font-size:12px", "font-size:10px"), /rule 3, no text under 12px: a <style> rule for "#hd-repeat \.note" has font-size="10px"; no text in a drawing is under 12px/],
  ["a web font", swap("<style>\n", "<style>\n@font-face{font-family:Inter;src:url(https://example.com/inter.woff2)}\n"), /rule 5, system fonts and two weights: a <style> holds @font-face; a drawing's style holds plain rules only/],
  ["a font by name", swap('<text class="head" x="556" y="146">', '<text class="head" font-family="Inter" x="556" y="146">'), /rule 5, system fonts and two weights: <text> has font-family="Inter"; a drawing takes the page's sans-serif/],
  ["an external link", swap('<rect class="box"', '<use href="https://example.com/bone.svg#b"/><rect class="box"'), /rule 6, no network and no script: <use> has href="https:\/\/example.com\/bone.svg#b"; an href points inside the drawing/],
  ["an image", swap('<rect class="box"', '<image href="#x" width="8" height="8"/><rect class="box"'), /rule 6, no network and no script: <image> is not allowed: an image loads a file/],
  ["an event handler", swap('<rect class="box"', '<rect class="box" onclick="go()"'), /rule 6, no network and no script: <rect> has the event attribute "onclick", which runs code/],
  ["a missing title", swap('<title id="hd-repeat-t">Why a bug report cannot be repeated</title>\n', ""), /rule 8, an accessible name: the first element in the <svg> is not a <title>; the title comes first/],
  ["a missing description", (f) => f.replace(/<desc id="hd-repeat-d">[^<]*<\/desc>\n/, ""), /rule 8, an accessible name: the <svg> has no <desc>/],
  ["no table in words", (f) => f.replace(/<details class="dg-words">[\s\S]*?<\/details>\n/, ""), /rule 9, the diagram in words: the figure has no <details class="dg-words">/],
  ["no type", swap(' data-type="fishbone"', ""), /rule 1, a marker: the <svg> has data-drawn="hand" and no data-type; name the type, one of "quadrant", "nested", "venn", "fishbone", "wardley-map", "user-journey", "story-map"/],
  ["a type not on the list", swap('data-type="fishbone"', 'data-type="mind-map"'), /rule 1, a marker: data-type="mind-map" is not in the hand-drawn list/],
  ["a built-in type", swap('data-type="fishbone"', 'data-type="bar"'), /rule 1, a marker: it is a hand-drawn bar, which Docent draws from data; write its data in a block with "kind": "bar" and run render/],
  ["a left-out type", swap('data-type="fishbone"', 'data-type="radar"'), /rule 1, a marker: it is a hand-drawn radar, which Docent leaves out: the area of the shape depends on the order of the spokes; .*\("Position and length" in DESIGN\.md\)\. .*If the user asks for it after you name this rule, it is the user's call/],
];

for (const [what, change, message] of BROKEN) {
  test(`check refuses a hand-drawn figure with ${what}, with its own message`, () => {
    const errors = hand(checkDocument(page(change)).errors);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /^Figure 9, why a bug report cannot be repeated, hand-drawn: /);
    assert.match(errors[0], message);
    assert.ok(!checkDocument(page(change)).warnings.some((w) => /is hand-drawn/.test(w)) || !/rule 1/.test(errors[0]), "a figure of the wrong type gets no request to look at it");
  });
}

test("each broken rule has a message of its own", () => {
  const messages = BROKEN.map(([, change]) => hand(checkDocument(page(change)).errors)[0].replace(/^[^:]*: /, ""));
  assert.equal(new Set(messages).size, BROKEN.length);
});

test("an unmarked SVG in a figure well is still refused, as before", () => {
  const errors = checkDocument(page(swap(' data-drawn="hand"', ""))).errors;
  assert.match(errors.join("\n"), /Figure 9, why a bug report cannot be repeated holds a drawing that no diagram block made; write its data in a block and run render\. Only a type in the hand-drawn list may be drawn by hand, marked data-drawn="hand"/);
});

test("the rest of the contract: size, opacity, dashes, scope of a style, fill, the name and the words", () => {
  const one = (change) => hand(checkDocument(page(change)).errors).join("\n");
  assert.match(one(swap('width="640" height="290" viewBox="0 0 640 290"', 'width="800" height="290" viewBox="0 0 800 290"')), /rule 4, real size: the drawing is 800 × 290px; it is at most 640px wide and 831px high, so print never shrinks it/);
  assert.match(one(swap('width="640" height="290" viewBox', 'width="100%" height="290" viewBox')), /rule 4, real size: the <svg> has width="100%" height="290"; they equal the viewBox, width="640" height="290"/);
  assert.match(one(swap("stroke-width:1}", "stroke-width:1;opacity:0.5}")), /rule 2, page tokens only: .* has opacity="0\.5"; each color shows as its token/);
  assert.match(one(swap("stroke-width:1}", "stroke-width:1;stroke-dasharray:4 4}")), /rule 7, nothing dashed: .* has stroke-dasharray="4 4"; in Docent a dashed line means a path that only some readers take/);
  assert.match(one(swap("font-weight:400;", "font-weight:700;")), /rule 5, system fonts and two weights: .* has font-weight="700"; a drawing has two weights, 400 and 600/);
  assert.match(one(swap("stroke:var(--muted,#575d75);stroke-width:1", "stroke:var(--primary);stroke-width:1")), /rule 2, page tokens only: .* --primary has its own meaning, the current leg/);
  assert.match(one(swap("stroke:var(--muted,#575d75);stroke-width:1", "stroke:var(--muted,#000000);stroke-width:1")), /its fallback #000000 is not the light value of --muted \(#575d75\)/);
  assert.match(one(swap("#hd-repeat .cause{", ".cause{")), /the markup: a <style> rule "\.cause" reaches past the drawing; a style element applies to the whole page/);
  assert.match(one(swap('<rect class="box"', '<script>alert(1)</script><rect class="box"')), /rule 6, no network and no script: <script> is not allowed: a script runs code/);
  assert.match(one(swap('role="img" ', "")), /rule 8, an accessible name: the <svg> has no role; it has role="img"/);
  assert.match(one(swap('aria-labelledby="hd-repeat-t hd-repeat-d"', 'aria-labelledby="hd-repeat-t"')), /rule 8, an accessible name: the <svg> has aria-labelledby="hd-repeat-t"; it names the title and the desc: aria-labelledby="hd-repeat-t hd-repeat-d"/);
  assert.match(one((f) => f.replace('<section id="hand"', '<p id="hd-repeat-t" hidden>x</p><section id="hand"')), /rule 8, an accessible name: the id "hd-repeat-t" is used 2 times in the page/);
  assert.match(one(swap('<details class="dg-words">', '<details class="dg-words" open>')), /rule 9, the diagram in words: the <details class="dg-words"> is open; it is closed/);
  assert.match(one((f) => f.replace(/<table>[\s\S]*?<\/table>/, "")), /rule 9, the diagram in words: the <details class="dg-words"> holds no table or list with words in it/);
  assert.match(one(swap('data-type="fishbone"', 'data-type="scatter"')), /it is a hand-drawn scatter; Docent plans a built-in kind for a scatter plot, so until it is built, write its data as a table or in words/);
  assert.match(one(swap('data-type="fishbone"', 'data-type="swimlane"')), /write its data in a block with no "kind" \(a workflow diagram\)/);
  assert.match(one(swap('data-type="fishbone"', 'data-type="Line chart"')), /write its data in a block with "kind": "line"/);
  assert.match(one(swap('data-type="fishbone"', 'data-type="sankey"')), /which Docent leaves out: it claims to know where each person went next/);
  assert.match(one((f) => f.replace(/var\(--text,#1c1f2e\)/g, "#111")), /has fill="#111"; .* \(and \d+ more like it\)/, "one message for a break that repeats, with a count");
});

test("a drawing with no style element: each shape and text needs a fill from itself or a group, or it shows black in dark mode", () => {
  const svg = (inner, rootFill = "") => `<svg id="hd-q" data-drawn="hand" data-type="quadrant" width="200" height="100" viewBox="0 0 200 100" role="img" aria-labelledby="hd-q-t hd-q-d"${rootFill}><title id="hd-q-t">Two by two</title><desc id="hd-q-d">Four boxes.</desc>${inner}</svg>`;
  assert.deepEqual(checkDrawing(svg('<rect x="0" y="0" width="10" height="10" fill="var(--bg)" stroke="var(--text)"/><g fill="var(--text)"><text x="4" y="40" font-size="14">Cost</text></g><line x1="0" y1="0" x2="9" y2="9" stroke="var(--line)"/>')).errors, []);
  assert.deepEqual(checkDrawing(svg('<text x="4" y="40" font-size="14">Cost</text><text x="4" y="60" font-size="14">Value</text>')).errors, ["rule 2, page tokens only: <text> has no fill, so it shows black and disappears in dark mode; write fill=\"var(--text)\" on it or on a group around it (fill=\"none\" for a line) (and 1 more like it)"]);
  assert.deepEqual(checkDrawing(svg('<text x="4" y="40" font-size="14">Cost</text>', ' fill="var(--text)"')).errors, [], "a fill on the svg reaches every shape");
  assert.deepEqual(checkDrawing(svg('<text x="4" y="40" font-size="14" style="fill: var(--muted, #575d75)">Cost</text>')).errors, [], "a fill in a style attribute counts");
  // A page with a palette: the fallback may be the palette's light value.
  const harbor = require("../skills/docent/scripts/lib/palettes.cjs").PALETTES.harbor.light.text;
  assert.deepEqual(checkDrawing(svg(`<rect width="9" height="9" fill="var(--text,${harbor})"/>`), { palette: "harbor" }).errors, []);
  assert.match(checkDrawing(svg(`<rect width="9" height="9" fill="var(--text,${harbor})"/>`)).errors.join(), /fallback/, "without the palette, its value is not a light value");
});

test("a comment in a drawing is a note, and a style rule cannot reach past the drawing", () => {
  const errs = (change) => hand(checkDocument(page(change)).errors).join("\n");
  assert.equal(errs(swap('<line class="spine"', '<!-- the spine, <rect width="9" height="9"/> -->\n<line class="spine"')), "", "a comment holds no text and no tags");
  for (const sel of ["#hd-repeat + details", "#hd-repeat ~ figcaption", "#hd-repeat.x+details", "#hd-repeat-2 .note"]) {
    assert.match(errs(swap("</style>", `${sel}{display:none}\n</style>`)), /reaches past the drawing; a style element applies to the whole page, so each rule starts with the drawing's id, such as #hd-repeat \.note, and no \+ or ~ leads from the drawing to the page/, sel);
  }
  assert.equal(errs(swap("</style>", "#hd-repeat .group ~ .note{font-size:14px}\n#hd-repeat>.box{stroke-width:2}\n</style>")), "", "a sibling inside the drawing stays inside it");
});

test("a drawing cannot set its own tokens, a gradient or a color in another property", () => {
  const errs = (rule) => hand(checkDocument(page(swap("</style>", `${rule}\n</style>`))).errors).join("\n");
  assert.match(errs("#hd-repeat{--text:#fbfbfe;--muted:#fbfbfe}"), /rule 2, page tokens only: a <style> rule for "#hd-repeat" has --text="#fbfbfe"; a drawing sets no token of its own, .* \(and 1 more like it\)/);
  assert.match(errs("#hd-repeat{background:linear-gradient(red,blue)}"), /rule 2, page tokens only: .* has background="linear-gradient\(red,blue\)"; the page is flat, with no gradient/);
  assert.match(errs("#hd-repeat{background-color:#fff}"), /has background-color="#fff"; a color in a hand-drawn figure is a drawing token/);
  assert.match(errs("#hd-repeat .box{border:1px solid rgb(0 0 0)}"), /has border="1px solid rgb\(0 0 0\)"; a color in a hand-drawn figure is a drawing token/);
  assert.equal(errs("#hd-repeat{background:var(--fig,#f2f3f9)}\n#hd-repeat .box{outline:1px solid var(--line,#d3d6e3)}"), "", "a token with its light value is fine in these properties too");
});

test("a hand-drawn drawing outside a figure well is refused", () => {
  const svg = figure.match(/<svg id="hd-repeat"[\s\S]*?<\/svg>/)[0];
  assert.match(checkDocument(specimen.replace('<section id="report"', `<p>${svg}</p><section id="report"`)).errors.join("\n"), /a hand-drawn drawing stands outside a figure well/);
});

test("the chevron in the summary of the words is an icon, not a second drawing", () => {
  assert.ok(figure.includes("<summary><svg"), "the fixture copies the summary of a drawn figure, chevron and all");
  assert.deepEqual(checkDocument(page()).errors, []);
});
