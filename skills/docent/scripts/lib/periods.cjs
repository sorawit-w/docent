// Periods: reads a list of dates or periods, such as the first column of a table, and tells whether they are equally spaced points in time.
// check uses it to point out a table that a line chart would show better (the rule visual.line). Every label must have the same form.
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
/** The index of a name in the list, from the full name or its first three letters ("Jul", "Jul."), else -1. */
const nameIndex = (list, word) => { const w = word.toLowerCase().replace(/\.$/, ""); return list.findIndex((n) => n === w || (w.length === 3 && n.startsWith(w)) || (w === "sept" && n === "september")); };
const month = (word) => nameIndex(MONTHS, word);
const dayNumber = (y, m, d) => Date.UTC(y, m, d) / 86400000;

// Each form: a pattern for one label, and what it gives: the form's name and its position on its own scale.
// A month or a quarter with no year runs on into the next year when it goes back, so "Nov, Dec, Jan" counts as equally spaced.
const FORMS = [
  ["date", /^(\d{4})-(\d{2})-(\d{2})$/, (m) => ({ day: dayNumber(+m[1], +m[2] - 1, +m[3]), y: +m[1], m: +m[2] - 1, d: +m[3] })],
  ["date", /^(\d{1,2}) ([A-Za-z]+\.?),? (\d{4})$/, (m) => month(m[2]) < 0 ? null : { day: dayNumber(+m[3], month(m[2]), +m[1]), y: +m[3], m: month(m[2]), d: +m[1] }],
  ["date", /^([A-Za-z]+\.?) (\d{1,2}),? (\d{4})$/, (m) => month(m[1]) < 0 ? null : { day: dayNumber(+m[3], month(m[1]), +m[2]), y: +m[3], m: month(m[1]), d: +m[2] }],
  ["month", /^([A-Za-z]+\.?),? (\d{4})$/, (m) => month(m[1]) < 0 ? null : { at: +m[2] * 12 + month(m[1]) }],
  ["month", /^(\d{4})-(\d{2})$/, (m) => ({ at: +m[1] * 12 + +m[2] - 1 })],
  ["month alone", /^([A-Za-z]+\.?)$/, (m) => month(m[1]) < 0 ? null : { at: month(m[1]), wrap: 12 }],
  ["weekday", /^([A-Za-z]+\.?)$/, (m) => { const i = nameIndex(DAYS, m[1]); return i < 0 ? null : { at: i, wrap: 7 }; }],
  ["quarter", /^Q([1-4]),? (\d{4})$/i, (m) => ({ at: +m[2] * 4 + +m[1] - 1 })],
  ["quarter", /^(\d{4}) Q([1-4])$/i, (m) => ({ at: +m[1] * 4 + +m[2] - 1 })],
  ["quarter alone", /^Q([1-4])$/i, (m) => ({ at: +m[1] - 1, wrap: 4 })],
  ["half", /^H([12]),? (\d{4})$/i, (m) => ({ at: +m[2] * 2 + +m[1] - 1 })],
  ["year", /^(?:FY ?)?((?:19|20)\d{2})$/, (m) => ({ at: +m[1] })],
  ["week", /^(?:Week|Wk\.?|W) ?(\d{1,3})$/i, (m) => ({ at: +m[1] })],
  ["day", /^Day (\d{1,3})$/i, (m) => ({ at: +m[1] })],
  ["sprint", /^Sprint (\d{1,3})$/i, (m) => ({ at: +m[1] })],
  ["time", /^([01]?\d|2[0-3]):([0-5]\d)$/, (m) => ({ at: +m[1] * 60 + +m[2] })],
];

/** The form of one label and its position, or null when it is not a date or a period that check can read. */
function readPeriod(label) {
  const text = String(label).trim().replace(/\s+/g, " ");
  for (const [form, pattern, read] of FORMS) {
    const m = text.match(pattern);
    const got = m && read(m);
    if (got) return { form, ...got };
  }
  return null;
}

/** Whether the labels are 3 or more equally spaced points in time, all of one form. Dates count when they are the same number of days
    apart, or on the same day of each month or each year. Returns { form, step } or null. */
function evenPeriods(labels) {
  if (labels.length < 3) return null;
  const read = labels.map(readPeriod);
  if (read.some((r) => !r) || new Set(read.map((r) => r.form)).size !== 1) return null;
  const form = read[0].form;
  const steps = (values, wrap) => values.slice(1).map((v, i) => { let s = v - values[i]; if (wrap && s <= 0) s += wrap; return s; });
  const even = (list) => list[0] > 0 && list.every((s) => s === list[0]);
  if (form === "date") {
    const byDay = steps(read.map((r) => r.day));
    if (even(byDay)) return { form, step: byDay[0] };
    const byMonth = steps(read.map((r) => r.y * 12 + r.m));
    if (read.every((r) => r.d === read[0].d) && even(byMonth)) return { form, step: byMonth[0] * 30 };
    return null;
  }
  const list = steps(read.map((r) => r.at), read[0].wrap);
  return even(list) ? { form, step: list[0] } : null;
}

module.exports = { readPeriod, evenPeriods };
