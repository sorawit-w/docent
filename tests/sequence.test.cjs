// Sequence diagrams, tested against a stored drawing. Run with UPDATE=1 to store new expected output after a wanted change.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { check } = require("../skills/docent/scripts/lib/geometry.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { stampHtml } = require("../skills/docent/scripts/lib/kit.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "sequence.json"), "utf8"));

test("a sequence diagram matches the stored drawing and keeps every spacing rule", () => {
  const { svg, scene, form } = renderDiagram(fixture());
  assert.equal(form, "sequence");
  assert.deepEqual(check(scene), []);
  const file = path.join(__dirname, "expected", "sequence.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "sequence.svg changed; look at the drawing, then run with UPDATE=1");
});

test("a sequence diagram: tracks, numbered messages, a muted reply with an open head, a loop for a call to itself, and one band per case", () => {
  const { svg, scene } = renderDiagram(fixture());
  assert.equal(scene.tracks.length, 4, "one track for each participant");
  assert.equal((svg.match(/<g class="leg[^"]*" data-leg="\d+">/g) || []).length / 1, 7, "seven messages in the desktop form");
  assert.equal((svg.match(/<g class="leg is-reply" data-leg="(4|6|7)">/g) || []).length, 3, "the three replies");
  assert.match(svg, /\.leg\.is-reply \.line\{stroke:var\(--muted,#575d75\);stroke-width:1\.5\}/);
  assert.ok(!/is-reply[^>]*>[^]*?stroke-dasharray/.test(svg.split("\n<svg")[0]) && !/dasharray/.test(svg.split("\n<svg")[0]), "a reply is not dashed: a dashed line means an optional path");
  const loop = scene.legs.find((leg) => leg.n === 2);
  assert.equal(loop.pts.length, 4, "a call to itself is a loop to the right of the track");
  assert.deepEqual(scene.bands.map((b) => b.when), ["If the cache has the page", "If not"]);
  assert.match(svg, /<rect [^>]*class="band"\/><text [^>]*class="sub"[^>]*>If not<\/text>/, "a band's label stops the tracks behind it");
});

test("a sequence diagram has a script form for phones, and the steps in words", () => {
  const { svg } = renderDiagram(fixture());
  assert.match(svg, /<svg id="dg-page-phone" class="dg dg-script dg-auto"[^>]* width="264"/);
  assert.match(svg, />Web app → itself<\/text><text [^>]*class="verb"[^>]*>check the session<\/text>/);
  assert.match(svg, />Cache → Web app<\/text><text [^>]*class="verb"[^>]*>reply: page<\/text>/);
  assert.match(svg, /@media print\{#dg-page\{display:block!important\}#dg-page-phone\{display:none!important\}\}/, "on paper the desktop form shrinks to the sheet, since it keeps more than 80% of its size");
  assert.match(svg, /<details class="dg-words">\n<summary>[^]*The diagram in words<\/summary>\n<ol><li value="1">Browser to Web app: ask for the page\.<\/li><li value="2">Web app to itself: check the session\.<\/li><\/ol>\n<p>If the cache has the page:<\/p>\n<ol><li value="3">Web app to Cache: read\.<\/li><li value="4">Cache to Web app: page \(a reply\)\.<\/li><\/ol>/);
});

test("wrong sequence data is refused with a plain reason", () => {
  const broken = (change, reason) => { const copy = fixture(); change(copy); assert.throws(() => renderDiagram(copy), reason); };
  broken((d) => (d.kind = "timeline"), /"kind" must be "sequence", or left out/);
  broken((d) => (d.participants.length = 1), /2 to 6 participants; this one has 1/);
  broken((d) => d.participants.push(...["e", "f", "g"].map((id) => ({ id, name: id.toUpperCase() }))), /2 to 6 participants; this one has 7/);
  broken((d) => (d.messages[0].to = "nobody"), /message 1 goes from "browser" to "nobody"/);
  broken((d) => (d.messages[1].reply = true), /a reply to itself/);
  broken((d) => d.messages.push({ alt: [{ when: "A", messages: [d.messages[0]] }, { when: "B", messages: [d.messages[0]] }] }), /a second group/);
  broken((d) => (d.messages[2].alt[0].messages = []), /case 1 \("If the cache has the page"\) must have at least one message/);
  broken((d) => (d.messages[2].alt[0].messages[0] = { alt: [] }), /a group cannot sit inside a group/);
  broken((d) => (d.messages = Array.from({ length: 25 }, () => ({ from: "browser", to: "app", verb: "ask" }))), /at most 24 messages; this one has 25/);
  broken((d) => (d.place = "walk"), /a sequence diagram sits in the text flow/);
  broken((d) => (d.participants[0].name = "x".repeat(21)), /21 characters long; the most is 20/);
});

test("check tests a sequence diagram in a document like any other diagram", () => {
  const template = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "template.html"), "utf8");
  const page = template.replace("</main>", `<figure><div class="fig" role="region" aria-label="Figure 9" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div></figure></main>`);
  const built = stampHtml(renderDocument(page).html).html;
  assert.deepEqual(checkDocument(built), { errors: [], warnings: [] });
  assert.match(checkDocument(built.replace("check the session.</li>", "check it.</li>")).errors.join(), /diagram 3 \("page"\): the drawing does not match its data; run render/, "the words are part of the drawing");
});
