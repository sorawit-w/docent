// Funnels: the steps of one flow as bars from 0, with every drop and share computed from the counts.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { share, comma } = require("../skills/docent/scripts/lib/funnel.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const fixture = () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "funnel.json"), "utf8"));
const FONT = { row: [14, 400], val: [12, 400], sub: [12, 400] };
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
const rects = (scene) => scene.parts.flatMap((p) => [...p.svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="4" class="([^"]+)"/g)].map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4], cls: m[5], w: +m[3] })));
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** Two texts, or a text and a bar, that meet; and any text past the edges of the drawing. */
function clashes(scene) {
  const texts = scene.notes.map(box), bars = rects(scene), out = [];
  texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => meet(a, b) && out.push(`${a.s} / ${b.s}`)));
  for (const t of texts) {
    for (const b of bars) if (meet(t, b)) out.push(`${t.s} / bar`);
    if (t.x0 < 12 || t.x1 > scene.w - 12) out.push(`${t.s} / edge`);
  }
  return out;
}
const words = (d) => renderDiagram(d).svg.split("<details")[1];

test("a funnel matches the stored drawing", () => {
  const { svg, form, warnings } = renderDiagram(fixture());
  assert.equal(form, "funnel");
  assert.deepEqual(warnings, []);
  const file = path.join(__dirname, "expected", "funnel.svg");
  if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
  assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), "funnel.svg changed; look at the drawing, then run with UPDATE=1");
});

test("the worked example has the numbers and the sizes of the proposal, in both forms", () => {
  const { scene, phone } = renderDiagram(fixture());
  const drops = (sc) => sc.notes.filter((n) => n.s.startsWith("−")).map((n) => [n.s, Math.round(n.x)]);
  assert.deepEqual(drops(scene), [["−4,240 (34%)", 511], ["−4,120 (50%)", 404], ["−1,220 (30%)", 373], ["−1,040 (36%)", 346]]);
  // On a phone the first drop would pass the right edge, so it moves left until it fits.
  assert.deepEqual(drops(phone), [["−4,240 (34%)", 162], ["−4,120 (50%)", 94], ["−1,220 (30%)", 72], ["−1,040 (36%)", 53]]);
  const bars = rects(scene);
  assert.deepEqual(bars.filter((b) => b.cls === "r-bar").map((b) => [b.x0, Math.round(b.w * 10) / 10]), [[298, 322], [298, 212.6], [298, 106.3], [298, 74.8], [298, 48]]);
  // Each lost part starts 4px under its kept bar, so the part that shows is 4px shorter than the rect.
  assert.deepEqual(bars.filter((b) => b.cls === "f-lost").map((b) => Math.round((b.w - 4) * 10) / 10), [109.4, 106.3, 31.5, 26.8]);
  assert.deepEqual(scene.notes.filter((n) => /%$/.test(n.s)).map((n) => n.s), ["100%", "66%", "33%", "23%", "15%"]);
  assert.deepEqual(phone.notes.filter((n) => n.cls === "row").map((n) => n.s), ["Open the sign-up", "page", "Fill in the form", "Confirm the email", "Choose a plan", "Finish the sign-up"]);
  assert.deepEqual(phone.notes.filter((n) => n.cls === "sub").length, 2, "the line above the bars takes 2 lines on a phone");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("the diagram in words has both shares, and names where the most people and the largest share left", () => {
  const w = words(fixture());
  assert.match(w, /<th scope="col">People<\/th><th scope="col">Share of the first step<\/th><th scope="col">Left since the step before<\/th><th scope="col">Share of the step before<\/th>/);
  assert.match(w, /<th scope="row">Open the sign-up page<\/th><td>12,480<\/td><td>100%<\/td><td colspan="2">first step<\/td>/);
  assert.match(w, /<th scope="row">Confirm the email<\/th><td>4,120<\/td><td>33%<\/td><td>4,120<\/td><td>50%<\/td>/);
  assert.match(w, /<li>Of 12,480 people at the first step, 1,860 reached the last step: 15%\.<\/li>/);
  assert.match(w, /<li>The most people left between "Open the sign-up page" and "Fill in the form": 4,240\.<\/li><li>The largest share left between "Fill in the form" and "Confirm the email": 50% of the step before\.<\/li><li>The bars are to scale, from 0\.<\/li>/);
  // The same pair of steps loses the most people and the largest share: one line.
  const one = fixture();
  one.steps = [{ name: "A", count: 1000 }, { name: "B", count: 400 }, { name: "C", count: 300 }];
  assert.match(words(one), /<li>The most people, and the largest share, left between "A" and "B": 600, 60% of the step before\.<\/li>/);
  // Two equal drops: the line names each pair, in order.
  const tie = fixture();
  tie.steps = [{ name: "A", count: 1000 }, { name: "B", count: 800 }, { name: "C", count: 600 }];
  assert.match(words(tie), /<li>The most people left between "A" and "B", and between "B" and "C": 200\.<\/li><li>The largest share left between "B" and "C": 25% of the step before\.<\/li>/);
  const none = fixture();
  none.steps = [{ name: "A", count: 50 }, { name: "B", count: 50 }, { name: "C", count: 50 }];
  assert.match(words(none), /<li>No one left between two steps\.<\/li>/);
});

test("a share is rounded to a whole percent, and a small share keeps one decimal", () => {
  assert.deepEqual([share(0, 9), share(9, 9), share(1, 2), share(1, 8), share(4, 1000), share(1, 2000), share(996, 1000), share(9999, 10000), share(45, 10000)], ["0%", "100%", "50%", "13%", "0.4%", "under 0.1%", "99.6%", "over 99.9%", "0.5%"]);
  assert.deepEqual([comma(0), comma(999), comma(1860), comma(999999999)], ["0", "999", "1,860", "999,999,999"]);
});

test("equal counts, a last count of 0 and a bar under 2px are drawn honestly", () => {
  const d = fixture();
  d.steps = [{ name: "Open", count: 12480 }, { name: "Stay", count: 12480 }, { name: "Few", count: 62 }, { name: "None", count: 0 }];
  const { scene, phone, svg, warnings } = renderDiagram(d);
  for (const sc of [scene, phone]) {
    const notes = sc.notes.map((n) => n.s);
    assert.ok(notes.includes("0 (0%)") && notes.includes("−12,418 (99.5%)") && notes.includes("−62 (100%)"));
    const bars = rects(sc);
    assert.equal(bars.filter((b) => b.cls === "r-bar").length, 3, "a count of 0 has no bar");
    assert.equal(sc.parts[1].svg.includes("f-lost"), false, "equal counts have no lost part");
    assert.deepEqual(clashes(sc), []);
  }
  // On a phone 62 of 12,480 is 1.1px, so the bar is drawn 2px wide, and the words say so.
  assert.equal(rects(phone).filter((b) => b.cls === "r-bar")[2].w, 2);
  assert.match(svg, /a bar narrower than 2px is drawn 2px wide, so it shows/);
  assert.deepEqual(warnings, []);
});

test("long names wrap in both forms; on a phone they push their numbers to their own line", () => {
  const d = fixture();
  d.unit = "subscription orders";
  d.steps = [{ name: "WWWWWWWWW WWWWWWWWW WWWWWWWW", count: 999999999 }, { name: "打开注册页面并填写表格然后确认电子邮件选择计划完成注册", count: 900000000 }, { name: "Done", count: 5 }];
  const { scene, phone } = renderDiagram(d);
  const lines = (sc, start) => { const at = sc.notes.findIndex((n) => n.s === start); let k = 0; while (sc.notes[at + k]?.cls === "row") k++; return k; };
  assert.equal(lines(scene, "WWWWWWWWW"), 3);
  assert.equal(lines(phone, "WWWWWWWWW"), 3);
  assert.equal(scene.notes.filter((n) => n.cls === "row" && /\p{Script=Han}/u.test(n.s)).length, 2, "a name without spaces breaks between characters");
  // On a phone, with 999,999,999 beside it, the name has no room for 2 lines, so the numbers stand under it.
  const name = phone.notes.filter((n) => n.cls === "row" && n.s === "WWWWWWWW")[0], count = phone.notes.find((n) => n.s === "999,999,999");
  assert.ok(count.y > name.y, "the numbers stand under the last line of the name");
  assert.equal(phone.notes.filter((n) => n.cls === "sub").length, 3, "the line above the bars takes 3 lines on a phone with a long unit");
  for (const sc of [scene, phone]) assert.deepEqual(clashes(sc), []);
});

test("wrong funnel data is refused with a plain reason", () => {
  const broken = (change, reason) => { const d = fixture(); change(d); assert.throws(() => renderDiagram(d), reason); };
  broken((d) => (d.steps = "x"), /"steps" must be a list of 2 to 8 steps, in the order people take them/);
  broken((d) => (d.steps = Array.from({ length: 9 }, (_, i) => ({ name: `S${i}`, count: 9 - i }))), /a funnel has 2 to 8 steps; this one has 9/);
  broken((d) => (d.steps[1].name = "Anmeldebestätigungsformularfeld"), /the name of step 2 is 31 characters long; the most is 28/);
  broken((d) => (d.steps[1].name = "Anmeldebestätigungsformular"), /the name of step 2 has the word "Anmeldebestätigungsformular", \d+px wide at 14px; a word in a step name fits in 200px/);
  broken((d) => delete d.steps[1].count, /step 2 \("Fill in the form"\) has no "count"; give it the number who reached this step/);
  broken((d) => (d.steps[2].count = 4120.5), /step 3 \("Confirm the email"\) has "count": 4120.5; a count is a whole number from 0 to 999,999,999/);
  broken((d) => (d.steps[2].count = "4120"), /has "count": "4120"; a count is a whole number/);
  broken((d) => (d.steps[0].count = 1200000000), /step 1 \("Open the sign-up page"\) has 1,200,000,000; a count is at most 999,999,999\. Count in thousands/);
  broken((d) => (d.steps[0].count = 0), /step 1 \("Open the sign-up page"\) has 0; a funnel starts with at least 1/);
  broken((d) => (d.steps[2].count = 8600), /step 3 \("Confirm the email"\) has 8,600, and step 2 \("Fill in the form"\) has 8,240; no step has more than the step before\. .*use a table/);
  broken((d) => { d.steps[3].count = 0; d.steps[4].count = 0; }, /step 5 \("Finish the sign-up"\) comes after a step with 0; end the funnel at the first step with 0/);
  broken((d) => delete d.unit, /a funnel needs a "unit": what each count counts, such as "people" or "sessions"/);
  broken((d) => (d.unit = "subscription renewal orders"), /the unit of the funnel is 27 characters long; the most is 20/);
  broken((d) => (d.steps[2].state = "err"), /step 3 \("Confirm the email"\) has a "state"; a funnel has none\. .*green, amber and red mean status only/);
  broken((d) => (d.steps[2].note = "new in May"), /step 3 \("Confirm the email"\) has a "note"; a funnel step has none/);
  broken((d) => (d.scale = { from: 0, to: 1 }), /a funnel has no "scale"; its bars always run from 0 to the count of the first step/);
  broken((d) => (d.rows = []), /a funnel has no "rows"; write each step in "steps", with its "count"/);
  broken((d) => (d.groups = []), /a funnel has no "groups"; to compare two groups, write one funnel for each/);
  broken((d) => (d.form = "wide"), /a funnel has no "form"; the renderer draws it 640px wide, and 264px wide on a phone/);
  broken((d) => (d.place = "page"), /a funnel sits in the text flow; "place" must be "flow"/);
});

test("the fit warnings name a sentence or a table when a funnel shows little", () => {
  const warn = (steps) => { const d = fixture(); d.steps = steps; return renderDiagram(d).warnings; };
  assert.deepEqual(warn([{ name: "A", count: 10 }, { name: "B", count: 4 }]), ["the funnel has 2 steps; a sentence says this more simply"]);
  assert.deepEqual(warn([{ name: "A", count: 10 }, { name: "B", count: 10 }, { name: "C", count: 10 }]), ["no step loses anyone; a sentence says this more simply"]);
  assert.deepEqual(warn([{ name: "A", count: 1000 }, { name: "B", count: 980 }, { name: "C", count: 960 }]), ["the last step keeps 96% of the first, so the bars look almost the same; a table shows small drops better"]);
  assert.deepEqual(warn([{ name: "A", count: 1000 }, { name: "B", count: 980 }, { name: "C", count: 949 }]), []);
});

test("a funnel takes every color from the page tokens, and has no state, no dot and nothing dashed", () => {
  const { svg } = renderDiagram(fixture());
  const bare = svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, "");
  assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(/i);
  assert.doesNotMatch(svg, /is-(ok|warn|err)|class="pulse|dasharray/);
  assert.match(svg, /\.f-lost\{fill:var\(--line,#d3d6e3\)\}/);
});

test("check accepts a funnel that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, sign-ups" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(fixture(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>Sign-ups in May.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace(">−4,120 (50%)<", ">−4,120 (40%)<")).errors.join("\n"), /\("signup-may"\): the drawing does not match its data; run render/);
});
