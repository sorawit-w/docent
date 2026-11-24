// The deck profile (docs/proposals/decks.md): the kit's deck part goes only into a deck, and check tests the slides.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stampHtml, cssBlock, jsBlock } = require("../skills/docent/scripts/lib/kit.cjs");
const { renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { checkDeck, elements, INNER } = require("../skills/docent/scripts/lib/slide.cjs");

const assets = path.join(__dirname, "..", "skills", "docent", "assets");
const build = (html) => stampHtml(renderDocument(html).html).html;
const source = fs.readFileSync(path.join(__dirname, "fixtures", "deck.html"), "utf8");
const deck = build(source);
const specimen = fs.readFileSync(path.join(assets, "specimen.html"), "utf8");
const deckCss = fs.readFileSync(path.join(assets, "deck.css"), "utf8").trim();
const deckJs = fs.readFileSync(path.join(assets, "deck.js"), "utf8").trim();
/** check's errors for the fixture deck after a change to its source; the page is built again, so only the change can fail. */
const errorsOf = (change) => checkDocument(build(change(source))).errors;
const slide = (n, inner) => (html) => html.replace(new RegExp(`(<section class="slide" id="s${n}"[^>]*>)[\\s\\S]*?(</section>)`), `$1\n${inner}\n$2`);

test("the fixture deck, one slide of each body, passes check with no error and no warning", () => {
  const { errors, warnings } = checkDocument(deck);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("the starting page of a deck is not built, and once built it passes check with no error and no warning", () => {
  const start = fs.readFileSync(path.join(assets, "deck.html"), "utf8");
  assert.ok(!/docent:kit|<svg id="dg-/.test(start), "the starting page has no kit and no drawing");
  assert.match(start, /<html lang="en" data-profile="deck">/);
  const { errors, warnings } = checkDocument(build(start));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("stamp writes the deck part of the kit only into a deck", () => {
  assert.ok(deck.includes(deckCss) && deck.includes(deckJs), "a deck carries the deck styles and script");
  assert.ok(!specimen.includes(deckCss) && !specimen.includes(deckJs), "an ordinary page carries neither");
  assert.ok(cssBlock(null, true).startsWith(cssBlock(null).slice(0, -"\n/* /docent:kit */".length)), "the deck part comes after the kit styles");
  assert.ok(cssBlock("harbor", true).indexOf(deckCss) > cssBlock("harbor", true).indexOf("harbor"), "and after a palette, so present mode can set the colors");
  assert.equal(stampHtml(stampHtml(deck).html).html, deck, "stamp is the same when it runs twice");
  assert.equal(jsBlock(true).split("// docent:kit").length, 2, "one kit script block");
});

test("check says when the kit's deck part does not match the profile", () => {
  const notDeck = checkDocument(deck.replace('data-profile="deck"', 'data-profile="brief"')).errors.join("\n");
  assert.match(notDeck, /the kit styles carry the deck part, but <html> does not have data-profile="deck"; run stamp/);
  assert.match(notDeck, /the kit script carry the deck part/);
  const isDeck = checkDocument(specimen.replace('data-profile="standard"', 'data-profile="deck"')).errors.join("\n");
  assert.match(isDeck, /the kit styles have no deck part, but <html> has data-profile="deck"; run stamp/);
});

test("deck is a profile, and check suggests no other profile for a deck", () => {
  const { warnings } = checkDocument(deck);
  assert.ok(!warnings.some((w) => w.includes("data-profile")));
  assert.match(checkDocument(deck.replace('data-profile="deck"', 'data-profile="slides"')).errors.join("\n"), /a profile is "standard", "task", "reference", "brief", "deck"/);
});

test("every child of <main> is a slide, and the first is the title slide with the h1", () => {
  assert.ok(errorsOf((h) => h.replace("</main>", '<div class="status"><p>Late.</p></div></main>')).some((e) => e.startsWith('<div class="status"> stands directly inside <main>; in a deck every child of <main> is a slide')));
  assert.ok(errorsOf((h) => h.replace('class="slide title"', 'class="slide"')).includes('slide 1 is not the title slide; the first slide is <section class="slide title">, with the <h1>, the opening paragraph and a facts list'));
  assert.ok(errorsOf((h) => h.replace('class="slide" id="s2"', 'class="slide title" id="s2"')).includes('slide 2 has the class "title"; only the first slide is the title slide'));
  assert.ok(errorsOf((h) => h.replace("</ul>\n  </section>", '</ul>\n    <p>One more line.</p>\n  </section>')).some((e) => e.startsWith("slide 1, the title slide, holds <p>")));
});

test("every slide has its own id and one heading, an h2 after the title slide", () => {
  assert.ok(errorsOf((h) => h.replace(' id="s3"', "")).includes('slide 3 has no id; give each slide an id, such as id="s3", so a link and the address can open it'));
  assert.ok(errorsOf((h) => h.replace(' id="s3"', ' id="s2"')).includes('slide 3 has the id "s2", as slide 2 has; each slide has its own id'));
  assert.ok(errorsOf(slide(2, "<p>No heading.</p>")).includes("slide 2 does not start with its heading; a slide starts with one <h2> that says its point"));
  assert.ok(errorsOf(slide(9, "<h3>Questions</h3>")).includes("slide 9 starts with an <h3>; a slide after the title slide starts with an <h2>"));
  assert.ok(errorsOf(slide(9, "<h2>Questions</h2>\n<h2>And answers</h2>")).includes("slide 9 has 2 headings; a slide has one heading, a sentence that says its point"));
  assert.ok(errorsOf(slide(9, "<h2>Most bug reports arrive without the steps that show the bug again, so the team asks the reporter twice</h2>")).some((e) => /^slide 9: the heading .* is about 3 lines at 52px; a slide's heading is at most 2 lines/.test(e)));
});

test("a slide holds one body from the list, within its limits", () => {
  const two = errorsOf(slide(9, "<h2>Questions</h2>\n<p>Ask now.</p>\n<ul><li>Or later</li></ul>"));
  assert.ok(two.some((e) => e.startsWith("slide 9 has 2 bodies (<p>, <ul>); a slide holds one body")), two.join("\n"));
  assert.ok(errorsOf(slide(9, '<h2>Questions</h2>\n<dl><dt>A</dt><dd>B</dd></dl>')).some((e) => e.startsWith("slide 9 holds <dl>, which is not a slide body")));
  assert.ok(errorsOf(slide(9, "<h2>Questions</h2>\n<ul><li>One</li><li>Two</li><li>Three</li><li>Four</li></ul>")).some((e) => e.startsWith("slide 9: it has 4 points; a slide holds at most 3")));
  assert.ok(errorsOf(slide(9, "<h2>Questions</h2>\n<ul><li>What you did, step by step, with the page you opened and every button you pressed on it</li></ul>")).some((e) => /^slide 9: point 1 .* is longer than one line at 30px/.test(e)));
  assert.ok(errorsOf(slide(9, `<h2>Questions</h2>\n<p>${"Ask now.<br>".repeat(20)}</p>`)).some((e) => e.startsWith("slide 9: its paragraph is about 20 lines at 30px")), "a line break starts a new line");
  assert.ok(errorsOf(slide(9, "<h2>Questions</h2>\n<ul><li>What you did,<br>step by step</li></ul>")).some((e) => e.startsWith("slide 9: point 1")), "a point with a line break is two lines");
  assert.ok(errorsOf(slide(9, "<h2>Ask<br>for<br>three things</h2>")).some((e) => e.startsWith("slide 9: the heading") && e.includes("about 3 lines")), "a heading with two line breaks is three lines");
  assert.ok(errorsOf(slide(9, `<h2>Questions</h2>\n<p>${"A report form that asks for the steps gets them in most reports. ".repeat(3)}</p>`)).some((e) => e.startsWith("slide 9: its paragraph is about 3 lines at 30px; a short paragraph on a slide is at most 2 lines")));
  assert.ok(errorsOf(slide(9, `<h2>Questions</h2>\n<ul class="cards">${'<li><p class="big">2</p><p>Days</p></li>'.repeat(4)}</ul>`)).some((e) => e.startsWith("slide 9: its card grid has 4 cards; a slide holds at most 3 large numbers")));
  assert.ok(errorsOf(slide(9, '<h2>Questions</h2>\n<ul class="cards"><li><p class="big">2</p><p>Days</p><p class="change">Up 1 against Q2 2026 (1)</p></li></ul>')).some((e) => e.startsWith("slide 9: card 1 has 2 lines under its number; a card on a slide has one")));
  const cards = (n, line) => `<h2>Questions</h2>\n<ul class="cards">${`<li><p class="big">2</p><p>${line}</p></li>`.repeat(n)}</ul>`;
  const long = "Days to fix a report that has its steps and the error text";
  assert.ok(errorsOf(slide(9, cards(3, long))).some((e) => /^slide 9: the line of card 1 .* is longer than one line of a card at 21px \(368px\)/.test(e)), "three cards take a third each");
  assert.ok(!errorsOf(slide(9, cards(2, long))).some((e) => e.includes("line of card")), "two cards take half each, so the same line fits");
  const table = (cols, rows) => `<h2>Questions</h2>\n<div class="table-wrap"><table><thead><tr>${"<th>A</th>".repeat(cols)}</tr></thead><tbody>${`<tr>${"<td>1</td>".repeat(cols)}</tr>`.repeat(rows)}</tbody></table></div>`;
  assert.ok(errorsOf(slide(9, table(5, 2))).some((e) => e.startsWith("slide 9: its table has 5 columns; a table on a slide has at most 4")));
  assert.ok(errorsOf(slide(9, table(2, 6))).some((e) => e.startsWith("slide 9: its table has 6 rows under the heading row; a table on a slide has at most 5")));
  assert.ok(errorsOf(slide(9, `<h2>Questions</h2>\n<pre><code>${Array.from({ length: 9 }, (_, i) => `line ${i + 1}`).join("\n")}</code></pre>`)).some((e) => e.startsWith("slide 9: its code block has 9 lines; a code block on a slide has at most 8")));
  assert.ok(errorsOf(slide(9, `<h2>Questions</h2>\n<figure class="quote"><blockquote><p>${"I could not find the bug until the report told me which page to open. ".repeat(3)}</p></blockquote><figcaption>P3, tester</figcaption></figure>`)).some((e) => e.startsWith("slide 9: its quote is about 3 lines at 30px")));
});

test("a figure on a slide holds one drawing, and a title slide's facts count every line", () => {
  const two = errorsOf(slide(3, '<h2>Sign-in gets the most bug reports</h2>\n<figure><div class="fig" role="region" aria-label="Two" tabindex="0"><img src="data:image/png;base64,AA==" alt="One" width="300" height="100"><img src="data:image/png;base64,AA==" alt="Two" width="300" height="100"></div><figcaption>Two drawings.</figcaption></figure>'));
  assert.ok(two.includes("slide 3: its figure holds 2 drawings; a figure on a slide holds one. Two charts on one slide are two points: give each its own slide"), two.join("\n"));
  const facts = errorsOf((h) => h.replace("<li>Support team review, 1 October 2026</li>", `<li>${"Support team<br>".repeat(20)}</li>`));
  assert.ok(facts.some((e) => /^slide 1 is about \d+px tall, and a slide holds 592px/.test(e)), facts.join("\n"));
});

test("every text on a slide is measured with its wrapped lines: a card's number, a quote's speaker, a line of code", () => {
  const big = errorsOf(slide(9, `<h2>Questions</h2>\n<ul class="cards">${`<li><p class="big">${"2 days<br>".repeat(12)}</p><p>Days</p></li>`.repeat(3)}</ul>`));
  assert.ok(big.some((e) => e.startsWith("slide 9: the number of card 1")) && big.some((e) => /^slide 9 is about \d+px tall/.test(e)), big.join("\n"));
  const speaker = errorsOf(slide(9, `<h2>Questions</h2>\n<figure class="quote"><blockquote><p>Ask the reporter.</p></blockquote><figcaption>${"Support team<br>".repeat(20)}</figcaption></figure>`));
  assert.ok(speaker.some((e) => /^slide 9 is about \d+px tall/.test(e)), speaker.join("\n"));
  const code = errorsOf(slide(9, `<h2>Questions</h2>\n<pre><code>report attach --log ${"a".repeat(80)}.log</code></pre>`));
  assert.ok(code.some((e) => /^slide 9: line 1 of its code block has \d+ characters; a line of code on a slide has at most 88/.test(e)), code.join("\n"));
});

test("the edge of a paragraph starts a new line, and a figure's drawing states its size", () => {
  const quote = errorsOf(slide(9, `<h2>Questions</h2>\n<figure class="quote"><blockquote>${"<p>Ask.</p>".repeat(20)}</blockquote><figcaption>P3, tester</figcaption></figure>`));
  assert.ok(quote.some((e) => e.startsWith("slide 9: its quote is about 20 lines")), quote.join("\n"));
  const sizeless = errorsOf(slide(9, '<h2>Questions</h2>\n<figure><div class="fig" role="region" aria-label="A picture" tabindex="0"><img src="data:image/png;base64,AA==" alt="A picture"></div><figcaption>A caption.</figcaption></figure>'));
  assert.ok(sizeless.includes("slide 9: its drawing has no width and height, so check cannot test that it fits the slide; give the <img> or <svg> its width and height in pixels"), sizeless.join("\n"));
});

test("a slide that is taller than the frame is refused, with its height", () => {
  const table = (rows, text) => `<h2>Ask for three things in every bug report, and say why each one matters</h2>\n<div class="table-wrap"><table><thead><tr><th>Part</th><th>Why</th><th>Who</th><th>When</th></tr></thead><tbody>${`<tr><td>${text}</td><td>${text}</td><td>${text}</td><td>${text}</td></tr>`.repeat(rows)}</tbody></table></div>`;
  // Two heading lines and a table of five short rows: fits, as the proposal measured.
  assert.deepEqual(errorsOf(slide(9, table(5, "Steps"))), []);
  // The same table with long text in its cells: each row wraps to several lines, so the slide is too tall.
  const errors = errorsOf(slide(9, table(5, "What you did, step by step, with the page you opened")));
  assert.ok(errors.some((e) => /^slide 9 is about \d+px tall, and a slide holds 592px\. Cut a point, or move the detail to the speaker notes or to the report$/.test(e)), errors.join("\n"));
});

test("a drawing that does not fit the slide at 1.25 times is refused with its size and the room", () => {
  const figure = (w, h) => `<h2>Questions</h2>\n<figure><div class="fig" role="region" aria-label="A drawing" tabindex="0"><img src="data:image/png;base64,AA==" alt="A drawing" width="${w}" height="${h}"></div><figcaption>A caption.</figcaption></figure>`;
  const tall = errorsOf(slide(9, figure(400, 500)));
  assert.ok(tall.some((e) => /^slide 9: the drawing is 400 × 500px; a slide holds 915 × \d+px at 1\.25 times under this heading and caption\. Show less on the slide, and the full drawing in the report$/.test(e)), tall.join("\n"));
  assert.ok(!tall.some((e) => e.includes("px tall")), "the slide is not called too tall as well");
  assert.ok(errorsOf(slide(9, figure(1200, 100))).some((e) => e.startsWith("slide 9: the drawing is 1200 × 100px")), "a drawing too wide for the frame");
  assert.deepEqual(errorsOf(slide(9, figure(640, 300))), [], "a chart of 640 × 300 fits");
});

test("a deck has no widget, no walkthrough and no closed section other than a figure's words and the speaker notes", () => {
  const closed = errorsOf(slide(9, "<h2>Questions</h2>\n<details><summary>More</summary><p>Text.</p></details>"));
  assert.ok(closed.some((e) => e.startsWith("the deck has a closed section")), closed.join("\n"));
  assert.ok(!errorsOf(slide(9, '<h2>Questions</h2>\n<details class="notes"><summary>Speaker notes</summary><p>Ask the room.</p></details>')).length, "the speaker notes may close a slide");
  const widget = errorsOf(slide(9, '<h2>Questions</h2>\n<!-- docent:widget\n{"id": "pick", "kind": "chooser", "label": "Your system", "options": [{"name": "Mac", "text": "A."}, {"name": "Windows", "text": "B."}]}\n-->\n<!-- /docent:widget -->'));
  assert.ok(widget.some((e) => e.startsWith("the deck has 1 widget; a slide shows one point to a room, so a deck has no widget")), widget.join("\n"));
});

test("check counts lines word by word, as a browser wraps them", () => {
  // Four columns leave 264px for a cell. "documentation" is 148px, so three of them take three lines, one word each, though their
  // total width (455px) would fill only two. Five such rows make the slide too tall; dividing the width would let it pass.
  const table = `<h2>Questions</h2>\n<div class="table-wrap"><table><thead><tr><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead><tbody>${"<tr><td>documentation documentation documentation</td><td>b</td><td>c</td><td>d</td></tr>".repeat(5)}</tbody></table></div>`;
  assert.ok(errorsOf(slide(9, table)).some((e) => /^slide 9 is about 7\d\dpx tall/.test(e)), errorsOf(slide(9, table)).join("\n"));
});

test("check estimates each slide's height on the 1280 × 720 frame", () => {
  const { slides, measured } = checkDeck(deck.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length)));
  assert.equal(slides.length, 9);
  assert.ok(slides.every((s) => s.height <= INNER.height), JSON.stringify(slides));
  const figure = measured.find((m) => m.kind === "one figure");
  assert.ok(figure.scale >= 1.25 && figure.scale <= 1.5, `the bar chart stands at ${figure.scale} times`);
  assert.deepEqual(measured.map((m) => m.kind), ["points", "one figure", "large numbers", "a small table", "a short paragraph", "a short paragraph", "a code block"]);
});

test("elements reads the children of a piece of markup, skipping text and empty elements", () => {
  assert.deepEqual(elements('<h2 id="a">A <b>b</b></h2> text <img src="x"><ul><li>1</li></ul>').map((e) => e.tag), ["h2", "img", "ul"]);
  assert.equal(elements("<p>open <em>end</em>").length, 1);
});

test("present mode is light with the more-contrast tokens; a palette adds its own block, with Harbor's darker accent", () => {
  assert.match(deckCss, /html:root\.presenting:not\(\[data-never\]\) \{ color-scheme: light; [^}]*--text: #1c1f2e; --muted: #1c1f2e; --line: #575d75;/, "muted text takes the text color and the line the muted color");
  assert.match(deckCss, /@media screen and \(forced-colors: none\) \{\s*html:root\.presenting/, "screen only, and not with forced colors");
  const harbor = cssBlock("harbor", true);
  assert.match(harbor, /html:root\[data-palette="harbor"\]\.presenting:not\(\[data-never\]\) \{[^}]*--primary: var\(--host-accent, #025c87\)/);
  assert.ok(!cssBlock("harbor").includes(".presenting"), "an ordinary page with a palette has no present block");
  const named = build(source.replace('data-profile="deck"', 'data-profile="deck" data-palette="plum"'));
  assert.deepEqual(checkDocument(named), { errors: [], warnings: [] });
});

test("in a deck, check warns when the host's accent has less than 7:1 on the page", () => {
  const host = (accent) => checkDocument(deck.replace("</head>", `<style>:root { --host-accent: ${accent}; --host-accent-dark: #8e9bff; }</style></head>`)).warnings;
  assert.ok(host("#0a6a5c").includes("in a deck the accent should have 7:1 on the page, because a projector lowers contrast; #0a6a5c has 6.3:1"), host("#0a6a5c").join("\n"));
  assert.ok(!host("#2f3fd0").some((w) => w.includes("in a deck")), "Docent's ultramarine has 7.41:1");
  const page = checkDocument(specimen.replace("</head>", "<style>:root { --host-accent: #0a6a5c; --host-accent-dark: #8e9bff; }</style></head>")).warnings;
  assert.ok(!page.some((w) => w.includes("in a deck")), "an ordinary page needs 4.5:1 only");
});

test("the deck script parses, and adds the Present button and the slide number only with scripts on", () => {
  assert.doesNotThrow(() => new Function(deckJs));
  assert.ok(!/class="present"|class="deck-nav"/.test(source), "the source has neither: the script adds them");
  assert.match(deckJs, /history\.replaceState/, "the address is replaced, not added to the history");
  assert.match(deckJs, /aria-roledescription', 'slide'/);
});

// The drawings that fit a slide (decks.md, section 7, "What fits"): 23 of the stored drawings, at 1.25 times or more under a heading of
// one line. Each stands on a slide of its own, with a caption and a source line, and render and check accept it.
const FITS = ["bar-days", "bar-reports", "bug-report", "communication", "funnel", "heatmap-errors", "heatmap-signups", "heatplan-help", "layout-a4", "layout-screen", "line-months", "line-reports", "line-slope", "pipeline", "plan-dashboard", "plan-docs", "plan-editor", "plan-none", "review", "statusgrid-builds", "statusgrid-calendar", "statusgrid-uptime", "timing"];
const onSlide = (name, heading = "Questions") => {
  const json = fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8").trim();
  return source.replace(/(<section class="slide" id="s3"[^>]*>)[\s\S]*?(<\/section>)/, `$1\n<h2>${heading}</h2>\n<figure><div class="fig" role="region" aria-label="A figure" tabindex="0">\n<!-- docent:diagram\n${json}\n-->\n<!-- /docent:diagram -->\n</div><figcaption>A caption. <span class="source">Source: invented sample data.</span></figcaption></figure>\n$2`);
};

test("each drawing of the proposal's What fits table stands on a slide at 1.25 times or more", () => {
  for (const name of FITS) {
    const { html, results } = renderDocument(onSlide(name));
    assert.equal(results[0].error, null, `${name}: ${results[0].error}`);
    assert.deepEqual(checkDocument(stampHtml(html).html).errors, [], name);
    const figure = checkDeck(html.replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length))).measured.find((m) => m.kind === "one figure");
    assert.ok(figure.scale >= 1.25 && figure.scale <= 1.5, `${name} at ${figure.scale}`);
  }
  assert.equal(FITS.length, 23);
});

test("render refuses a drawing that does not fit a slide at 1.25 times, with its size and the room", () => {
  const sequence = renderDocument(onSlide("sequence")).results[0];
  assert.equal(sequence.error, "slide 3: the sequence diagram is 746 × 496px; a slide holds 915 × 369px at 1.25 times. Show fewer messages on the slide, and the full diagram in the report");
  assert.match(renderDocument(onSlide("long-route")).results[0].error, /^slide 3: the workflow diagram is \d+ × \d+px; a slide holds 915 × 369px at 1\.25 times\. Show fewer parts and legs/);
  assert.match(renderDocument(onSlide("class")).results[0].error, /^slide 3: the class diagram is 552 × 720px; a slide holds .* Show a part of it on the slide/);
  assert.match(renderDocument(onSlide("line-multiples")).results[0].error, /^slide 3: the line chart is 640 × 388px; .* Show fewer rows on the slide, and the full chart in the report$/);
  // A heading of two lines leaves less room: the timing diagram no longer fits.
  assert.match(renderDocument(onSlide("timing", "Most reports arrive in the first hour after a release, and fewer after")).results[0].error, /^slide 3: the timing diagram is 694 × 352px; a slide holds 915 × \d+px/);
  // check refuses the same drawing, as render does, and does not also call the slide too tall.
  const built = stampHtml(onSlide("sequence")).html;
  const errors = checkDocument(built).errors;
  assert.ok(errors.some((e) => e.includes("slide 3: the sequence diagram is 746 × 496px")), errors.join("\n"));
  assert.ok(!errors.some((e) => e.includes("px tall")));
});

test("on a page that is not a deck, render draws as before, also inside a section with the class slide", () => {
  const page = specimen.replace("</main>", '<section class="slide"><h2>A</h2><figure><div class="fig">\n<!-- docent:diagram\n' + fs.readFileSync(path.join(__dirname, "fixtures", "sequence.json"), "utf8").trim() + '\n-->\n<!-- /docent:diagram -->\n</div></figure></section></main>');
  assert.ok(renderDocument(page).results.every((r) => r.error === null));
});

test("a figure on a slide holds one drawing and at most one source line; a hand-drawn figure must fit too", () => {
  const two = errorsOf(slide(3, '<h2>Sign-in gets the most bug reports</h2>\n<figure><div class="fig" role="region" aria-label="Two" tabindex="0"><img src="data:image/png;base64,AA==" alt="One" width="300" height="100"><img src="data:image/png;base64,AA==" alt="Two" width="300" height="100"></div><figcaption>Two. <span class="source">Source: a.</span> <span class="source">Source: b.</span></figcaption></figure>'));
  assert.ok(two.includes("slide 3: its figure holds 2 drawings; a figure on a slide holds one. Two charts on one slide are two points: give each its own slide"), two.join("\n"));
  assert.ok(two.includes("slide 3: its figure has 2 source lines; a figure on a slide has one source line under it"), two.join("\n"));
  const hand = fs.readFileSync(path.join(__dirname, "fixtures", "hand-fishbone.html"), "utf8").match(/<figure>[\s\S]*<\/figure>/)[0].replace("width=\"640\" height=\"290\"", "width=\"640\" height=\"500\"").replace('viewBox="0 0 640 290"', 'viewBox="0 0 640 500"');
  assert.ok(errorsOf(slide(3, `<h2>Why a report cannot be repeated</h2>\n${hand}`)).some((e) => e.startsWith("slide 3: the drawing is 640 × 500px; a slide holds 915 ×")), "a hand-drawn figure 500px high does not fit");
});
