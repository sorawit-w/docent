// The renderer, tested against stored drawings. Run with UPDATE=1 to store new expected output after a wanted change.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument, formsFor, readData } = require("../skills/docent/scripts/lib/diagram.cjs");
const { check } = require("../skills/docent/scripts/lib/geometry.cjs");
const { iconProblem, ICONS } = require("../skills/docent/scripts/lib/icons.cjs");

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const CASES = [
  ["bug-report", "wide"], ["bug-report", "tall"], ["bug-report", "plates"],
  ["order", "wide"], ["order", "tall"], ["order", "plates"],
  ["review", "wide"], ["review", "tall"], ["review", "plates"],
  ["long-route", "wide"], ["long-route", "tall"], ["branch", "plates"], ["dense", "plates"],
  ["pipeline", "wide"], ["pipeline", "tall"], ["pipeline", "plates"], ["skip", "plates"],
  ["five", "wide"], ["five", "tall"], ["five", "plates"], ["side", "tall"],
];

for (const [name, form] of CASES) {
  test(`${name} as ${form} matches the stored drawing and keeps every spacing rule`, () => {
    const { svg, scene } = renderDiagram({ ...fixture(name), form, place: form === "tall" ? "walk" : "flow" });
    assert.deepEqual(check(scene), []);
    const file = path.join(__dirname, "expected", `${name}.${form}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.${form}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("the renderer picks the form from where the diagram sits and what it shows", () => {
  const pick = (data) => formsFor(readData(data).model)[0];
  assert.equal(pick(fixture("bug-report")), "wide", "a short route in the text flow");
  assert.equal(pick({ ...fixture("bug-report"), place: "walk" }), "tall", "a route beside walkthrough steps");
  assert.equal(pick(fixture("long-route")), "tall", "a long route");
  assert.equal(pick(fixture("branch")), "plates", "paths that branch");
  assert.equal(pick({ ...fixture("bug-report"), form: "plates" }), "plates", "the author's choice wins");
  const wordy = fixture("bug-report");
  wordy.parts[0].note = "what went wrong, and on which day";
  assert.equal(renderDiagram(wordy).form, "wide", "a long note no longer forces Plates: the spacing rules decide");
});

test("a walkthrough drawing lights the current leg; any other drawing runs one dot along the whole route, twice", () => {
  const walk = renderDiagram({ ...fixture("bug-report"), place: "walk" }).svg;
  assert.match(walk, /class="dg dg-tall"/);
  assert.match(walk, /\.leg\.is-current \.pulse\{display:block;animation:2\.4s linear infinite\}/);
  const flow = renderDiagram(fixture("bug-report")).svg;
  assert.match(flow, /class="dg dg-wide dg-auto"/);
  assert.match(flow, /\.pulse\{display:block;animation:7\.6s linear 2 both\}/);
  for (const svg of [walk, flow]) {
    assert.equal((svg.match(/@keyframes /g) || []).length, 8, "one set of keyframes for each leg, in the main form and in the phone form");
    assert.match(svg, /@media \(prefers-reduced-motion:reduce\)/);
    assert.match(svg, /@media print\{[^@]*\.pulse\{display:none!important\}/);
    assert.ok(!/animation[^;}]*(width|height|top|left|margin)/.test(svg), "only transform and opacity move");
  }
});

test("the dot passes under the numbered mark of its leg, so the number stays readable", () => {
  const { svg } = renderDiagram(fixture("bug-report"));
  const legs = [...svg.matchAll(/<g class="leg[^"]*" data-leg="\d+">([\s\S]*?)<\/g>/g)].map((m) => m[1]);
  assert.ok(legs.length >= 4);
  for (const leg of legs) assert.ok(leg.indexOf('class="pulse') < leg.indexOf('class="mark"'), "the dot comes before the mark, so the mark is drawn on top");
});

test("a drawing that is too wide beside walkthrough steps gets a warning that names the cause", () => {
  assert.deepEqual(renderDiagram({ ...fixture("bug-report"), place: "walk" }).warnings, [], "two lanes with short texts fit");
  const [warning] = renderDiagram({ ...fixture("order"), place: "walk" }).warnings;
  assert.match(warning, /^the drawing is \d+px wide; beside the walkthrough steps there is room for 520px, so it will scroll sideways\. It has 3 lanes, and two lanes fit there\. The widest texts are "packed and weighed" and "Payment check"; shorter names and notes make the drawing narrower$/);
  // One more path makes the route into data that branches. Then the cause is the path, not the texts.
  const branched = { ...fixture("bug-report"), place: "walk" };
  branched.parts = [...branched.parts, { id: "known", lane: "reporter", name: "Known issues", note: "an older report", icon: "document" }];
  branched.legs = [...branched.legs, { from: "known", to: "triage", verb: "link", optional: true }];
  const [choice, ...more] = renderDiagram(branched).warnings.filter((w) => w.startsWith("the drawing is"));
  assert.match(choice, /^the drawing is \d+px wide; beside the walkthrough steps there is room for 520px, so it will scroll sideways\. Its data is not a route .*, so it is drawn as Plates, which needs more room\. A walkthrough needs a route\. Choose one: when the extra path is one short branch to a part of its own, write it as a side leg \("side"\); or take the extra path out; or put the diagram in the text flow and write the steps as a numbered list$/);
  assert.ok(!/widest texts/.test(choice), "it does not send the author to shorten texts");
  assert.deepEqual(more, []);
});

test("in Plates one leg meets the side of a plate at the middle, and two legs on one side take the two outer places", () => {
  const branched = { ...fixture("bug-report") };
  branched.parts = [...branched.parts, { id: "known", lane: "reporter", name: "Known issues", note: "an older report", icon: "document" }];
  branched.legs = [...branched.legs, { from: "known", to: "triage", verb: "link", optional: true }];
  const seen = { one: 0, two: 0 };
  for (const data of [...["bug-report", "order", "long-route", "branch", "dense", "pipeline", "skip"].map(fixture), branched]) {
    const { scene } = renderDiagram({ ...data, form: "plates", place: "flow" });
    const sides = new Map();
    for (const leg of scene.legs) for (const [id, [x, y]] of [[leg.from, leg.pts[0]], [leg.to, leg.pts[leg.pts.length - 1]]]) {
      const card = scene.parts.find((part) => part.id === id);
      const side = Math.abs(x - card.x) <= 2 ? "left" : Math.abs(x - card.x - card.w) <= 2 ? "right" : null;
      if (side) sides.set(`${id}, ${side} side`, [...(sides.get(`${id}, ${side} side`) || []), Math.round(y - card.y - card.h / 2)].sort((p, q) => p - q));
    }
    for (const [side, at] of sides) {
      if (at.length === 1) { seen.one += 1; assert.deepEqual(at, [0], `${data.id}: ${side}: one leg meets the middle`); }
      if (at.length === 2) { seen.two += 1; assert.deepEqual(at, [-14, 14], `${data.id}: ${side}: two legs take the outer places`); }
    }
  }
  assert.ok(seen.one >= 20 && seen.two >= 3, `the fixtures hold both cases: ${JSON.stringify(seen)}`);
});

test("a part with a state takes the status color on its outline and gets a status dot", () => {
  const { svg, warnings } = renderDiagram(fixture("pipeline"));
  assert.deepEqual(warnings, []);
  const [main, phone] = svg.split('\n<svg id="dg-pipeline-phone"');
  for (const form of [main, phone]) {
    assert.equal((form.match(/class="stop is-(ok|warn|err)"/g) || []).length, 3, "three parts have a state");
    assert.equal((form.match(/class="flag is-(ok|warn|err)"/g) || []).length, 3, "each of them has a status dot");
    assert.match(form, /\.stop\.is-err,#dg-pipeline[\w-]* \.card\.is-err\{stroke:var\(--err,#cf222e\);stroke-width:1\.5\}/, "the color comes from the page, with the light value for a copy");
    assert.match(form, /\.flag\.is-ok\{fill:var\(--ok,#1a7f37\);stroke:var\(--bg,#fbfbfe\);stroke-width:2\}/);
    assert.ok(!/\.(icon|name|sub|line|head)[^{]*\{[^}]*--(ok|warn|err)/.test(form), "icons, texts and legs never take a status color");
  }
  assert.match(renderDiagram({ ...fixture("pipeline"), form: "plates" }).svg, /class="card is-warn"/);
  assert.ok(!/is-(ok|warn|err)|--(ok|warn|err)/.test(renderDiagram(fixture("bug-report")).svg), "a drawing with no state carries no status rule");
  const broken = (change, reason) => { const copy = fixture("pipeline"); change(copy); assert.throws(() => renderDiagram(copy), reason); };
  broken((d) => (d.parts[1].state = "done"), /the state of part 2 must be "ok", "warn" or "err"/);
  broken((d) => delete d.parts[1].note, /part 2 has a state but no note; the note must say the status in words/);
  broken((d) => (d.parts[0].status = "ok"), /part 1 has the field "status"; the field is named "state"/);
  const same = fixture("pipeline");
  same.parts.forEach((part) => (part.state = "ok"));
  const all = renderDiagram(same);
  assert.match(all.warnings[0], /every part has the state "ok", so the color shows nothing/);
  assert.deepEqual(all.icons, [], "this warning is not about an icon, so check reports it as a warning");
});

test("an optional leg is drawn dashed", () => {
  const svg = renderDiagram(fixture("skip")).svg.split("\n<svg")[0]; // the main form; the column form shows leg 3 as a go-to row
  assert.equal((svg.match(/<g class="leg is-optional" data-leg="3">/g) || []).length, 1, "leg 3 is the optional one");
  assert.equal((svg.match(/<g class="leg" data-leg=/g) || []).length, 4, "the other four legs are plain");
  assert.match(svg, /#dg-skip \.leg\.is-optional \.line\{stroke-dasharray:5 7\}/);
  assert.ok(!/is-optional|stroke-dasharray/.test(renderDiagram(fixture("bug-report")).svg), "a drawing with no optional leg carries no dash rule");
  const wrong = fixture("skip");
  wrong.legs[2].optional = "yes";
  assert.throws(() => renderDiagram(wrong), /"optional" of leg 3 must be true or false/);
});

test("data that is not a route gets the column form on a phone: a leg that is not to the next part becomes a go-to row", () => {
  const { svg, warnings } = renderDiagram(fixture("skip"));
  assert.deepEqual(warnings, [], "with a phone form, no arrow is off the first phone screen");
  assert.match(svg, /<svg id="dg-skip-phone" class="dg dg-column dg-auto"[^>]* width="264"/);
  assert.match(svg, /<g class="jump is-optional" data-leg="3"><circle [^>]*class="mark"\/><text [^>]*class="num"[^>]*>3<\/text><text [^>]*class="verb"[^>]*>skip the review<\/text><text [^>]*class="sub"[^>]*>to Answer<\/text><\/g>/, "the optional skip is a go-to row with a dashed mark");
  assert.match(svg, /\.jump\.is-optional \.mark\{stroke-dasharray:3 3\}/);
  const branch = renderDiagram(fixture("branch")).svg;
  assert.match(branch, />back to Leave request<\/text>/, "a leg that goes up says \"back to\"");
  assert.equal((branch.match(/class="stop end"/g) || []).length, 1, "a part where no leg starts has a filled ring");
});

test("a route also gets a single-track form for phones", () => {
  const route = renderDiagram(fixture("bug-report")).svg;
  assert.match(route, /<svg id="dg-path" class="dg dg-wide dg-auto"/);
  assert.match(route, /<svg id="dg-path-phone" class="dg dg-track dg-auto"[^>]* width="264"/);
  assert.match(route, /#dg-path-phone\{display:none\}/, "the main form hides the phone form");
  assert.match(route, /@media \(max-width:954px\)\{#dg-path\{display:none\}#dg-path-phone\{display:block\}\}/, "below the width that the main form needs, the phone form takes its place");
  assert.match(renderDiagram(fixture("branch")).svg, /<svg id="dg-leave-phone" class="dg dg-column/, "paths that branch get the column form instead");
});

test("wrong data is refused with a plain reason", () => {
  const data = fixture("bug-report");
  const broken = (change, reason) => { const copy = structuredClone(data); change(copy); assert.throws(() => renderDiagram(copy), reason); };
  broken((d) => (d.parts[0].lane = "nobody"), /names the lane "nobody"/);
  broken((d) => (d.legs[0].to = "report"), /starts and ends at the same part/);
  broken((d) => (d.parts[0].name = "x".repeat(40)), /40 characters long; the most is 32/);
  broken((d) => (d.id = "Bad Id"), /"id" must be a short id/);
  broken((d) => delete d.label, /"label" is missing/);
  broken((d) => (d.parts[1].id = "report"), /two parts have the id "report"/);
  assert.throws(() => renderDiagram({ ...fixture("branch"), form: "wide" }), /Route wide needs a route/);
});

test("the spacing rules catch a bad drawing", () => {
  const good = () => renderDiagram({ ...fixture("bug-report"), form: "tall" }).scene;
  const rulesOf = (change) => { const scene = good(); change(scene); return new Set(check(scene).map((p) => p.rule)); };
  assert.ok(rulesOf((s) => { const pts = s.legs[0].pts; pts[2] = [pts[2][0], pts[3][1] - 20]; }).has("R1"), "R1: a short run behind the arrowhead");
  assert.ok(rulesOf((s) => { s.legs[0].mark = [...s.legs[0].pts[1]]; }).has("R2"), "R2: a mark on a bend");
  assert.ok(rulesOf((s) => { s.legs[0].verb.y = s.legs[0].mark[1] - 4; s.legs[0].verb.x += 30; }).has("R3"), "R3: a verb on a line");
  assert.ok(rulesOf((s) => { const pts = s.legs[3].pts; pts[1] = [pts[1][0], pts[0][1] + 50]; }).has("R4"), "R4: a short leg inside one lane");
  assert.ok(rulesOf((s) => { s.parts[1].texts[0].y = s.parts[0].texts[0].y; s.parts[1].texts[0].x = s.parts[0].texts[0].x; s.parts[1].texts[0].anchor = "end"; }).has("R5"), "R5: two texts in one place");
});

test("an icon is accepted only when it is made of plain shapes", () => {
  for (const [name, markup] of Object.entries(ICONS)) assert.equal(iconProblem(markup), null, name);
  assert.equal(iconProblem('<polyline points="2,8 6,12 14,4"/><line x1="1" y1="1" x2="3" y2="3"/>'), null);
  assert.match(iconProblem('<script>alert(1)</script>'), /not a plain shape/);
  assert.match(iconProblem('<style>*{fill:red}</style>'), /not a plain shape/);
  assert.match(iconProblem('<image href="x.png"/>'), /not a plain shape/);
  assert.match(iconProblem('<a href="https://example.com"><circle cx="8" cy="8" r="4"/></a>'), /not a plain shape/);
  assert.match(iconProblem('<path d="M1 1h4" onload="x()"/>'), /attribute "onload"/);
  assert.match(iconProblem('<path d="M1 1h4" style="fill:url(#a)"/>'), /attribute "style"/);
  assert.match(iconProblem('<circle cx="8" cy="8" r="4"/>text'), /not a plain shape/);
  assert.match(iconProblem('<circle cx="8" cy="8" r="1"/>'.repeat(7)), /7 shapes/);
});

test("a bad icon is left out, and then no part of the diagram has an icon", () => {
  const data = fixture("bug-report");
  data.icons = { bug: '<script>alert(1)</script>' };
  data.parts[0].icon = "bug";
  const { svg: both, warnings } = renderDiagram(data);
  const svg = both.slice(0, both.indexOf("</svg>")); // the main form
  assert.ok(!both.includes("<script"));
  assert.match(warnings[0], /the icon "bug" is left out because <script> is not a plain shape/);
  assert.match(warnings[1], /only 4 of 5 parts have an icon/);
  assert.equal((svg.match(/class="icon"/g) || []).length, 0);
  assert.equal((svg.match(/class="icon lane-icon"/g) || []).length, 2, "the lanes keep their icons");
  const own = fixture("bug-report");
  own.icons = { bug: '<circle cx="8" cy="9" r="3.5"/><path d="M8 5.5V3M4.5 9h-2M13.5 9h-2"/>' };
  own.parts[0].icon = "bug";
  assert.deepEqual(renderDiagram(own).warnings, [], "a drawn icon of plain shapes is accepted");
});

test("render draws every diagram block of a document in place, and gives the same result when it runs again", () => {
  const data = JSON.stringify(fixture("bug-report"), null, 1);
  const page = `<main>\n<!-- docent:diagram\n${data}\n-->\n<!-- /docent:diagram -->\n<p>text</p>\n<!-- docent:diagram\n${data.replace('"path"', '"again"')}\n-->\nold drawing\n<!-- /docent:diagram -->\n</main>`;
  const first = renderDocument(page);
  assert.deepEqual(first.results.map((r) => [r.id, r.form, r.error]), [["path", "wide", null], ["again", "wide", null]]);
  assert.ok(first.html.includes('<svg id="dg-path"') && first.html.includes('<svg id="dg-again"') && !first.html.includes("old drawing"));
  assert.ok(first.html.includes(data), "the data stays in the document");
  assert.equal(renderDocument(first.html).html, first.html);
  const twice = renderDocument(page.replace('"again"', '"path"'));
  assert.match(twice.results[1].error, /two diagrams have the id "path"/);
  assert.match(renderDocument("<!-- docent:diagram\n{ not json\n-->\n<!-- /docent:diagram -->").results[0].error, /not valid JSON/);
});

test("the example in references/diagrams.md is drawn without a warning", () => {
  const guide = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "references", "diagrams.md"), "utf8");
  const page = guide.match(/```html\n([\s\S]*?)```/)[1];
  const { results } = renderDocument(page);
  assert.deepEqual(results.map((r) => [r.id, r.form, r.error, r.warnings]), [["order", "wide", null, []]]);
  const blocks = [...guide.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
  const own = JSON.parse(`{${blocks.find((b) => b.includes('"icons"'))}}`).icons.bug;
  assert.equal(iconProblem(own), null);
  const part = JSON.parse(blocks.find((b) => /"state": "(ok|warn|err)"/.test(b)));
  assert.deepEqual([part.state, Boolean(part.note)], ["err", true], "the state example has a note that says the status");
});

test("a verb is optional: the leg keeps its numbered mark, and a drawing with no verb at all gets a warning", () => {
  const five = renderDiagram(fixture("five"));
  assert.deepEqual(five.warnings, []);
  assert.match(five.svg, /data-leg="4">[^]*?class="num"[^>]*>4<\/text><\/g>/, "leg 4 has a mark and no verb text");
  const none = fixture("five");
  none.legs.forEach((leg) => delete leg.verb);
  const bare = renderDiagram(none);
  assert.match(bare.warnings.join(), /no leg has a verb, so the drawing shows the order and nothing else/);
  assert.deepEqual(bare.icons, [], "it is a warning for the author, not an error in check");
  for (const form of ["wide", "tall", "plates"]) assert.deepEqual(check(renderDiagram({ ...none, form }).scene), [], `no verb at all still keeps the rules in ${form}`);
});

test("a diagram has at most 5 lanes", () => {
  const six = fixture("five");
  six.lanes.push({ id: "extra", name: "Extra" });
  six.parts[4].lane = "extra";
  assert.throws(() => renderDiagram(six), /a diagram has 1 to 5 lanes; this one has 6/);
});

test("a side leg beside walkthrough steps: dashed, no number, never lit, and the route keeps one leg for each step", () => {
  const { svg, form, warnings, scene, model } = renderDiagram(fixture("side"));
  assert.equal(form, "tall");
  assert.deepEqual(warnings, [], "it still fits the 520px beside the steps");
  assert.ok(scene.w <= 520);
  assert.equal(model.legs.length, 4, "four legs, so four steps; the side leg is not counted");
  assert.match(svg, /<g class="side"><path [^>]*class="line"\/><polygon [^>]*class="head"\/><text [^>]*class="verb"[^>]*>if it is known<\/text><\/g>/);
  assert.ok(!/<g class="side"[^>]*data-leg/.test(svg), "a side leg has no number, so no step lights it");
  assert.match(svg, /#dg-side \.side \.line\{stroke-dasharray:5 7\}/);
  assert.match(svg, /<g class="jump is-optional"><circle [^>]*class="mark"\/><text [^>]*class="verb"[^>]*>if it is known<\/text><text [^>]*class="sub"[^>]*>to Closed<\/text><\/g>/, "on a phone it is a go-to row with no number");
});

test("wrong side legs are refused with a plain reason", () => {
  const broken = (change, reason) => { const copy = fixture("side"); change(copy); assert.throws(() => renderDiagram(copy), reason); };
  broken((d) => (d.side[0].to = "triage"), /goes to "triage", which a leg of the route also uses/);
  broken((d) => (d.parts.at(-1).lane = "reporter"), /stays in one lane/);
  broken((d) => d.side.push({ from: "steps", to: "closed", verb: "x" }, { from: "steps", to: "closed", verb: "y" }), /at most 2 side legs/);
  broken((d) => d.side.push({ from: "steps", to: "closed", verb: "again" }), /two side legs go to "closed"/);
  broken((d) => (d.form = "wide"), /a diagram with side legs is drawn as Route tall/);
  broken((d) => delete d.side[0].verb, /the verb of side leg 1 is missing/);
  broken((d) => d.legs.push({ from: "version", to: "report", verb: "again" }), /side legs need a route/);
});

test("the full examples in references/diagrams.md are drawn without an error", () => {
  const guide = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "references", "diagrams.md"), "utf8");
  const examples = [...guide.matchAll(/```json\n(\{\n  "id"[\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
  assert.deepEqual(examples.map((d) => renderDiagram(d).form), ["sequence", "flow", "activity", "state", "interaction-overview", "timing", "usecase", "class", "object", "package", "profile", "component", "composite", "deployment", "communication", "range", "timeline", "layout", "plan", "funnel", "bar", "bar", "line", "line", "heatmap", "heatplan", "statusgrid"]);
});

test("render --data draws a diagram of any kind, and builds a widget only from a widget kind", () => {
  const { spawnSync } = require("node:child_process");
  const run = (name) => spawnSync(process.execPath, [path.join(__dirname, "../skills/docent/scripts/render.cjs"), "--data", path.join(__dirname, "fixtures", `${name}.json`)], { encoding: "utf8" });
  for (const name of ["bug-report", "sequence", "flow", "state", "class", "range", "layout-a4", "funnel", "bar-reports", "line-reports", "heatmap-errors", "heatplan-product", "statusgrid-uptime", "timeline-incident"]) {
    const r = run(name);
    assert.equal(r.status, 0, `${name}: ${r.stderr}`);
    assert.match(r.stdout, /^<svg/, `${name} is drawn as a diagram`);
  }
  const w = run("widget-chooser");
  assert.equal(w.status, 0, w.stderr);
  assert.match(w.stderr, /built .* as chooser/);
});
