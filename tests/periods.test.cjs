const test = require("node:test");
const assert = require("node:assert/strict");
const { readPeriod, evenPeriods } = require("../skills/docent/scripts/lib/periods.cjs");

test("periods: each form of a date or a period is read, and other words are not", () => {
  assert.equal(readPeriod("2026-07-01").form, "date");
  assert.equal(readPeriod("1 July 2026").form, "date");
  assert.equal(readPeriod("Jul. 1, 2026").form, "date");
  assert.equal(readPeriod("Sept 2026").form, "month");
  assert.equal(readPeriod("2026-07").form, "month");
  assert.equal(readPeriod("May").form, "month alone");
  assert.equal(readPeriod("Tue").form, "weekday");
  assert.equal(readPeriod("Q3 2026").form, "quarter");
  assert.equal(readPeriod("2026 Q3").form, "quarter");
  assert.equal(readPeriod("H2 2026").form, "half");
  assert.equal(readPeriod("FY2025").form, "year");
  assert.equal(readPeriod("Week 12").form, "week");
  assert.equal(readPeriod("Sprint 4").form, "sprint");
  assert.equal(readPeriod("09:30").form, "time");
  for (const word of ["Sign-in", "Mayday", "Q5 2026", "25:00", "3 Julyish 2026", "1 Foo 2026", "Monitor"]) assert.equal(readPeriod(word), null, word);
});

test("periods: equally spaced labels of one form count, and others do not", () => {
  assert.deepEqual(evenPeriods(["Jan 2026", "Feb 2026", "Mar 2026"]), { form: "month", step: 1 });
  assert.deepEqual(evenPeriods(["Nov", "Dec", "Jan"]), { form: "month alone", step: 1 }, "a month alone runs on into the next year");
  assert.deepEqual(evenPeriods(["Q4 2025", "Q1 2026", "Q2 2026"]), { form: "quarter", step: 1 });
  assert.deepEqual(evenPeriods(["2022", "2024", "2026"]), { form: "year", step: 2 });
  assert.deepEqual(evenPeriods(["1 July 2026", "8 July 2026", "15 July 2026"]), { form: "date", step: 7 });
  assert.equal(evenPeriods(["1 July 2026", "1 August 2026", "1 September 2026"]).form, "date", "the same day of each month");
  assert.deepEqual(evenPeriods(["08:00", "08:05", "08:10", "08:15"]), { form: "time", step: 5 });
  assert.equal(evenPeriods(["Jan 2026", "Feb 2026"]), null, "fewer than 3");
  assert.equal(evenPeriods(["Jan 2026", "Mar 2026", "Apr 2026"]), null, "a gap");
  assert.equal(evenPeriods(["Jan 2026", "Q1 2026", "2026"]), null, "mixed forms");
  assert.equal(evenPeriods(["08:12", "08:31", "09:40"]), null, "the times of events");
  assert.equal(evenPeriods(["Mar 2026", "Feb 2026", "Jan 2026"]), null, "going back in time is not read as a step");
});
