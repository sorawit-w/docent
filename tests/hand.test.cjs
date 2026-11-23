// Hand-drawn figures: a drawing that the agent draws by hand, for a type in the hand-drawn list, under the contract that check tests.
// The drawing holds no CSS and no colors: only shapes and texts with the kit's hd-* classes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { checkDrawing, TYPES, CLASSES } = require("../skills/docent/scripts/lib/hand.cjs");

const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
const kitCss = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "kit.css"), "utf8");
const figure = fs.readFileSync(path.join(__dirname, "fixtures", "hand-fishbone.html"), "utf8");
const page = (change = (f) => f) => specimen.replace('<section id="report"', `${change(figure)}<section id="report"`);
const swap = (from, to) => (f) => { assert.ok(f.includes(from), `the fixture holds ${from}`); return f.replace(from, to); };
const hand = (errors) => errors.filter((e) => /hand-drawn|no diagram block/.test(e));
const errs = (change) => hand(checkDocument(page(change)).errors).join("\n");
const BOX = '<rect class="hd-box"';
const HEAD = '<text class="hd-name" text-anchor="middle" x="556" y="146">';

test("a valid hand-drawn fishbone passes check, and check names it as hand-drawn and asks for a look in a browser", () => {
  const { errors, warnings } = checkDocument(page());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings.filter((w) => /hand-drawn/.test(w)), ["Figure 9, why a bug report cannot be repeated is hand-drawn (fishbone); check cannot see its layout, so open the page in a browser in light and in dark, at 375px and in print preview, and look at it. Tell the user this figure is hand-drawn"]);
  assert.deepEqual(TYPES, ["quadrant", "nested", "venn", "fishbone", "wardley-map", "user-journey", "story-map"]);
  for (const type of TYPES) assert.equal(errs(swap('data-type="fishbone"', `data-type="${type}"`)), "", `${type} is in the list`);
});

test("every class that check allows is drawn by kit.css from Docent's tokens, and none is under 12px", () => {
  for (const name of Object.keys(CLASSES)) assert.match(kitCss, new RegExp(`svg\\[data-drawn="hand"\\] \\.${name}\\b`), `${name} is in kit.css`);
  const rules = kitCss.split("\n").filter((l) => l.startsWith('svg[data-drawn="hand"]')).join("\n");
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(rules), "the rules use tokens, not hex values");
  for (const [, size] of rules.matchAll(/font-size:\s*(\d+)px/g)) assert.ok(Number(size) >= 12);
});

// One broken page for each rule. Each fails with its own message, and with that message only.
const BROKEN = [
  ["a hex color", swap(BOX, '<rect class="hd-box" fill="#cf222e"'), /rule 2, the kit's classes only: <rect> has fill="#cf222e"; the class sets how a shape is drawn, from Docent's tokens: hd-line, hd-strong/],
  ["a class that is not the kit's", swap(BOX, '<rect class="hd-box red"'), /rule 2, the kit's classes only: <rect> has class="hd-box red"; "red" is not a class of the kit/],
  ["a style element", swap(BOX, "<style></style>" + BOX), /rule 2, the kit's classes only: <style> is not allowed: a hand-drawn figure has no style/],
  ["a style attribute", swap(HEAD, HEAD.replace("<text ", '<text style="font-size:10px" ')), /rule 2, the kit's classes only: <text> has style="font-size:10px"; a hand-drawn figure has no style/],
  ["10px text", swap(HEAD, HEAD.replace("<text ", '<text font-size="10" ')), /rule 3, no text under 12px: <text> has font-size="10"; the class sets the size of a text/],
  ["a scaled part", swap(BOX, '<g transform="scale(0.5)"><text x="0" y="0">Small</text></g>' + BOX), /rule 4, real size: <g> has transform="scale\(0\.5\)"; a drawing moves or turns a part with translate\(\) or rotate\(\), and never scales it/],
  ["a web font", swap(HEAD, HEAD.replace("<text ", '<text font-family="Inter" ')), /rule 5, the page's font: <text> has font-family="Inter"; a hand-drawn figure takes the page's font/],
  ["an external link", swap(BOX, '<a href="https://example.com/more"><text x="0" y="0">More</text></a>' + BOX), /rule 6, no network and no script: <a> is not allowed: a link does not belong in a drawing/],
  ["an image", swap(BOX, '<image href="https://example.com/a.png" width="8" height="8"/>' + BOX), /rule 6, no network and no script: <image> is not allowed: an image loads a file/],
  ["an event handler", swap(BOX, '<rect class="hd-box" onclick="go()"'), /rule 6, no network and no script: <rect> has onclick="go\(\)"; an event attribute runs code/],
  ["a dashed line", swap(BOX, '<rect class="hd-box" stroke-dasharray="4 4"'), /rule 7, nothing dashed: <rect> has stroke-dasharray="4 4"; in Docent a dashed line means a path that only some readers take/],
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
  });
}

test("each broken rule has a message of its own", () => {
  const messages = BROKEN.map(([, change]) => hand(checkDocument(page(change)).errors)[0].replace(/^[^:]*: /, ""));
  assert.equal(new Set(messages).size, BROKEN.length);
});

test("an unmarked SVG in a figure well is still refused, as before", () => {
  assert.match(checkDocument(page(swap(' data-drawn="hand"', ""))).errors.join("\n"), /Figure 9, why a bug report cannot be repeated holds a drawing that no diagram block made; write its data in a block and run render\. Only a type in the hand-drawn list may be drawn by hand, marked data-drawn="hand"/);
});

test("the rest of the contract: size, values, the name and the words", () => {
  assert.match(errs(swap('width="640" height="290" viewBox="0 0 640 290"', 'width="800" height="290" viewBox="0 0 800 290"')), /rule 4, real size: the drawing is 800 × 290px; it is at most 640px wide and 831px high, so print never shrinks it/);
  assert.match(errs(swap('width="640" height="290" viewBox', 'width="100%" height="290" viewBox')), /the markup: <svg> has width="100%"; it holds numbers only/);
  assert.match(errs(swap('width="640" height="290" viewBox', 'height="290" viewBox')), /rule 4, real size: the <svg> has width="" height="290"; they equal the viewBox, width="640" height="290"/);
  assert.match(errs(swap('width="640" height="290" viewBox', 'width="320" height="145" width="640" height="290" viewBox')), /the markup: <svg> has the attribute "width" twice; the browser keeps the first/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" CLASS="hd-fill"')), /<rect> has the attribute "CLASS" twice/, "in any case");
  assert.match(errs(swap(BOX, '<g viewBox="0 0 9 9"></g>' + BOX)), /rule 4, real size: <g> has viewBox="0 0 9 9"; a viewBox scales what it holds/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" stroke="var(--text)"')), /rule 2, the kit's classes only: <rect> has stroke="var\(--text\)"/, "even a token: the class draws it");
  assert.match(errs(swap(BOX, '<rect class="hd-box" opacity="0.5"')), /rule 2, the kit's classes only: <rect> has opacity="0\.5"/);
  assert.match(errs(swap(HEAD, HEAD.replace("<text ", '<text textLength="40" '))), /rule 3, no text under 12px: <text> has textLength="40"/);
  assert.match(errs(swap(HEAD, HEAD.replace("<text ", '<text font-weight="700" '))), /rule 5, the page's font: <text> has font-weight="700"/);
  assert.match(errs(swap(HEAD, HEAD.replace('text-anchor="middle"', 'text-anchor="center"'))), /the markup: <text> has text-anchor="center"; it is one of start, middle, end/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" x="calc(1px)"')), /the markup: <rect> has x="calc\(1px\)"; it holds numbers only/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" x="&#49;0"')), /the markup: <rect> has x="&#49;0"; it holds numbers only/, "a character reference is not a number, so nothing needs decoding");
  assert.match(errs(swap(BOX, '<path d="M0 0 url(#a)"/>' + BOX)), /the markup: <path> has d="M0 0 url\(#a\)"; a path holds commands and numbers only/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" xlink:href="#a"')), /rule 6, no network and no script: <rect> has xlink:href="#a"; a hand-drawn figure links to nothing and loads nothing/);
  assert.match(errs(swap(BOX, "<use/>" + BOX)), /the markup: <use> is not allowed: it copies another part/);
  assert.match(errs(swap(BOX, "<defs><marker></marker></defs>" + BOX)), /the markup: <defs> is not allowed: a hand-drawn figure holds no definitions/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" filter="x"')), /the markup: <rect> has filter="x"; a hand-drawn figure does not take it/);
  assert.match(errs(swap(BOX, '<rect class="hd-box" onClick="go()"')), /rule 6, no network and no script: <rect> has onClick="go\(\)"/, "an event attribute in any case");
  assert.match(errs(swap(BOX, "<script>alert(1)</script>" + BOX)), /rule 6, no network and no script: <script> is not allowed: a script runs code/);
  assert.match(errs(swap(BOX, "<linearGradient></linearGradient>" + BOX)), /rule 2, the kit's classes only: <linearGradient> is not allowed: the page is flat/);
  assert.match(errs(swap('role="img" ', "")), /rule 8, an accessible name: the <svg> has no role; it has role="img"/);
  assert.match(errs(swap('aria-labelledby="hd-repeat-t hd-repeat-d"', 'aria-labelledby="hd-repeat-t"')), /rule 8, an accessible name: the <svg> has aria-labelledby="hd-repeat-t"; it names the title and the desc: aria-labelledby="hd-repeat-t hd-repeat-d"/);
  assert.match(errs((f) => f.replace('<section id="hand"', '<p id="hd-repeat-t" hidden>x</p><section id="hand"')), /rule 8, an accessible name: the id "hd-repeat-t" is used 2 times in the page/);
  assert.equal(errs((f) => f.replace('<section id="hand"', '<!-- <p id="hd-repeat-t">draft</p> --><section id="hand"')), "", "an id in a comment is not on the page");
  assert.equal(errs((f) => f.replace('<section id="hand"', '<p data-id="hd-repeat-t">Reference</p><section id="hand"')), "", "data-id is another attribute");
  assert.match(errs(swap('<details class="dg-words">', '<details class="dg-words" open>')), /rule 9, the diagram in words: the <details class="dg-words"> is open; it is closed/);
  assert.match(errs((f) => f.replace(/<table>[\s\S]*?<\/table>/, "")), /rule 9, the diagram in words: the <details class="dg-words"> holds no table or list with words in it/);
  assert.match(errs((f) => f.replace(/<table>[\s\S]*?<\/table>/, "<!-- <ul><li>old data</li></ul> -->")), /holds no table or list with words in it/, "a table that is commented out says nothing");
  assert.match(errs(swap('data-type="fishbone"', 'data-type="scatter"')), /it is a hand-drawn scatter; Docent plans a built-in kind for a scatter plot, so until it is built, write its data as a table or in words/);
  assert.match(errs(swap('data-type="fishbone"', 'data-type="swimlane"')), /write its data in a block with no "kind" \(a workflow diagram\)/);
  assert.match(errs(swap('data-type="fishbone"', 'data-type="Line chart"')), /write its data in a block with "kind": "line"/);
  assert.match(errs(swap('data-type="fishbone"', 'data-type="sankey"')), /which Docent leaves out: it claims to know where each person went next/);
  assert.match(errs((f) => f.replace(/class="hd-muted"/g, 'class="hd-muted" fill="#111"')), /has fill="#111"; .* \(and 7 more like it\)/, "one message for a break that repeats, with a count");
});

test("a comment is a note, a move or a turn keeps the real size, and the classes may be combined", () => {
  assert.equal(errs(swap('<line class="hd-strong"', '<!-- the spine, <rect fill="#000"/> -->\n<line class="hd-strong"')), "", "a comment holds no text and no tags");
  assert.equal(errs(swap(BOX, '<g transform="translate(2 0) rotate(-30, 4, 4)"><circle class="hd-fill" cx="1" cy="1" r="2"/><rect class="hd-band" width="1" height="1"/></g>' + BOX)), "");
  assert.equal(errs(swap(HEAD, '<text class="hd-name" text-anchor="middle" dominant-baseline="middle" x="556" y="146">')), "");
  assert.deepEqual(checkDrawing('<svg id="hd-q" data-drawn="hand" data-type="quadrant" width="200" height="100" viewBox="0 0 200 100" role="img" aria-labelledby="hd-q-t hd-q-d"><title id="hd-q-t">Two by two</title><desc id="hd-q-d">Four boxes.</desc><rect class="hd-rule" width="100" height="50"/><text class="hd-text" x="4" y="40">Cost <tspan class="hd-note">low</tspan></text></svg>').errors, []);
});

test("a page style for a hand-drawn figure keeps text at 12px or more, and other page text at 14px", () => {
  const styled = (css) => checkDocument(page().replace("</head>", `<style>${css}</style></head>`)).errors.join("\n");
  assert.equal(styled('svg[data-drawn="hand"] .hd-note { font-size: 12px; }'), "");
  assert.match(styled('svg[data-drawn="hand"] text { font-size: 10px; }'), /a style sets font-size: 10px in a hand-drawn figure; text in a drawing is 12px or more, in px/);
  assert.match(styled('svg[data-drawn="hand"] text { font: 10px Arial; }'), /a style sets font: 10px in a hand-drawn figure; text in a drawing is 12px or more, in px/);
  assert.match(styled('p, svg[data-drawn="hand"] text { font-size: 12px; }'), /a style sets font-size: 12px; no text is below 14px outside diagrams/, "a rule that also styles the page keeps the page's rule");
});

test("check reads the text of a hand-drawn figure for personal data, as it reads the page and the data of each diagram", () => {
  const warned = checkDocument(page(swap(">Cannot repeat</text>", ">jane@acmecorp.com</text>"))).warnings.join("\n");
  assert.match(warned, /the text of a hand-drawn figure holds what looks like personal data: an email address j\*+@acmecorp\.com/);
  assert.doesNotMatch(checkDocument(page()).warnings.join("\n"), /personal data/);
});

test("a hand-drawn drawing outside a figure well is refused", () => {
  const svg = figure.match(/<svg id="hd-repeat"[\s\S]*?<\/svg>/)[0];
  assert.match(checkDocument(specimen.replace('<section id="report"', `<p>${svg}</p><section id="report"`)).errors.join("\n"), /a hand-drawn drawing stands outside a figure well/);
});

test("the chevron in the summary of the words is an icon, not a second drawing", () => {
  assert.ok(figure.includes("<summary><svg"), "the fixture copies the summary of a drawn figure, chevron and all");
  assert.deepEqual(checkDocument(page()).errors, []);
});
