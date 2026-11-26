// The time scale for the scale charts (a timeline first, any chart later), beside the numeric scale of scale.cjs. It reads
// times, dates and months in one of three grains, turns them into numbers, keeps the calendar ticks whose labels stand at
// least 48px apart, and writes their labels. A minute is a number of minutes, and a day or a month a number of days, so a
// month on the scale is as long as its real days. The zone is a label: nothing is converted, and the page reads no clock.
const { fail, words } = require("./blocks.cjs");
const { valueWidth } = require("./scale.cjs");

const GAP = 48; // the least distance between two tick labels, as on every scale
const DAY = 1440; // minutes in a day
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// The longest scale of each grain. Past it, on a phone, almost every span is narrower than 4px.
const MOST = { minutes: 72 * 60, days: 731, months: 120, zone: 12, marks: 2, mark: 20 };

// Each grain: how a time is written, its pattern, and a sample for the messages.
const FORMS = {
  minute: { re: /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/, sample: "2026-11-12 08:12" },
  clock: { re: /^(\d{2}):(\d{2})$/, sample: "08:12" },
  day: { re: /^(\d{4})-(\d{2})-(\d{2})$/, sample: "2026-11-12" },
  month: { re: /^(\d{4})-(\d{2})$/, sample: "2026-11" },
};
const GRAIN_OF = { minute: "minute", clock: "minute", day: "day", month: "month" };
const NAMES = { minute: "minutes", day: "days", month: "months" };

/** The form a value is written in, or null. */
const formOf = (v) => (typeof v === "string" ? Object.keys(FORMS).find((f) => FORMS[f].re.test(v)) || null : null);

/** Days since 1 January 1970 for a real calendar date, or null for a date that does not exist, such as 2026-02-29. */
function dayNumber(y, m, d) {
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d ? t / 86400000 : null;
}

/** The calendar parts of a day number. */
const partsOf = (day) => { const t = new Date(day * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), wd: t.getUTCDay() }; };
/** The day number of the 1st of the month k months after the month of a day number. */
const monthStart = (day, k = 0) => { const p = partsOf(day); return Date.UTC(p.y, p.m + k, 1) / 86400000; };

/**
 * One time of a chart, read in the scale's grain: { at, end }. An event stands at `at`; a span from its `from` runs to the
 * `end` of its `to`. A minute is a point, so its end is itself; a day ends at the start of the next day, and a month at the
 * 1st of the next month. `what` names the value in a message.
 */
function readTime(value, ts, what) {
  const form = formOf(value);
  const want = ts.grain === "minute" ? (ts.day ? "clock" : "minute") : ts.grain;
  if (form !== want) {
    if (form && GRAIN_OF[form] !== ts.grain) fail(`${what} is ${JSON.stringify(value)}, which is in ${NAMES[GRAIN_OF[form]]}; every time of this chart is in ${NAMES[ts.grain]}, written as "${FORMS[want].sample}". A chart never mixes grains`);
    if (form === "minute") fail(`${what} is ${JSON.stringify(value)}; the scale has a "day", so write the time alone, as "${value.slice(11)}"`);
    if (form === "clock") fail(`${what} is ${JSON.stringify(value)}; the scale has no "day", so write the date too, as "2026-11-12 ${value}"`);
    fail(`${what} is ${JSON.stringify(value)}; write a time in ${NAMES[ts.grain]}, as "${FORMS[want].sample}"`);
  }
  const m = value.match(FORMS[form].re).slice(1).map(Number);
  let at, end;
  if (ts.grain === "minute") {
    const [y, mo, d, h, mi] = form === "clock" ? [...ts.dayParts, ...m] : m;
    const day = dayNumber(y, mo, d);
    if (day == null || h > 23 || mi > 59) fail(`${what} is ${JSON.stringify(value)}, which is not a real time`);
    at = end = day * DAY + h * 60 + mi;
  } else if (ts.grain === "day") {
    at = dayNumber(...m);
    if (at == null) fail(`${what} is ${JSON.stringify(value)}, which is not a real date`);
    end = at + 1;
  } else {
    if (m[1] < 1 || m[1] > 12) fail(`${what} is ${JSON.stringify(value)}, which is not a real month`);
    at = dayNumber(m[0], m[1], 1);
    end = monthStart(at, 1);
  }
  if (ts.from != null && (at < ts.from || end > ts.to)) fail(`${what} is ${JSON.stringify(value)}, outside the scale, which runs from ${ts.written.from} to ${ts.written.to}`);
  return { at, end };
}

// The calendar steps of each grain, finest first. Each gives its ticks between two numbers of its grain.
const every = (n, first) => (from, to) => { const out = []; for (let v = first(from, n); v <= to; v += n) out.push(v); return out; };
const onClock = (n) => every(n, (from) => Math.ceil(from / n) * n); // every n minutes from midnight; each n divides a day
const months = (keep) => (from, to) => { const out = []; for (let v = monthStart(from); v <= to; v = monthStart(v, 1)) if (v >= from && keep(partsOf(v).m)) out.push(v); return out; };
const MONDAY = 4; // 5 January 1970, day 4, was a Monday
const STEPS = {
  minute: [["5 min", onClock(5)], ["10 min", onClock(10)], ["15 min", onClock(15)], ["30 min", onClock(30)], ["1 h", onClock(60)], ["2 h", onClock(120)], ["3 h", onClock(180)], ["6 h", onClock(360)], ["12 h", onClock(720)]],
  day: [["1 day", every(1, (from) => from)], ["2 days", every(2, (from) => from)], ["1 week", every(7, (from) => from + ((MONDAY - from) % 7 + 7) % 7)], ["2 weeks", every(14, (from) => from + ((MONDAY - from) % 7 + 7) % 7)], ["1 month", months(() => true)]],
  month: [["1 month", months(() => true)], ["1 quarter", months((m) => m % 3 === 0)], ["6 months", months((m) => m % 6 === 0)], ["1 year", months((m) => m === 0)]],
};

const pad = (n) => String(n).padStart(2, "0");

/**
 * The label of a tick at v, after the tick at prev (or none). A minute tick writes the clock, and the first tick of a new day
 * writes the date ("13 Nov", or "13 Nov 08:00" when it is not midnight). A day tick writes the day and the month, and the year
 * when the year is new ("4 Jan 2027"). A month tick writes the month, each January writes its year ("2027"), and a new year
 * that does not start at January writes both ("Mar 2027").
 */
function labelOf(v, prev, grain) {
  if (grain === "minute") {
    const day = Math.floor(v / DAY), clock = `${pad(Math.floor((v - day * DAY) / 60))}:${pad((v - day * DAY) % 60)}`;
    if (prev == null || Math.floor(prev / DAY) === day) return clock;
    const p = partsOf(day), date = `${p.d} ${MONTHS[p.m]}`;
    return v === day * DAY ? date : `${date} ${clock}`;
  }
  const p = partsOf(v), newYear = prev != null && partsOf(prev).y !== p.y;
  if (grain === "day") return `${p.d} ${MONTHS[p.m]}${newYear ? ` ${p.y}` : ""}`;
  if (p.m === 0) return String(p.y);
  return newYear ? `${MONTHS[p.m]} ${p.y}` : MONTHS[p.m];
}

/** Checks a time scale: "from" and "to" in one grain, the "day" and the "zone" of a minute scale, a "step" and up to two named marks. */
function readTimeScale(scale) {
  if (!scale || typeof scale !== "object" || typeof scale.from !== "string" || typeof scale.to !== "string") fail(`"scale" must be an object with "from" and "to", as times ("08:00"), dates ("2026-11-12") or months ("2026-11")`);
  const form = formOf(scale.from);
  if (!form) fail(`"from" in "scale" is ${JSON.stringify(scale.from)}; write a time as "08:00" or "2026-11-12 08:00", a date as "2026-11-12", or a month as "2026-11"`);
  const grain = GRAIN_OF[form];
  const ts = { grain, day: null, dayParts: null, zone: null, from: null, to: null, written: null };
  if (form === "clock") {
    if (scale.day == null) fail(`a scale of times such as "${scale.from}" needs a "day", such as "2026-11-12"; or write each time with its date, as "2026-11-12 ${scale.from}", so the scale may pass midnight`);
    if (formOf(scale.day) !== "day" || dayNumber(...scale.day.split("-").map(Number)) == null) fail(`"day" in "scale" is ${JSON.stringify(scale.day)}; write a real date, as "2026-11-12"`);
    ts.day = scale.day;
    ts.dayParts = scale.day.split("-").map(Number);
  } else if (scale.day != null) fail(form === "minute" ? `"scale" has a "day", so write its times alone, as "${scale.from.slice(11)}"` : `"day" in "scale" is for a scale of times; a scale of ${NAMES[grain]} has none`);
  if (grain === "minute") {
    if (scale.zone == null || scale.zone === "") fail(`a scale of times needs a "zone", such as "UTC" or "UTC+7": the reader must know which clock the times are on. render writes it beside the times and converts nothing`);
    ts.zone = words(scale.zone, `the "zone" of "scale"`, MOST.zone);
  } else if (scale.zone != null) fail(`"zone" in "scale" is for a scale of times; a scale of ${NAMES[grain]} has none`);
  const from = readTime(scale.from, ts, `"from" in "scale"`), to = readTime(scale.to, ts, `"to" in "scale"`);
  if (!(to.at > from.at)) fail(`"scale" must run forward: "to" is later than "from"`);
  Object.assign(ts, { from: from.at, to: to.end, last: to.at, written: { from: scale.from, to: scale.to } });
  // The longest scale of each grain, named in the next grain up.
  const length = ts.to - ts.from;
  if (grain === "minute" && length > MOST.minutes) fail(`this timeline spans ${Math.ceil(length / DAY)} days at the minute grain, and a scale of times holds at most 72 hours; write days, as "2026-11-12"`);
  if (grain === "day" && length > MOST.days) fail(`this timeline spans ${length} days at the day grain, and a scale of days holds at most 2 years (731 days); write months, as "2026-11"`);
  const spanMonths = (p, q) => (q.y - p.y) * 12 + q.m - p.m;
  if (grain === "month" && spanMonths(partsOf(ts.from), partsOf(ts.to)) > MOST.months) fail(`this timeline spans ${spanMonths(partsOf(ts.from), partsOf(ts.to))} months, and a scale of months holds at most 10 years (120 months)`);
  // A step names the finest calendar step the ticks may take; a coarser one is kept where labels would meet.
  ts.step = null;
  if (scale.step != null) {
    const names = STEPS[grain].map(([n]) => n);
    ts.step = names.indexOf(scale.step);
    if (ts.step < 0) fail(`"step" in "scale" is ${JSON.stringify(scale.step)}; a scale of ${NAMES[grain]} takes one of ${names.map((n) => `"${n}"`).join(", ")}, or no "step"`);
  }
  if (scale.marks != null && !Array.isArray(scale.marks)) fail(`"marks" in "scale" must be a list`);
  ts.marks = (scale.marks || []).map((m, i) => {
    const what = `mark ${i + 1} of "scale"`;
    if (!m || typeof m !== "object") fail(`${what} must be an object with "at" and a "name"`);
    return { at: readTime(m.at, ts, `"at" of ${what}`).at, name: words(m.name, `the name of ${what}`, MOST.mark) };
  });
  if (ts.marks.length > MOST.marks) fail(`a scale has at most ${MOST.marks} marks`);
  ts.unit = ""; // the zone is written in the line above the chart, never beside the ticks
  return ts;
}

/**
 * The time scale laid on the pixels x0 to x1: x(value), and the ticks of the finest calendar step whose labels stand at least
 * 48px apart (and far enough apart for half of each label and 16px between them) and between lo and hi. A step that keeps
 * fewer than three ticks is not taken: then the scale keeps two labels, its own first and last time, because the reader knows
 * that the times between are there. Returns { per, x, ticks, step }, each tick { v, x, label }; step is the name of the step
 * taken, or null for the two labels.
 */
function makeTimeScale(ts, x0, x1, { lo = -Infinity, hi = Infinity } = {}) {
  const per = (x1 - x0) / (ts.to - ts.from);
  const x = (v) => x0 + (v - ts.from) * per;
  const fits = (ticks) => ticks.every((t) => t.x - t.w / 2 >= lo && t.x + t.w / 2 <= hi) && ticks.every((t, i) => !i || t.x - ticks[i - 1].x >= Math.max(GAP, (ticks[i - 1].w + t.w) / 2 + 16));
  const laid = (values) => values.map((v, i) => { const label = labelOf(v, i ? values[i - 1] : null, ts.grain); return { v, x: x(v), label, w: valueWidth(label) }; });
  for (const [name, ticksOf] of STEPS[ts.grain].slice(ts.step ?? 0)) {
    // Ticks run to the start of the last day or month, so the scale's last unit is named at its start, as every other is.
    const values = ticksOf(ts.from, ts.last);
    if (values.length < 3) break;
    const ticks = laid(values);
    if (fits(ticks)) return { per, x, ticks: ticks.map(({ w, ...t }) => t), step: name };
  }
  // The two labels stand where an event at the scale's first and last time stands.
  const ends = laid([ts.from, ts.last]);
  if (!fits(ends)) fail(`the first and the last tick labels are ${Math.ceil(ends[0].w)}px and ${Math.ceil(ends[1].w)}px wide, and the scale is ${Math.round(x1 - x0)}px wide, so no two tick labels stand apart; shorten the scale`);
  return { per, x, ticks: ends.map(({ w, ...t }) => t), step: null };
}

/** The labels of the scale's first and last time, as the two-label fallback writes them, so a chart can leave room for half of
 * each at its ends, as the numeric scale leaves room for its first and last tick label. */
const endLabels = (ts) => [labelOf(ts.from, null, ts.grain), labelOf(ts.last, ts.from, ts.grain)];

module.exports = { readTimeScale, readTime, makeTimeScale, labelOf, endLabels, STEPS, MOST, DAY };
