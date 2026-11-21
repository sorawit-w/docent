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

const uml = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "sequence-uml.json"), "utf8"));

test("a sequence diagram in UML notation: a filled head for a call, a dashed reply with an open head, activation bars, and one frame per fragment", () => {
  const { svg, scene } = renderDiagram(fixture());
  const css = svg.split("</style>")[0];
  assert.equal(scene.tracks.length, 4, "one track for each lifeline");
  assert.equal((svg.match(/<g class="leg[^"]*" data-leg="\d+">/g) || []).length, 7, "seven messages in the desktop form");
  assert.equal((svg.match(/<g class="leg is-reply" data-leg="(4|6|7)">/g) || []).length, 3, "the three replies");
  assert.match(css, /\.leg\.is-reply \.line\{stroke-dasharray:6 4;stroke-linecap:butt\}/, "a reply is dashed, as in UML");
  assert.match(svg, /data-leg="1"><path [^>]*\/><polygon [^>]*class="head"\/>/, "a call that waits has a filled arrowhead");
  assert.match(svg, /data-leg="4"><path [^>]*\/><polyline [^>]*class="ohead"\/>/, "a reply has an open arrowhead");
  const loop = scene.legs.find((leg) => leg.n === 2);
  assert.equal(loop.pts.length, 4, "a call to itself is a loop to the right of the track");
  assert.deepEqual(scene.bars.map((b) => b.h), [20, 378, 44, 44], "a short bar for the call to itself, and a bar for each answered call, from the call to its reply");
  assert.equal(scene.bars[0].x, scene.bars[1].x + 6, "the bar of a call to itself sits beside the bar it starts on");
  assert.equal(scene.frames.length, 1, "one frame for the alt");
  assert.equal(scene.frames[0].op, "alt");
  assert.deepEqual(scene.frames[0].guards.map((g) => g.s), ["[If the cache has the page]", "[If not]"]);
  assert.equal(scene.frames[0].dividers.length, 1, "a dashed line between the two cases");
  assert.match(svg, /<rect [^>]*class="band"\/><text [^>]*class="sub"[^>]*>\[If not\]<\/text>/, "a guard stops the tracks behind it");
  assert.doesNotMatch(svg, /rx="10" class="card"/, "a lifeline head is a plain box");
});

test("a sequence diagram draws async messages, create, destroy, every fragment and a ref, and keeps the spacing rules", () => {
  const { svg, scene } = renderDiagram(uml());
  assert.deepEqual(check(scene), []);
  assert.deepEqual(scene.frames.map((f) => f.op), ["ref", "loop", "opt", "break", "par"]);
  assert.equal(scene.frames.find((f) => f.op === "opt").x, 16, "a fragment inside a fragment is inset");
  assert.match(svg, /data-leg="7"><path [^>]*\/><polyline [^>]*class="ohead"\/>/, "a message that does not wait has an open head on a solid line");
  assert.doesNotMatch(svg, /<g class="leg is-reply" data-leg="7">/);
  const session = scene.parts.find((p) => p.id === "session");
  assert.ok(session.y > 150, "a created lifeline starts at the message that creates it");
  const created = scene.legs.find((l) => l.n === 2);
  assert.equal(created.pts[1][0], session.x, "the message that creates a lifeline points at its head");
  const track = scene.tracks[3];
  assert.equal(track[3], scene.legs.find((l) => l.n === 8).pts[0][1], "an ended lifeline stops at the message that ends it");
  assert.equal(scene.crosses.length, 1, "with a cross");
  const server = scene.bars.find((b) => b.x === 229);
  assert.ok(server && server.y + server.h === scene.legs.find((l) => l.n === 9).pts[0][1], "the server is busy until its last reply, not the reply inside break");
  assert.match(svg, />ref<\/text>[^]*>Log in<\/text>/);
});

test("a ref frame is wide enough for its name, and a band is painted under the bands inside it", () => {
  const { scene } = renderDiagram({ id: "auth", kind: "sequence", label: "The client logs in, then asks the server.", participants: [{ id: "client", name: "Client" }, { id: "server", name: "Server" }], messages: [{ ref: "Authenticate the current session", over: ["client"] }, { from: "client", to: "server", verb: "ask" }] });
  const ref = scene.frames.find((f) => f.ref);
  assert.ok(ref.x >= 0 && ref.x + ref.w <= scene.w, "the frame sits inside the drawing");
  assert.ok(ref.w >= 32 + 230, `the frame holds its name: ${ref.w}px`);
  const svg = renderDiagram(uml()).svg.split('class="dg dg-script')[1];
  const loop = svg.indexOf(">loop [for each item]<"), opt = svg.indexOf(">opt [If the item is low]<");
  assert.ok(loop > 0 && opt > loop, "the loop band comes before the opt band inside it");
});

test("a sequence diagram has a script form for phones, and the steps in words with a key to the marks", () => {
  const { svg } = renderDiagram(fixture());
  assert.match(svg, /<svg id="dg-page-phone" class="dg dg-script dg-auto"[^>]* width="264"/);
  assert.match(svg, />Web app → itself<\/text><text [^>]*class="verb"[^>]*>check the session<\/text>/);
  assert.match(svg, />Cache → Web app<\/text><text [^>]*class="verb"[^>]*>reply: page<\/text>/);
  assert.match(svg, />alt \[If not\]<\/text>/, "a band names its operator and its guard");
  assert.match(svg, /@media print\{#dg-page\{display:block!important\}#dg-page-phone\{display:none!important\}\}/, "on paper the desktop form shrinks to the sheet, since it keeps more than 80% of its size");
  assert.match(svg, /<details class="dg-words">\n<summary>[^]*The diagram in words<\/summary>\n<ol><li value="1">Browser to Web app: ask for the page\.<\/li><li value="2">Web app to itself: check the session\.<\/li><\/ol>\n<p>One of these happens\.<\/p>\n<p>If the cache has the page:<\/p>\n<ol><li value="3">Web app to Cache: read\.<\/li><li value="4">Cache to Web app: page \(a reply\)\.<\/li><\/ol>/);
  assert.match(svg, /<p>Key to the marks:<\/p>\n<ul><li>A solid line with a filled arrowhead: a call that waits for its answer\.<\/li><li>A dashed line with an open arrowhead: the answer to a call\.<\/li><li>A thin bar on a lifeline: the participant is busy with a call\.<\/li><li>alt: one of the cases happens, chosen by the condition in brackets\.<\/li><\/ul>/, "the key names only the marks this drawing uses");
  const words = renderDiagram(uml()).svg.split('<details class="dg-words">')[1];
  assert.match(words, /<li value="7">Server to Mail: send the receipt \(it does not wait for an answer\)\.<\/li>/);
  assert.match(words, /Server to Session: open \(this creates Session\)\./);
  assert.match(words, /Server to Session: close \(this ends Session\)\./);
  assert.match(words, /<p>Repeated, for each item:<\/p>/);
  assert.match(words, /<p>Only if the item is low:<\/p>/);
  assert.match(words, /<p>If a payment fails: this happens, and the rest is skipped:<\/p>/);
  assert.match(words, /<p>These happen at the same time\.<\/p>/);
  assert.match(words, /The steps of “Log in” happen here, between Shop app and Server/);
  for (const k of ["A cross at the end of a lifeline", "loop:", "opt:", "break:", "par:", "ref:", "A solid line with an open arrowhead"]) assert.ok(words.includes(k), `the key has "${k}"`);
  assert.ok(!words.includes("alt:") && !words.includes("critical:"), "the key leaves out what the drawing does not use");
});

test("wrong sequence data is refused with a plain reason", () => {
  const broken = (change, reason, base = fixture) => { const copy = base(); change(copy); assert.throws(() => renderDiagram(copy), reason); };
  broken((d) => (d.kind = "timeline"), /"kind" must be one of "sequence", "flow", .*or left out/);
  broken((d) => (d.participants.length = 1), /2 to 6 participants; this one has 1/);
  broken((d) => d.participants.push(...["e", "f", "g"].map((id) => ({ id, name: id.toUpperCase() }))), /2 to 6 participants; this one has 7/);
  broken((d) => (d.messages[0].to = "nobody"), /message 1 goes from "browser" to "nobody"/);
  broken((d) => (d.messages[1].reply = true), /a reply to itself/);
  broken((d) => (d.messages[0].async = d.messages[0].reply = true), /both a reply and "async"/);
  broken((d) => (d.messages[2].alt[0].messages = []), /case 1 of "alt" \("If the cache has the page"\) must have at least one message/);
  broken((d) => (d.messages[2].alt.length = 1), /"alt" has 2 to 3 cases/);
  broken((d) => delete d.messages[2].alt[1].when, /"when" of case 2 of "alt"/);
  broken((d) => (d.messages[2].alt[0].messages[0] = { opt: { when: "If so", messages: [{ loop: { when: "for each", messages: [d.messages[0]] } }] } }), /a fragment 3 deep; fragments nest at most 2 deep/);
  broken((d) => (d.messages = Array.from({ length: 31 }, () => ({ from: "browser", to: "app", verb: "ask" }))), /at most 30 messages; this one has 31/);
  broken((d) => (d.place = "walk"), /a sequence diagram sits in the text flow/);
  broken((d) => (d.participants[0].name = "x".repeat(21)), /21 characters long; the most is 20/);
  broken((d) => (d.messages[0] = { ref: "Log in", over: ["browser", "cache"] }), /the ref "Log in" covers participants that do not stand side by side/);
  broken((d) => (d.messages[0] = { ref: "Log in" }), /the ref "Log in" needs "over"/);
  broken((d) => (d.messages[1] = { from: "app", to: "app", verb: "x", create: true }), /creates its own sender/);
  broken((d) => d.messages.unshift({ from: "server", to: "session", verb: "peek" }), /message 1 uses "session" before message 3 creates it/, uml);
  broken((d) => d.messages.push({ from: "server", to: "session", verb: "poke" }), /message 10 uses "session" after message 8 ends it/, uml);
});

test("check tests a sequence diagram in a document like any other diagram", () => {
  const template = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "template.html"), "utf8");
  const page = template.replace("</main>", `<figure><div class="fig" role="region" aria-label="Figure 9" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div></figure></main>`);
  const built = stampHtml(renderDocument(page).html).html;
  assert.deepEqual(checkDocument(built), { errors: [], warnings: [] });
  assert.match(checkDocument(built.replace("check the session.</li>", "check it.</li>")).errors.join(), /diagram 3 \("page"\): the drawing does not match its data; run render/, "the words are part of the drawing");
});
