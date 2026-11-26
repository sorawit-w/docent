// The time scale of the chart core: three grains, a day and a zone, calendar ticks 48px apart, and two labels as the last step.
const test = require("node:test");
const assert = require("node:assert/strict");
const chart = require("../skills/docent/scripts/lib/chart.cjs");
const time = require("../skills/docent/scripts/lib/time.cjs");
const { valueWidth } = require("../skills/docent/scripts/lib/scale.cjs");
const { readTimeScale, readTime, makeTimeScale, endLabels } = time;

const INCIDENT = { from: "08:00", to: "10:45", day: "2026-11-12", zone: "UTC" };
/** The ticks of a scale laid on a plot w px wide, with room outside it for half of each end label, as a chart leaves. */
const ticks = (scale, w) => {
  const ts = readTimeScale(scale);
  const [a, b] = endLabels(ts);
  return makeTimeScale(ts, 0, w, { lo: -valueWidth(a) / 2, hi: w + valueWidth(b) / 2 });
};
const labels = (scale, w) => ticks(scale, w).ticks.map((t) => t.label);

test("the core passes on the time scale of time.cjs unchanged", () => {
  for (const name of ["readTimeScale", "readTime", "makeTimeScale", "endLabels"]) assert.equal(chart[name], time[name], name);
});

test("each grain turns its times into numbers: minutes for times, days for dates and months", () => {
  const minute = readTimeScale(INCIDENT);
  assert.equal(minute.grain, "minute");
  assert.equal(minute.zone, "UTC");
  assert.equal(minute.to - minute.from, 165, "08:00 to 10:45 is 165 minutes");
  assert.deepEqual(readTime("08:12", minute, "a time"), { at: minute.from + 12, end: minute.from + 12 }, "a minute is a point");
  const full = readTimeScale({ from: "2026-11-12 08:00", to: "2026-11-12 10:45", zone: "UTC+7" });
  assert.equal(full.from, minute.from, "with or without a day, the same time is the same number");
  assert.equal(full.zone, "UTC+7", "the zone is a label; nothing is converted");
  const day = readTimeScale({ from: "2026-11-01", to: "2026-11-30" });
  assert.equal(day.grain, "day");
  assert.equal(day.to - day.from, 30, "a day scale runs from the start of its first day to the end of its last");
  const one = readTime("2026-11-12", day, "a date");
  assert.equal(one.end - one.at, 1, "a span from and to the same day is one day long");
  const month = readTimeScale({ from: "2026-11", to: "2027-01" });
  assert.equal(month.grain, "month");
  assert.equal(month.to - month.from, 30 + 31 + 31, "November, December and January are 92 days");
});

test("February is as long as its real days, in a common year and a leap year", () => {
  const months = readTimeScale({ from: "2027-01", to: "2028-12" });
  const length = (m) => { const t = readTime(m, months, "a month"); return t.end - t.at; };
  assert.equal(length("2027-02"), 28);
  assert.equal(length("2028-02"), 29);
  assert.equal(length("2027-03"), 31);
  const sc = makeTimeScale(months, 0, 730);
  const width = (m) => { const t = readTime(m, months, "a month"); return sc.x(t.end) - sc.x(t.at); };
  assert.ok(width("2027-02") < width("2027-03"), "February is narrower than March on the scale");
  assert.equal(labels({ from: "2027-02-01", to: "2027-03-31" }, 376).join(), "1 Feb,15 Feb,1 Mar,15 Mar,29 Mar", "two weeks from 1 February reach 1 March in 2027");
  assert.throws(() => readTimeScale({ from: "2027-02-29", to: "2027-03-31" }), /"2027-02-29", which is not a real date/);
  assert.doesNotThrow(() => readTimeScale({ from: "2028-02-29", to: "2028-03-31" }), "29 February 2028 is real");
});

test("both widths: the incident takes ticks every 30 minutes on a desktop and every hour on a phone, 48px apart", () => {
  // The plots of the proposal: 376px on a desktop and on paper, 181px on a phone, for 165 minutes.
  for (const [w, step, want] of [[376, "30 min", "08:00,08:30,09:00,09:30,10:00,10:30"], [181, "1 h", "08:00,09:00,10:00"]]) {
    const sc = ticks(INCIDENT, w);
    assert.equal(sc.step, step);
    assert.equal(sc.ticks.map((t) => t.label).join(), want);
    sc.ticks.forEach((t, i) => i && assert.ok(t.x - sc.ticks[i - 1].x >= 48, `${t.label} stands 48px from the tick before`));
    for (const t of sc.ticks) assert.ok(t.x - valueWidth(t.label) / 2 >= -valueWidth("08:00") / 2 && t.x + valueWidth(t.label) / 2 <= w + valueWidth("10:45") / 2, `${t.label} stays inside`);
  }
  assert.equal(ticks(INCIDENT, 376).per.toFixed(2), "2.28", "the scale is true: 2.28px a minute, as measured in the proposal, the same for every minute");
});

test("a scale over midnight writes the date on the first tick of the new day", () => {
  assert.equal(labels({ from: "2026-11-12 20:00", to: "2026-11-13 04:00", zone: "UTC" }, 376).join(), "20:00,22:00,13 Nov,02:00,04:00");
  assert.equal(labels({ from: "2026-11-12 22:30", to: "2026-11-13 01:00", zone: "UTC" }, 376).join(), "22:30,23:00,23:30,13 Nov,00:30,01:00");
  assert.throws(() => readTimeScale({ from: "22:00", to: "02:00", day: "2026-11-12", zone: "UTC" }), /"scale" must run forward/, "with a day, a scale cannot pass midnight");
});

test("a new year adds the year to a date, and writes the year in place of January", () => {
  assert.equal(labels({ from: "2026-12-20", to: "2027-01-20" }, 376).join(), "21 Dec,28 Dec,4 Jan 2027,11 Jan,18 Jan", "weeks start on Mondays");
  assert.equal(labels({ from: "2026-11", to: "2028-04" }, 376).join(), "2027,Apr,Jul,Oct,2028,Apr", "quarters, and each January writes its year");
  assert.equal(time.labelOf(readTime("2027-03", readTimeScale({ from: "2026-11", to: "2027-12" }), "m").at, readTime("2026-11", readTimeScale({ from: "2026-11", to: "2027-12" }), "m").at, "month"), "Mar 2027", "a new year that does not start at January writes both");
});

test("the steps of each grain, finest first, and a scale's own step as the finest the ticks may take", () => {
  assert.deepEqual(time.STEPS.minute.map(([n]) => n), ["5 min", "10 min", "15 min", "30 min", "1 h", "2 h", "3 h", "6 h", "12 h"]);
  assert.deepEqual(time.STEPS.day.map(([n]) => n), ["1 day", "2 days", "1 week", "2 weeks", "1 month"]);
  assert.deepEqual(time.STEPS.month.map(([n]) => n), ["1 month", "1 quarter", "6 months", "1 year"]);
  assert.equal(labels({ from: "2026-11-12", to: "2026-11-14" }, 181).join(), "12 Nov,13 Nov,14 Nov", "a day scale names its last day at its start, not the end of it");
  assert.equal(ticks({ ...INCIDENT, step: "1 h" }, 376).step, "1 h", "the author's step, where it fits");
  assert.equal(ticks({ ...INCIDENT, step: "30 min" }, 181).step, "1 h", "a coarser step where the author's would meet");
  assert.throws(() => readTimeScale({ ...INCIDENT, step: "20 min" }), /"step" in "scale" is "20 min"; a scale of minutes takes one of "5 min", "10 min"/);
  assert.equal(labels({ from: "2026-11-03", to: "2026-12-14" }, 376).join(), "9 Nov,16 Nov,23 Nov,30 Nov,7 Dec,14 Dec", "a week is a Monday");
});

test("when even the coarsest step keeps fewer than three labels, the scale keeps two: its first and last time", () => {
  const long = ticks({ from: "2026-11-12 08:00", to: "2026-11-15 08:00", zone: "UTC" }, 181);
  assert.equal(long.step, null);
  assert.equal(long.ticks.map((t) => t.label).join(), "08:00,15 Nov 08:00");
  assert.equal(labels({ from: "2026-11-01", to: "2028-10-31" }, 181).join(), "1 Nov,31 Oct 2028", "two years of days on a phone");
  assert.equal(labels({ from: "2026-11", to: "2036-10" }, 181).join(), "Nov,Oct 2036", "ten years of months on a phone");
  const ts = readTimeScale({ from: "2026-11-01", to: "2028-10-31" });
  const sc = makeTimeScale(ts, 0, 181);
  assert.equal(sc.ticks[1].x, sc.x(readTime("2028-10-31", ts, "d").at), "the last label stands where an event on the last day stands");
  assert.throws(() => makeTimeScale(readTimeScale({ from: "2026-11-12 08:00", to: "2026-11-15 08:00", zone: "UTC" }), 0, 60, { lo: 0, hi: 60 }), /no two tick labels stand apart/);
});

test("a time scale is refused with a plain reason", () => {
  const bad = (scale, reason) => assert.throws(() => readTimeScale(scale), reason);
  bad({ from: 8, to: 10 }, /"scale" must be an object with "from" and "to", as times/);
  bad({ from: "8 am", to: "10 am" }, /"from" in "scale" is "8 am"; write a time as "08:00"/);
  bad({ from: "08:00", to: "10:45", zone: "UTC" }, /needs a "day", such as "2026-11-12"; or write each time with its date/);
  bad({ from: "2026-11-12 08:00", to: "2026-11-12 10:45", day: "2026-11-12", zone: "UTC" }, /"scale" has a "day", so write its times alone, as "08:00"/);
  bad({ from: "2026-11-01", to: "2026-11-30", day: "2026-11-12" }, /"day" in "scale" is for a scale of times/);
  bad({ from: "08:00", to: "10:45", day: "2026-11-12" }, /a scale of times needs a "zone", such as "UTC" or "UTC\+7"/);
  bad({ ...INCIDENT, zone: "Coordinated Universal" }, /the "zone" of "scale" is 21 characters long; the most is 12/);
  bad({ from: "2026-11-01", to: "2026-11-30", zone: "UTC" }, /"zone" in "scale" is for a scale of times/);
  bad({ from: "2026-11-01", to: "2026-11" }, /"to" in "scale" is "2026-11", which is in months; every time of this chart is in days, written as "2026-11-12". A chart never mixes grains/);
  bad({ from: "2026-11-12 08:00", to: "11:00", zone: "UTC" }, /the scale has no "day", so write the date too, as "2026-11-12 11:00"/);
  bad({ ...INCIDENT, to: "25:00" }, /"25:00", which is not a real time/);
  bad({ from: "2026-13", to: "2027-02" }, /"2026-13", which is not a real month/);
  bad({ from: "2026-11-30", to: "2026-11-01" }, /"scale" must run forward/);
  bad({ from: "2026-11-12 08:00", to: "2026-11-15 09:00", zone: "UTC" }, /this timeline spans 4 days at the minute grain, and a scale of times holds at most 72 hours; write days/);
  bad({ from: "2026-11-01", to: "2028-11-01" }, /spans 732 days at the day grain, and a scale of days holds at most 2 years \(731 days\); write months/);
  bad({ from: "2026-11", to: "2036-11" }, /this timeline spans 121 months, and a scale of months holds at most 10 years/);
  bad({ ...INCIDENT, marks: [{ at: "11:00", name: "Late" }] }, /"at" of mark 1 of "scale" is "11:00", outside the scale, which runs from 08:00 to 10:45/);
  bad({ ...INCIDENT, marks: [{ at: "08:10", name: "a" }, { at: "08:20", name: "b" }, { at: "08:30", name: "c" }] }, /at most 2 marks/);
  assert.doesNotThrow(() => readTimeScale({ from: "2026-11-12 08:00", to: "2026-11-15 08:00", zone: "UTC" }), "72 hours exactly is allowed");
  assert.doesNotThrow(() => readTimeScale({ from: "2026-11", to: "2036-10" }), "120 months exactly is allowed");
});

test("a time outside the scale, or in another grain, is refused with its name", () => {
  const ts = readTimeScale(INCIDENT);
  assert.throws(() => readTime("07:59", ts, 'row 1 ("Change merged")'), /row 1 \("Change merged"\) is "07:59", outside the scale, which runs from 08:00 to 10:45/);
  assert.throws(() => readTime("2026-11-12", ts, "row 2"), /row 2 is "2026-11-12", which is in days; every time of this chart is in minutes, written as "08:12"/);
  const days = readTimeScale({ from: "2026-11-01", to: "2026-11-30" });
  assert.equal(readTime("2026-11-30", days, "the last day").end, days.to, "a span to the last day ends at the end of the scale");
  assert.equal(readTime("10:45", ts, "the end").at, ts.to, "an event at the last minute stands at the end of the scale");
});

test("marks are read in the scale's grain, and the scale carries no unit", () => {
  const ts = readTimeScale({ ...INCIDENT, marks: [{ at: "08:31", name: "Deploy" }] });
  assert.deepEqual(ts.marks, [{ at: ts.from + 31, name: "Deploy" }]);
  assert.equal(ts.unit, "", "the zone goes in the line above the chart, not beside the ticks");
});
