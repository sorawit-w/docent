// Timelines: events and spans on a true time scale, in lanes, drawn with the range chart's rows in a 640px and a 264px form.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { renderDiagram, renderDocument } = require("../skills/docent/scripts/lib/diagram.cjs");
const { checkDocument } = require("../skills/docent/scripts/check.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { textWidth } = require("../skills/docent/scripts/lib/text.cjs");

const load = (name) => () => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
const incident = load("timeline-incident");
const release = load("timeline-release");
const FONT = { row: [14, 400], name: [14, 600], val: [12, 400], sub: [12, 400] };
const box = (n) => {
  const [size, weight] = FONT[n.cls];
  const w = n.cls === "val" ? valueWidth(n.s) : textWidth(n.s, size, weight), x0 = n.anchor === "middle" ? n.x - w / 2 : n.anchor === "end" ? n.x - w : n.x;
  return { x0, x1: x0 + w, y0: n.y - size * 0.8, y1: n.y + size * 0.22, s: n.s };
};
const markBox = (svg) => {
  let m;
  if ((m = svg.match(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/))) return { x0: +m[1], y0: +m[2], x1: +m[1] + +m[3], y1: +m[2] + +m[4] };
  m = svg.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/);
  return { x0: m[1] - m[3], y0: m[2] - m[3], x1: +m[1] + +m[3], y1: +m[2] + +m[3] };
};
const meet = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const ticksOf = (s) => s.notes.filter((n) => n.cls === "val" && !n.knock).map((n) => n.s);
const wordsOf = (svg) => svg.split('<details class="dg-words">')[1];

const roadmap = load("timeline-roadmap");

for (const [name, data] of [["timeline-incident", incident], ["timeline-release", release], ["timeline-roadmap", roadmap]]) {
  test(`a timeline matches the stored drawing: ${name}`, () => {
    const { svg, form } = renderDiagram(data());
    assert.equal(form, "timeline");
    const file = path.join(__dirname, "expected", `${name}.svg`);
    if (process.env.UPDATE) fs.writeFileSync(file, svg + "\n");
    assert.equal(svg + "\n", fs.readFileSync(file, "utf8"), `${name}.svg changed; look at the drawing, then run with UPDATE=1`);
  });
}

test("the incident: a 640px and a 264px form, one band per lane, the rows of each lane in time order, and no warning", () => {
  const { scene, phone, warnings } = renderDiagram(incident());
  assert.deepEqual(warnings, [], "its longest empty stretch is 38% of the scale, under 60%");
  assert.equal(scene.w, 640);
  assert.equal(phone.w, 264);
  for (const s of [scene, phone]) {
    assert.equal(s.legs.length, 0, "nothing moves in a timeline");
    assert.equal(s.parts.length, 14, "one mark per row");
    assert.equal(s.bands.length, 2, "one band per lane");
    assert.equal(s.notes[0].s, "Times in UTC on 12 Nov 2026.", "the line above names the zone and the day");
  }
  assert.deepEqual(scene.parts.map((p) => p.id), ["Deployed to all regions", "Errors pass 5%", "Saving failed", "Alert pages on-call", "Errors peak at 61%", "Errors under 1%", "Change merged", "Page acknowledged", "Incident declared, sev 2", "Read replicas added", "Cause found in the logs", "Rollback starts", "Incident resolved", "Status page closed"], "the lanes in the written order, each sorted by time");
  assert.deepEqual(ticksOf(scene), ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30"], "ticks every 30 minutes on a desktop");
  assert.deepEqual(ticksOf(phone), ["08:00", "09:00", "10:00"], "every hour on a phone");
  const x = (s, id) => +s.parts.find((p) => p.id === id).svg.match(/c?x="([\d.]+)"/)[1];
  // 2.28px a minute on a desktop: the 13 minutes from the deploy to the alert are a true length.
  assert.ok(Math.abs(x(scene, "Alert pages on-call") - x(scene, "Deployed to all regions") - 13 * 376 / 165) < 0.02);
  assert.ok(scene.notes.some((n) => n.s === "08:40–09:27, 47 min" && n.knock), "a span's value: its times and its length");
  assert.ok(scene.h <= 986 - 60, `it fits one A4 page with its caption (${scene.h}px)`);
});

test("the table in words: one order across lanes, the gap since the row before, and lines under it", () => {
  const words = wordsOf(renderDiagram(incident()).svg);
  assert.match(words, /<tr><th scope="col">Time, UTC<\/th><th scope="col">Lane<\/th><th scope="col">What happened<\/th><th scope="col">Note<\/th><th scope="col">Since the last<\/th><\/tr>/);
  assert.match(words, /<tr><td>08:12<\/td><td>The people<\/td><th scope="row" class="whole">Change merged<\/th><td>Platform engineer\. A change/, "the first row in time comes from the second lane");
  assert.match(words, /<tr><td>08:40 – 09:27, 47 min<\/td><td>The system<\/td><th scope="row" class="whole">Saving failed<\/th><td>People could not save changes\. Up to 61% of requests failed\.<\/td><td>same time<\/td><\/tr>/);
  assert.match(words, /<th scope="row" class="whole">Alert pages on-call<\/th><td>[^<]*<\/td><td>\+4 min<\/td>/);
  assert.match(words, /<th scope="row" class="whole">Status page closed<\/th><td>[^<]*<\/td><td>\+1 h 3 min<\/td>/);
  assert.match(words, /<li>14 rows: 13 events and 1 span, from 08:12 to 10:30 UTC \(2 h 18 min\)\.<\/li><li>Longest gap: 1 h 3 min, from 09:27 to 10:30\.<\/li><li>Longest span: Saving failed, 47 min\.<\/li>/);
  assert.equal((words.match(/<tr>/g) || []).length, 15, "a head row and one row per data row");
  assert.doesNotMatch(renderDiagram(incident()).svg.split("<details")[0], /Platform engineer/, "the notes live only in the table");
});

test("no text meets another text or a mark, and every text stays inside the drawing, in both forms", () => {
  for (const data of [incident(), release()]) {
    const r = renderDiagram(data);
    for (const s of [r.scene, r.phone]) {
      const texts = s.notes.map(box), marks = s.parts.map((p) => markBox(p.svg));
      for (const t of texts) assert.ok(t.x0 >= 0 && t.x1 <= s.w, `"${t.s}" runs past the drawing (${s.w}px)`);
      texts.forEach((a, i) => texts.slice(i + 1).forEach((b) => assert.ok(!meet(a, b), `"${a.s}" meets "${b.s}" (${s.w}px)`)));
      for (const t of texts) for (const m of marks) assert.ok(!meet(t, m), `"${t.s}" meets a mark (${s.w}px)`);
    }
  }
});

test("a scale of days: a new year adds the year, and the line above names the dates", () => {
  const { scene, phone, svg } = renderDiagram(release());
  assert.equal(scene.notes[0].s, "Dates from 1 Nov 2026 to 30 Apr 2027.");
  assert.deepEqual(ticksOf(scene), ["1 Nov", "1 Dec", "1 Jan 2027", "1 Feb", "1 Mar", "1 Apr"]);
  assert.deepEqual(ticksOf(phone), ["1 Nov", "30 Apr 2027"], "six months of days keep two labels on a phone");
  assert.ok(scene.notes.some((n) => n.s === "1 Dec–31 Mar 2027, 121 days"), "a date after the first year writes its year");
  assert.match(wordsOf(svg), /<th scope="col">Date<\/th>/, "a scale of days has no zone");
  assert.match(wordsOf(svg), /<li>5 rows: 3 events and 2 spans, from 2 Nov to 1 Apr 2027 \(150 days\)\.<\/li>/);
});

test("a span one day long, and two events at the same time on two rows", () => {
  const base = { id: "short", kind: "timeline", label: "Short things." };
  const day = renderDiagram({ ...base, scale: { from: "2026-11-01", to: "2026-11-30" }, rows: [{ name: "Code freeze", from: "2026-11-12", to: "2026-11-12" }, { name: "Release", at: "2026-11-13" }, { name: "Review", at: "2026-11-20" }] });
  const bar = day.scene.parts[0].svg.match(/width="([\d.]+)"/)[1];
  assert.ok(Math.abs(bar - (day.scene.parts[1].svg.match(/cx="([\d.]+)"/)[1] - day.scene.parts[0].svg.match(/x="([\d.]+)"/)[1])) < 0.02, "a one-day span ends where the next day starts");
  assert.ok(day.scene.notes.some((n) => n.s === "12 Nov, 1 day"), "its value names the one day");
  const same = renderDiagram({ ...base, scale: { from: "08:00", to: "09:00", day: "2026-11-12", zone: "UTC" }, rows: [{ name: "Alert A", at: "08:40" }, { name: "Alert B", at: "08:40" }, { name: "Fixed", at: "08:55" }] });
  const [a, b] = same.scene.parts.map((p) => p.svg.match(/cx="([\d.]+)" cy="([\d.]+)"/).slice(1).map(Number));
  assert.equal(a[0], b[0], "at the same place across");
  assert.equal(b[1] - a[1], 32, "on two rows, 32px apart");
  assert.match(wordsOf(same.svg), /Alert A<\/th><td><\/td><\/tr><tr><td>08:40<\/td><th scope="row" class="whole">Alert B<\/th><td>same time<\/td>/, "rows at the same time keep their written order");
});

test("a scale over midnight writes the date of a later day, and the line above names both ends", () => {
  const { scene, svg } = renderDiagram({ id: "night", kind: "timeline", label: "A night.", scale: { from: "2026-11-12 22:00", to: "2026-11-13 02:00", zone: "UTC" }, rows: [{ name: "Deploy", at: "2026-11-12 22:40" }, { name: "Alert", at: "2026-11-13 00:10" }, { name: "Fixed", at: "2026-11-13 01:30" }] });
  assert.equal(scene.notes[0].s, "Times in UTC, from 12 Nov 2026 22:00 to 13 Nov 2026 02:00.");
  assert.ok(ticksOf(scene).includes("13 Nov"), "the first tick of the new day writes its date");
  assert.ok(scene.notes.some((n) => n.s === "13 Nov 00:10" && n.knock), "a time on a later day writes its date");
  assert.match(wordsOf(svg), /<td>22:40<\/td>[\s\S]*<td>13 Nov 00:10<\/td>[\s\S]*<td>\+1 h 30 min<\/td>/);
});

test("a time before 1970 writes its clock as on any other day", () => {
  const { scene, svg } = renderDiagram({ id: "old", kind: "timeline", label: "An old night.", scale: { from: "08:00", to: "10:00", day: "1969-07-20", zone: "UTC" }, rows: [{ name: "A", at: "08:15" }, { name: "B", from: "08:30", to: "09:45" }, { name: "C", at: "09:50" }] });
  assert.ok(scene.notes.some((n) => n.s === "08:15" && n.knock), "the time beside the mark");
  assert.ok(scene.notes.some((n) => n.s === "08:30–09:45, 1 h 15 min"), "a span's times");
  assert.match(wordsOf(svg), /from 08:15 to 09:50 UTC \(1 h 35 min\)/, "the line under the table");
  assert.doesNotMatch(svg, /-\d+:-?\d+/, "no negative clock anywhere");
});

test("a span whose times both carry a date writes its length alone where the full value is wider than the drawing", () => {
  const data = { id: "days", kind: "timeline", label: "Three days.", scale: { from: "2026-11-12 00:00", to: "2026-11-15 00:00", zone: "UTC" }, rows: [{ name: "Start", at: "2026-11-12 00:00" }, { name: "Long job", from: "2026-11-13 00:10", to: "2026-11-14 23:59" }, { name: "Done", at: "2026-11-14 23:59" }] };
  const { scene, phone, svg } = renderDiagram(data);
  assert.ok(scene.notes.some((n) => n.s === "13 Nov 00:10–14 Nov 23:59, 47 h 49 min"), "the full value on a desktop");
  assert.ok(phone.notes.some((n) => n.s === "47 h 49 min" && n.knock), "the length alone on a phone");
  assert.match(wordsOf(svg), /<td>13 Nov 00:10 – 14 Nov 23:59, 47 h 49 min<\/td>/, "the table keeps the full times");
});

test("the longest gap starts at the last mark before it, as the author wrote it", () => {
  const base = { id: "gap", kind: "timeline", label: "Gaps.", scale: { from: "2026-11-01", to: "2026-11-30" } };
  const words = (rows) => wordsOf(renderDiagram({ ...base, rows }).svg);
  assert.match(words([{ name: "Span", from: "2026-11-01", to: "2026-11-03" }, { name: "Next day", at: "2026-11-04" }, { name: "Later", at: "2026-11-10" }]), /Longest gap: 6 days, from 4 Nov to 10 Nov\./, "an event on the day after a span ends is where the gap starts");
  assert.match(words([{ name: "Span", from: "2026-11-01", to: "2026-11-03" }, { name: "Later", at: "2026-11-10" }]), /Longest gap: 6 days, from 3 Nov to 10 Nov\./, "after a span, the gap starts after its last day");
});

test("fit warnings: 2 rows, equal gaps, lanes always in one state, an empty stretch, a zone with clock changes", () => {
  const warns = (data) => renderDiagram({ id: "w", kind: "timeline", label: "Warnings.", ...data }).warnings.join("\n");
  const scale = { from: "08:00", to: "10:00", day: "2026-11-12", zone: "UTC" };
  assert.match(warns({ scale, rows: [{ name: "A", at: "08:10" }, { name: "B", at: "09:00" }] }), /a timeline of 2 rows; a sentence says this more simply/);
  assert.match(warns({ scale, rows: [{ name: "A", at: "08:10" }, { name: "B", at: "08:40" }, { name: "C", at: "09:10" }] }), /the events are equally spaced, so the drawing shows only their order; a numbered list says the same/);
  assert.doesNotMatch(warns({ scale, rows: [{ name: "A", at: "08:10" }, { name: "B", at: "08:40" }, { name: "C", at: "09:20" }] }), /equally spaced/, "uneven gaps are what a timeline is for");
  assert.match(warns({ scale, lanes: [{ id: "a", name: "A" }, { id: "b", name: "B" }], rows: [{ name: "Idle", from: "08:00", to: "09:00", lane: "a" }, { name: "Busy", from: "09:00", to: "10:00", lane: "a" }, { name: "Open", from: "08:00", to: "10:00", lane: "b" }] }), /each lane is always in one state; this reads as a timing diagram/);
  assert.match(warns({ scale: { from: "08:00", to: "16:00", day: "2026-11-12", zone: "UTC" }, rows: [{ name: "A", at: "08:10" }, { name: "B", at: "08:30" }, { name: "C", at: "09:30" }, { name: "D", at: "15:00" }] }), /the stretch from 09:30 to 15:00 is 69% of the scale and holds nothing; draw the busy part as its own timeline, and say the rest in a sentence/);
  const long = { from: "2026-11-12 08:00", to: "2026-11-14 08:00" };
  const rows = [{ name: "A", at: "2026-11-12 09:00" }, { name: "B", at: "2026-11-13 02:00" }, { name: "C", at: "2026-11-13 20:00" }];
  assert.match(warns({ scale: { ...long, zone: "Europe/Paris" }, rows }), /the scale runs over 24 hours in the zone "Europe\/Paris", whose clocks may change; write the times in UTC, or in a fixed offset such as UTC\+1/);
  for (const zone of ["UTC", "UTC+7", "GMT−03:30"]) assert.doesNotMatch(warns({ scale: { ...long, zone }, rows }), /clocks may change/, zone);
});

test("wrong timeline data is refused with a plain reason that names the row", () => {
  const bad = (change, reason) => { const d = incident(); change(d); assert.throws(() => renderDiagram(d), reason); };
  bad((d) => (d.rows[0].at = "2026-11-12"), /"at" of row 1 \("Change merged"\) is "2026-11-12", which is in days; every time of this chart is in minutes, written as "08:12"\. A chart never mixes grains/);
  bad((d) => (d.rows[0].at = "11:00"), /"at" of row 1 \("Change merged"\) is "11:00", outside the scale, which runs from 08:00 to 10:45/);
  bad((d) => (d.rows[3].to = "08:30"), /row 4 \("Saving failed"\) ends before it starts/);
  bad((d) => (d.rows[3].to = "08:40"), /row 4 \("Saving failed"\) starts and ends at 08:40; write it as an event, with "at"/);
  bad((d) => (d.rows[3].to = "08:41"), /the span "Saving failed" is [\d.]+px wide on a desktop and on paper; write it as an event, or shorten the scale/);
  bad((d) => (d.rows[3].to = "08:43"), /the span "Saving failed" is [\d.]+px wide on a phone; write it as an event, or shorten the scale/);
  bad((d) => delete d.rows[3].to, /row 4 \("Saving failed"\) has "from" but no "to"; a span still running needs "asOf", the date the page was written, or write it as an event, with "at"/);
  bad((d) => delete d.rows[3].from, /row 4 \("Saving failed"\) has "to" but no "from"/);
  bad((d) => (d.rows[0].from = "08:00"), /row 1 \("Change merged"\) has "at" and one of "from" and "to"/);
  bad((d) => (d.rows[1] = { name: "Nothing", lane: "system" }), /row 2 \("Nothing"\) has no time/);
  bad((d) => delete d.scale.zone, /a scale of times needs a "zone", such as "UTC" or "UTC\+7"/);
  bad((d) => (d.scale = { from: "2026-11-01 08:00", to: "2026-11-10 08:00", zone: "UTC" }), /this timeline spans 9 days at the minute grain, and a scale of times holds at most 72 hours; write days/);
  bad((d) => (d.rows = d.rows.slice(0, 1)), /a timeline has 2 to 20 rows; this one has 1/);
  bad((d) => { while (d.rows.length < 21) d.rows.push({ ...d.rows[1] }); }, /a timeline has 2 to 20 rows; this one has 21/);
  bad((d) => d.lanes.push({ id: "c", name: "C" }, { id: "d", name: "D" }), /a timeline has at most 3 lanes; this one has 4/);
  bad((d) => (d.rows[0].name = "A change to the shared configuration template"), /the name of row 1 is 45 characters long; the most is 28: "A change to the shared configuration template"\. Move the rest to its note/);
  bad((d) => (d.rows[0].note = "x".repeat(201)), /the note of row 1 \("Change merged"\) is 201 characters long; the most is 200/);
  bad((d) => delete d.rows[0].lane, /row 1 \("Change merged"\) names no lane/);
  bad((d) => (d.rows[0].lane = "other"), /names the lane "other", which does not exist/);
  bad((d) => { delete d.lanes; }, /row 1 \("Change merged"\) names a lane, but the timeline has no "lanes"/);
  bad((d) => d.lanes.push({ id: "spare", name: "Spare" }), /the lane "spare" has no rows/);
  bad((d) => (d.place = "walk"), /a timeline sits in the text flow/);
  bad((d) => (d.form = "wide"), /a timeline has no "form"/);
});

test("a scale of days refuses a one-day span too narrow for a phone, as in a long plan", () => {
  const plan = { id: "plan", kind: "timeline", label: "A plan of 90 days.", scale: { from: "2026-11-01", to: "2027-01-29" }, rows: [{ name: "Backfill", from: "2026-11-10", to: "2026-12-20" }, { name: "Switch-off day", from: "2027-01-15", to: "2027-01-15" }] };
  assert.throws(() => renderDiagram(plan), /the span "Switch-off day" is [\d.]+px wide on a phone; write it as an event, or shorten the scale/);
});

test("check accepts a timeline that render drew, and reports one that was changed by hand", () => {
  const block = `<figure><div class="fig" role="region" aria-label="Figure 1, the incident" tabindex="0">\n<!-- docent:diagram\n${JSON.stringify(incident(), null, 2)}\n-->\n<!-- /docent:diagram -->\n</div><figcaption><strong>Figure 1</strong>The incident.</figcaption></figure>`;
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const page = renderDocument(specimen.replace("</main>", `${block}</main>`)).html;
  assert.deepEqual(checkDocument(page).errors, []);
  assert.match(checkDocument(page.replace(">+1 h 3 min<", ">+1 h<")).errors.join("\n"), /\("incident-timeline"\): the drawing does not match its data; run render/);
});

test("a hand-drawn timeline, Gantt chart or roadmap is refused by name, with this kind to use", () => {
  const specimen = fs.readFileSync(path.join(__dirname, "..", "skills", "docent", "assets", "specimen.html"), "utf8");
  const figure = fs.readFileSync(path.join(__dirname, "fixtures", "hand-fishbone.html"), "utf8");
  for (const type of ["timeline", "gantt", "roadmap"]) {
    const page = specimen.replace('<section id="report"', `${figure.replace('data-type="fishbone"', `data-type="${type}"`)}<section id="report"`);
    assert.match(checkDocument(page).errors.join("\n"), new RegExp(`it is a hand-drawn ${type}, which Docent draws from data; write its data in a block with "kind": "timeline" and run render`));
  }
});

test("a timeline takes every color from the page tokens, uses no ultramarine, and is flat", () => {
  const { svg } = renderDiagram(incident());
  const bare = svg.replace(/var\(--[a-z]+,#[0-9a-f]{6}\)/g, "");
  assert.doesNotMatch(bare, /#[0-9a-f]{6}\b|rgb\(|hsl\(/i, "no color outside a page token");
  assert.doesNotMatch(bare, /(fill|stroke)="(?!none|currentColor)[^"]*"/, "no color written on an element");
  assert.doesNotMatch(svg, /gradient|filter|shadow|stroke-dasharray/i, "flat, and nothing dashed");
  assert.doesNotMatch(svg, /class="pulse/, "no dot");
});

test("a roadmap over 18 months: the month grain, an as-of line, and spans still running", () => {
  const { scene, phone, svg, warnings } = renderDiagram(roadmap());
  assert.deepEqual(warnings, []);
  for (const s of [scene, phone]) {
    assert.equal(s.notes[0].s, "Months from Jul 2026 to Dec 2027.", "the line above names the months and their years");
    assert.equal(s.bands.length, 3, "one band per workstream");
    assert.ok(s.notes.some((n) => n.s === "As of 26 Nov" && n.cls === "sub"), "the as-of line is named from its date");
  }
  assert.equal(scene.under.filter((u) => u.includes('class="r-ref"')).length, 3, "on a desktop, a muted line through each band");
  assert.equal(phone.under.filter((u) => u.includes('class="r-ref"')).length, 8, "on a phone, through each row's strip");
  assert.deepEqual(ticksOf(scene), ["Jul", "Oct", "2027", "Apr", "Jul", "Oct"], "quarters, and January writes its year");
  assert.deepEqual(ticksOf(phone), ["Jul", "2027", "Jul"], "every 6 months on a phone");
  assert.ok(scene.notes.some((n) => n.s === "Jul–Oct 2026, 4 months"), "two months of one year share the year");
  assert.ok(scene.notes.some((n) => n.s === "Mar 2027" && n.knock), "a milestone at the month grain says the month and the year");
  const words = wordsOf(svg);
  assert.match(words, /<th scope="col">Month<\/th>/);
  assert.match(words, /<tr><td>since Oct 2026, still running<\/td><td>Sync<\/td><th scope="row" class="whole">Offline sync build<\/th><td>About half done; two weeks late\.<\/td><td>\+2 months<\/td><\/tr>/);
  assert.match(words, /<li>8 rows: 2 events and 6 spans, from Jul 2026 to Sep 2027 \(15 months\)\.<\/li><li>Longest span: Mobile app, version 2, 6 months\.<\/li><li>2 spans are still running on 26 Nov\.<\/li><li>A line at 26 Nov: the day this page was written\.<\/li>/, "no gap after a span still running, whose end is not known");
});

test("a span still running ends at the as-of line, with no outline on its right side", () => {
  const { scene } = renderDiagram(roadmap());
  const asOf = scene.notes.find((n) => n.s === "As of 26 Nov").x;
  const part = scene.parts.find((p) => p.id === "Search in beta").svg;
  const m = part.match(/^<path d="M([\d.]+),([\d.]+) H([\d.]+) A4,4 0 0 0 ([\d.]+),([\d.]+) V([\d.]+) A4,4 0 0 0 ([\d.]+),([\d.]+) H([\d.]+)" class="r-bar"\/>/);
  assert.ok(m, `an open path, not a closed bar: ${part}`);
  assert.equal(m[1], m[9], "it starts and ends at the same x, the as-of line, and the stroke is not closed there");
  assert.ok(Math.abs(+m[1] - asOf) < 0.02, "its open end stands on the as-of line");
  assert.ok(scene.notes.some((n) => n.s === "since Nov 2026, still running" && n.knock), "its value says it is still running");
  assert.match(scene.parts.find((p) => p.id === "New search index").svg, /^<rect /, "a span that ended is the closed bar");
});

test("asOf at the minute and day grains, and its refusals", () => {
  const base = { id: "asof", kind: "timeline", label: "As of." };
  const minutes = renderDiagram({ ...base, scale: { from: "08:00", to: "10:00", day: "2026-11-12", zone: "UTC" }, asOf: "09:30", rows: [{ name: "Deploy", at: "08:10" }, { name: "Errors", from: "08:20" }, { name: "Paged", at: "08:40" }] });
  assert.ok(minutes.scene.notes.some((n) => n.s === "As of 09:30"), "a time names the line");
  assert.ok(minutes.scene.notes.some((n) => n.s === "since 08:20, still running"));
  assert.match(wordsOf(minutes.svg), /1 span is still running on 09:30\./);
  const days = renderDiagram({ ...base, scale: { from: "2026-11-01", to: "2026-12-31" }, asOf: "2026-11-26", rows: [{ name: "Beta", from: "2026-11-03" }, { name: "Review", at: "2026-11-20" }, { name: "Release", at: "2026-12-15" }] });
  assert.ok(days.scene.notes.some((n) => n.s === "As of 26 Nov") && days.scene.notes.some((n) => n.s === "since 3 Nov, still running"));
  const bad = (data, reason) => assert.throws(() => renderDiagram({ ...base, ...data }), reason);
  const scale = { from: "2026-11-01", to: "2026-12-31" };
  bad({ scale, asOf: "2026-11-26", rows: [{ name: "Late", from: "2026-11-28" }, { name: "A", at: "2026-11-02" }] }, /row 1 \("Late"\) starts at 2026-11-28, not before "asOf" \(2026-11-26\); a span still running started before the page was written/);
  bad({ scale, asOf: "2027-01-05", rows: [{ name: "A", at: "2026-11-02" }, { name: "B", at: "2026-11-09" }] }, /"asOf" is "2027-01-05", outside the scale/);
  bad({ scale, asOf: "2026-11", rows: [{ name: "A", at: "2026-11-02" }, { name: "B", at: "2026-11-09" }] }, /"asOf" is "2026-11", which is in months; every time of this chart is in days/);
  bad({ scale: { ...scale, marks: [{ at: "2026-11-10", name: "Freeze" }, { at: "2026-11-20", name: "Review" }] }, asOf: "2026-11-26", rows: [{ name: "A", at: "2026-11-02" }, { name: "B", at: "2026-11-09" }] }, /a timeline has at most 2 named lines, and "asOf" is one of them; this one has 2 marks and "asOf"/);
  for (const name of ["Today", "now", "Today (26 Nov)"]) bad({ scale: { ...scale, marks: [{ at: "2026-11-26", name }] }, rows: [{ name: "A", at: "2026-11-02" }, { name: "B", at: "2026-11-09" }] }, /a page is read after it is written, so write "asOf", and the line is named from its date/);
  assert.doesNotThrow(() => renderDiagram({ ...base, scale: { ...scale, marks: [{ at: "2026-11-26", name: "Known issue fixed" }] }, rows: [{ name: "A", at: "2026-11-02" }, { name: "B", at: "2026-11-09" }] }), "a name that only holds the letters 'now' is fine");
});

test("asOf on a scale of months keeps its day, also on the 1st, and a month-valued asOf names its month", () => {
  const base = { id: "first", kind: "timeline", label: "As of the 1st.", scale: { from: "2026-07", to: "2027-06" }, rows: [{ name: "A", from: "2026-08", to: "2026-09" }, { name: "B", from: "2026-10" }, { name: "C", at: "2027-03" }] };
  const day = renderDiagram({ ...base, asOf: "2026-11-01" });
  assert.ok(day.scene.notes.some((n) => n.s === "As of 1 Nov"), "a day on the 1st is still a day");
  assert.match(wordsOf(day.svg), /A line at 1 Nov: the day this page was written\./);
  const month = renderDiagram({ ...base, asOf: "2026-11" });
  assert.ok(month.scene.notes.some((n) => n.s === "As of Nov 2026"), "a month-valued asOf names its month");
});

test("the month grain: February is shorter than March, and a span of one month", () => {
  const { scene } = renderDiagram({ id: "months", kind: "timeline", label: "Months.", scale: { from: "2027-01", to: "2027-06" }, rows: [{ name: "February", from: "2027-02", to: "2027-02" }, { name: "March", from: "2027-03", to: "2027-03" }, { name: "Launch", at: "2027-05" }] });
  const width = (id) => +scene.parts.find((p) => p.id === id).svg.match(/width="([\d.]+)"/)[1];
  assert.ok(width("February") < width("March"), `February (${width("February")}px) is shorter than March (${width("March")}px)`);
  assert.ok(Math.abs(width("February") / width("March") - 28 / 31) < 0.001, "in proportion to their real days");
  assert.ok(scene.notes.some((n) => n.s === "Feb 2027, 1 month"), "a span of one month");
});
