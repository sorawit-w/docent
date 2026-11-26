// Timelines: events (a point at a time) and spans (a bar from a start to an end), one row each, on a time scale that is
// true: equal time is equal length. Rows sit in up to 3 lanes, and the rows of each lane are sorted by time, because in a
// timeline the order is the time. It draws with the range chart's row code: 640px wide for a desktop and for paper, and 264px
// wide for a phone, where each row name stands on its own line above its mark. Its rows are also written as one table in
// time order, with the gap since the row before, and its notes live only in that table.
const { fail, words, id } = require("./blocks.cjs");
const { esc, readTimeScale, readTime, makeTimeScale, endLabels, num } = require("./chart.cjs");
const { layoutRows } = require("./range.cjs");
const { DAY } = require("./time.cjs");

const MOST = { rows: 20, lanes: 3, name: 28, note: 200, lane: 20 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const dateOf = (day) => { const t = new Date(day * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; };
const dayText = (day, year) => { const p = dateOf(day); return `${p.d} ${MONTHS[p.m]}${year ? ` ${p.y}` : ""}`; };
const monthText = (day) => { const p = dateOf(day); return `${MONTHS[p.m]} ${p.y}`; };
const isMonthStart = (day) => dateOf(day).d === 1;
const monthsBetween = (a, b) => { const p = dateOf(a), q = dateOf(b); return (q.y - p.y) * 12 + q.m - p.m; };
// Minutes since midnight, kept at or above 0, so a time before 1970 (a negative number) writes its clock right too.
const clockText = (v) => { const m = ((v % DAY) + DAY) % DAY; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };

/**
 * A time as the timeline writes it, beside a mark and in its table: "08:12" on the scale's first day and "13 Nov 01:00" after
 * it; "12 Nov" in the scale's first year and "4 Jan 2027" after it; a month always with its year, "Mar 2027". `full` always
 * writes the date and the year, for the line above the chart. An "as of" day on a scale of months is a day, "26 Nov".
 */
function timeText(v, ts, full = false) {
  if (ts.grain === "month" && isMonthStart(v)) return monthText(v);
  if (ts.grain === "minute") {
    const day = Math.floor(v / DAY);
    if (full) return `${dayText(day, true)} ${clockText(v)}`;
    return day === Math.floor(ts.from / DAY) ? clockText(v) : `${dayText(day)} ${clockText(v)}`;
  }
  return dayText(v, full || dateOf(v).y !== dateOf(ts.from).y);
}

/** The length from a to b in words: "47 min", "1 h 3 min", "2 h"; "1 day", "12 days"; "1 month", "6 months" between the
 * starts of two months, and days on a scale of months when one end is an "as of" day. */
function lengthText(a, b, grain) {
  const n = b - a;
  if (grain === "month" && isMonthStart(a) && isMonthStart(b)) { const k = monthsBetween(a, b); return k === 1 ? "1 month" : `${k} months`; }
  if (grain === "minute") {
    if (n < 60) return `${n} min`;
    const h = Math.floor(n / 60), m = n % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return n === 1 ? "1 day" : `${n} days`;
}

/** The gap since the row before, as the table writes it: "+13 min", "+1 h 3 min", "+3 days", "+2 months", or "same time",
 * "same day" and "same month". */
const sinceText = (a, b, grain) => (a === b ? `same ${{ minute: "time", day: "day", month: "month" }[grain]}` : `+${lengthText(a, b, grain)}`);

/**
 * The longest stretch between two rows that holds no mark, inside the scale: { from, to, length, shown }, or null when none.
 * `shown` is where the stretch starts as the author wrote it: a span of days or months ends at the start of the next one,
 * but the stretch reads "from 30 Nov", the last day the span covers. A span still running has no end yet, so no stretch
 * after it is empty. An event at the moment a stretch starts wins, since it is written there.
 */
function longestGap(rows) {
  const marks = [...rows].sort((a, b) => a.at - b.at);
  const reachOf = (r) => (r.running ? Infinity : r.end);
  let best = null, reach = marks[0];
  for (const r of marks.slice(1)) {
    if (r.at > reachOf(reach) && (!best || r.at - reach.end > best.length)) best = { from: reach.end, to: r.at, length: r.at - reach.end, shown: reach.last };
    if (reachOf(r) > reachOf(reach) || (reachOf(r) === reachOf(reach) && r.type === "event")) reach = r;
  }
  return best;
}

const NOT_A_DATE = /^\s*(today|now)\b/i;

/** Checks timeline data and returns the model. */
function readTimeline(data) {
  if (data.place != null && data.place !== "flow") fail(`a timeline sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a timeline has no "form"; the renderer draws it 640px wide, and 264px wide on a phone`);
  const scale = readTimeScale(data.scale);
  for (const m of scale.marks) if (NOT_A_DATE.test(m.name)) fail(`a line is named "${m.name}"; a page is read after it is written, so write "asOf", and the line is named from its date`);
  // "asOf" is the time or date the page was written: a named line, where every span still running ends. On a scale of months
  // it may be a day, "2026-11-26", since a page is written on a day.
  let asOf = null;
  if (data.asOf != null) {
    const dayOnMonths = scale.grain === "month" && /^\d{4}-\d{2}-\d{2}$/.test(data.asOf);
    const t = readTime(data.asOf, dayOnMonths ? { ...scale, grain: "day" } : scale, `"asOf"`);
    // A day keeps its day, also on the 1st of a month: "2026-11-01" is "1 Nov", and only "2026-11" is "Nov 2026".
    asOf = { at: t.at, written: data.asOf, shown: dayOnMonths ? dayText(t.at) : timeText(t.at, scale) };
    if (scale.marks.length + 1 > 2) fail(`a timeline has at most 2 named lines, and "asOf" is one of them; this one has ${scale.marks.length} marks and "asOf"`);
    scale.marks = [...scale.marks, { at: t.at, name: `As of ${asOf.shown}` }].sort((a, b) => a.at - b.at);
  }
  if (data.lanes != null && !Array.isArray(data.lanes)) fail(`"lanes" must be a list`);
  const lanes = (data.lanes || []).map((l, i) => {
    const what = `lane ${i + 1}`;
    if (!l || typeof l !== "object") fail(`${what} must be an object with "id" and "name"`);
    return { id: id(l.id, `the id of ${what}`), name: words(l.name, `the name of ${what}`, MOST.lane), rows: [] };
  });
  if (lanes.length > MOST.lanes) fail(`a timeline has at most ${MOST.lanes} lanes; this one has ${lanes.length}`);
  lanes.forEach((l, i) => { if (lanes.findIndex((o) => o.id === l.id) !== i) fail(`two lanes have the id "${l.id}"`); });
  if (!Array.isArray(data.rows)) fail(`"rows" must be a list`);
  if (data.rows.length < 2 || data.rows.length > MOST.rows) fail(`a timeline has 2 to ${MOST.rows} rows; this one has ${data.rows.length}`);
  const rows = data.rows.map((r, i) => {
    if (!r || typeof r !== "object") fail(`row ${i + 1} must be an object with a "name" and its time`);
    if (typeof r.name === "string" && r.name.trim().replace(/\s+/g, " ").length > MOST.name) fail(`the name of row ${i + 1} is ${r.name.trim().replace(/\s+/g, " ").length} characters long; the most is ${MOST.name}: "${r.name.trim()}". Move the rest to its note`);
    const name = words(r.name, `the name of row ${i + 1}`, MOST.name);
    const what = `row ${i + 1} ("${name}")`;
    const has = (k) => r[k] != null;
    let row;
    if (has("at")) {
      if (has("from") || has("to")) fail(`${what} has "at" and one of "from" and "to"; a row is an event ("at") or a span ("from" and "to")`);
      const t = readTime(r.at, scale, `"at" of ${what}`);
      row = { type: "event", at: t.at, end: t.at, last: t.at, value: timeText(t.at, scale) };
    } else if (has("from") && !has("to")) {
      // A span still running: it ends at the "as of" line, with no outline on its right side, so it claims no end.
      if (!asOf) fail(`${what} has "from" but no "to"; a span still running needs "asOf", the date the page was written, or write it as an event, with "at"`);
      const a = readTime(r.from, scale, `"from" of ${what}`);
      if (a.at >= asOf.at) fail(`${what} starts at ${r.from}, not before "asOf" (${asOf.written}); a span still running started before the page was written`);
      const since = `since ${timeText(a.at, scale)}, still running`;
      row = { type: "span", running: true, at: a.at, end: asOf.at, last: asOf.at, value: since, short: "still running", length: lengthText(a.at, asOf.at, scale.grain) };
    } else if (has("from")) {
      const a = readTime(r.from, scale, `"from" of ${what}`), b = readTime(r.to, scale, `"to" of ${what}`);
      if (b.at < a.at) fail(`${what} ends before it starts: "to" is earlier than "from"`);
      if (scale.grain === "minute" && b.at === a.at) fail(`${what} starts and ends at ${r.from}; write it as an event, with "at"`);
      const length = lengthText(a.at, b.end, scale.grain);
      // Beside its bar a span reads "08:40–09:27, 47 min", as a range chart writes a range; its table cell takes spaces around
      // the dash, as the proposal writes it, so a narrow column wraps at the spaces and never inside the times.
      const ends = b.at === a.at ? [timeText(a.at, scale)] : [timeText(a.at, scale), timeText(b.at, scale)];
      // Two months of one year share the year: "Jul–Oct 2026".
      if (scale.grain === "month" && ends.length === 2 && ends[0].slice(-4) === ends[1].slice(-4)) ends[0] = ends[0].slice(0, -5);
      // When both times carry a date, the value can be wider than a phone; then the drawing writes the length alone.
      row = { type: "span", at: a.at, end: b.end, last: b.at, value: `${ends.join("–")}, ${length}`, short: length, cell: `${ends.join(" – ")}, ${length}`, length };
    } else if (has("to")) fail(`${what} has "to" but no "from"; a span needs both, or write it as an event, with "at"`);
    else fail(`${what} has no time; give it "at" for an event, or "from" and "to" for a span`);
    const note = words(r.note, `the note of ${what}`, MOST.note, false);
    let lane = null;
    if (lanes.length) {
      if (r.lane == null) fail(`${what} names no lane; when a timeline has lanes, every row names one in "lane"`);
      lane = lanes.find((l) => l.id === r.lane) || fail(`${what} names the lane "${r.lane}", which does not exist`);
    } else if (r.lane != null) fail(`${what} names a lane, but the timeline has no "lanes"`);
    return { name, ...row, note, lane, written: i };
  });
  // In time order, a span by its start; rows at the same time keep the order they were written in.
  const byTime = [...rows].sort((a, b) => a.at - b.at || a.written - b.written);
  for (const l of lanes) {
    l.rows = byTime.filter((r) => r.lane === l);
    if (!l.rows.length) fail(`the lane "${l.id}" has no rows; remove it, or give it a row`);
  }
  return {
    id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "timeline", scale, lanes, asOf,
    rows: lanes.length ? lanes.flatMap((l) => l.rows) : byTime, byTime, gap: longestGap(rows),
  };
}

/** The pixels of a row's mark and the sides where its value may stand; a span narrower than 4px is refused. */
function extent(r, sc, x0, x1, where) {
  if (r.type === "event") return { a: sc.x(r.at) - 5, b: sc.x(r.at) + 5, sides: ["right", "left"] };
  const a = sc.x(r.at), b = sc.x(r.end);
  if (b - a < 4) fail(`the span "${r.name}" is ${num(b - a)}px wide ${where}; write it as an event, or shorten the scale`);
  return { a, b, sides: ["right", "left"] };
}

/** The mark of one row, as SVG, on the line cy: a filled circle for an event, the range chart's bar for a span. A span still
 * running is the same bar with no outline on its right side: a path filled to the "as of" line, its stroke left open there. */
function markSvg(r, sc, x0, x1, cy, through) {
  if (r.type === "event") return `<circle cx="${num(sc.x(r.at))}" cy="${num(cy)}" r="5" class="r-pt"/>`;
  if (r.running) {
    const a = sc.x(r.at), b = sc.x(r.end), y0 = cy - 8, y1 = cy + 8;
    return `<path d="M${num(b)},${num(y0)} H${num(a + 4)} A4,4 0 0 0 ${num(a)},${num(y0 + 4)} V${num(y1 - 4)} A4,4 0 0 0 ${num(a + 4)},${num(y1)} H${num(b)}" class="r-bar"/>${through}`;
  }
  return `<rect x="${num(sc.x(r.at))}" y="${num(cy - 8)}" width="${num(sc.x(r.end) - sc.x(r.at))}" height="16" rx="4" class="r-bar"/>${through}`;
}

/** The line above the chart: the zone and the day of a scale of times, or the dates of a scale of days. */
function headOf(ts) {
  if (ts.grain === "minute") {
    const first = Math.floor(ts.from / DAY), last = Math.floor(ts.to / DAY);
    return first === last ? `Times in ${ts.zone} on ${dayText(first, true)}.` : `Times in ${ts.zone}, from ${timeText(ts.from, ts, true)} to ${timeText(ts.to, ts, true)}.`;
  }
  if (ts.grain === "month") return `Months from ${monthText(ts.from)} to ${monthText(ts.last)}.`;
  return `Dates from ${dayText(ts.from, true)} to ${dayText(ts.last, true)}.`;
}

/** The drawing: the range chart's rows on the time scale, with the lanes as its bands. */
function layoutTimeline(model, phone = false) {
  const ts = model.scale;
  return layoutRows(model, phone, {
    form: "timeline",
    scaleOn: (x0, x1, room) => makeTimeScale(ts, x0, x1, room),
    ends: endLabels(ts),
    unit: "",
    groups: model.lanes,
    extent,
    markSvg,
    bar: (r, sc) => (r.type === "span" ? [sc.x(r.at), sc.x(r.end)] : null),
    head: [headOf(ts)],
  });
}

/** The rows in words: one table in time order across all lanes, with the gap since the row before, and lines under it. */
function wordsOf(model) {
  const ts = model.scale, grain = ts.grain;
  const lanes = model.lanes.length > 0, notes = model.rows.some((r) => r.note);
  const head = `<tr><th scope="col">${{ minute: `Time, ${esc(ts.zone)}`, day: "Date", month: "Month" }[grain]}</th>${lanes ? '<th scope="col">Lane</th>' : ""}<th scope="col">What happened</th>${notes ? '<th scope="col">Note</th>' : ""}<th scope="col">Since the last</th></tr>`;
  const body = model.byTime.map((r, i) => {
    const since = i ? sinceText(model.byTime[i - 1].at, r.at, grain) : "";
    return `<tr><td>${esc(r.cell || r.value)}</td>${lanes ? `<td>${esc(r.lane.name)}</td>` : ""}<th scope="row" class="whole">${esc(r.name)}</th>${notes ? `<td>${esc(r.note || "")}</td>` : ""}<td>${esc(since)}</td></tr>`;
  }).join("");
  const events = model.rows.filter((r) => r.type === "event").length, spans = model.rows.length - events;
  const count = (n, one) => `${n} ${one}${n === 1 ? "" : "s"}`;
  const first = model.byTime[0];
  // The row that ends last; an event at the same moment as a span's end wins, since it is written at that moment.
  const last = model.rows.reduce((a, b) => (b.end > a.end || (b.end === a.end && b.type === "event") ? b : a));
  const zone = grain === "minute" ? ` ${esc(ts.zone)}` : "";
  const lines = [`${model.rows.length} rows: ${[events && count(events, "event"), spans && count(spans, "span")].filter(Boolean).join(" and ")}, from ${esc(timeText(first.at, ts))} to ${esc(timeText(last.last, ts))}${zone} (${lengthText(first.at, last.end, grain)}).`];
  if (model.gap) lines.push(`Longest gap: ${lengthText(model.gap.from, model.gap.to, grain)}, from ${esc(timeText(model.gap.shown, ts))} to ${esc(timeText(model.gap.to, ts))}.`);
  // The longest span that has ended; a span still running has no length yet.
  const ended = model.rows.filter((r) => r.type === "span" && !r.running);
  if (ended.length) { const long = ended.reduce((a, b) => (b.end - b.at > a.end - a.at ? b : a)); lines.push(`Longest span: ${esc(long.name)}, ${long.length}.`); }
  const running = model.rows.filter((r) => r.running).length;
  if (running) lines.push(`${running === 1 ? "1 span is" : `${running} spans are`} still running on ${esc(model.asOf.shown)}.`);
  for (const m of ts.marks) lines.push(model.asOf && m.at === model.asOf.at && m.name === `As of ${model.asOf.shown}` ? `A line at ${esc(model.asOf.shown)}: the ${grain === "minute" ? "time" : "day"} this page was written.` : `A line at ${esc(timeText(m.at, ts))}: ${esc(m.name)}.`);
  return `<div class="table-wrap is-text" role="region" aria-label="The rows of the timeline" tabindex="0"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>\n<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

module.exports = { readTimeline, layoutTimeline, drawTimeline: layoutTimeline, wordsOf, timeText, lengthText, MOST };
