// Timing diagrams in UML notation: one row per lifeline, its state over time as a step line, a time axis with ticks,
// messages between lifelines at a moment, and duration constraints. It has its own layout: time runs left to right.
// On a phone it is a table: one row per change, with the time, the lifeline and its new state.
const { fail, words, id } = require("./blocks.cjs");
const { textWidth } = require("./text.cjs");
const uml = require("./uml.cjs");
const { wrap } = require("./graph.cjs");

const MOST = { lifelines: 4, states: 6, changes: 20, messages: 10, constraints: 6, ticks: 24, name: 20, state: 16, verb: 20, unit: 8, text: 16 };
const ROW = 24; // the height of one state level
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => String(Math.round(v * 100) / 100);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

/** Checks timing data and returns the model. */
function readTiming(data) {
  if (data.place != null && data.place !== "flow") fail(`a timing diagram sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a timing diagram has no "form"; the renderer draws it, and a table on a phone`);
  for (const key of ["lifelines", "changes"]) if (!Array.isArray(data[key])) fail(`"${key}" must be a list`);
  const time = data.time;
  if (!time || typeof time !== "object" || ![time.from, time.to, time.step].every(isNum)) fail(`"time" must be an object with the numbers "from", "to" and "step", and may have a "unit" such as "ms"`);
  if (!(time.to > time.from) || !(time.step > 0)) fail(`"time" must run forward: "to" is more than "from", and "step" is more than 0`);
  const count = Math.round((time.to - time.from) / time.step);
  if (Math.abs(count * time.step - (time.to - time.from)) > 1e-9) fail(`"time": "to" minus "from" must be a whole number of steps`);
  if (count > MOST.ticks) fail(`the time axis has ${count} steps; a timing diagram has at most ${MOST.ticks}. Use a larger "step"`);
  const unit = words(time.unit, `the unit of "time"`, MOST.unit, false);
  if (data.lifelines.length < 1 || data.lifelines.length > MOST.lifelines) fail(`a timing diagram has 1 to ${MOST.lifelines} lifelines; this one has ${data.lifelines.length}`);
  const lifelines = data.lifelines.map((l, i) => {
    const what = `lifeline ${i + 1}`;
    if (!l || typeof l !== "object") fail(`${what} must be an object with "id", "name" and "states"`);
    if (!Array.isArray(l.states) || l.states.length < 2 || l.states.length > MOST.states) fail(`${what} has 2 to ${MOST.states} "states", listed from the top of its row down`);
    const states = l.states.map((s, k) => words(s, `state ${k + 1} of ${what}`, MOST.state));
    if (new Set(states).size < states.length) fail(`${what} lists the same state twice`);
    return { index: i, id: id(l.id, `the id of ${what}`), name: words(l.name, `the name of ${what}`, MOST.name), states, changes: [], marks: [] };
  });
  lifelines.forEach((l, i) => { if (lifelines.findIndex((o) => o.id === l.id) !== i) fail(`two lifelines have the id "${l.id}"`); });
  const lifeline = (lid, where) => lifelines.find((l) => l.id === lid) || fail(`${where} names the lifeline "${lid}", which does not exist`);
  const inTime = (t, where) => { if (!isNum(t) || t < time.from || t > time.to) fail(`${where} is at ${t}; it must be a number from ${time.from} to ${time.to}`); return t; };
  if (data.changes.length < 1 || data.changes.length > MOST.changes) fail(`a timing diagram has 1 to ${MOST.changes} changes; this one has ${data.changes.length}`);
  data.changes.forEach((c, i) => {
    const what = `change ${i + 1}`;
    const l = lifeline(c?.lifeline, what);
    const at = inTime(c.at, what);
    if (!l.states.includes(c.state)) fail(`${what} sets "${l.id}" to "${c.state}", which is not one of its states`);
    if (l.changes.some((o) => o.at === at)) fail(`two changes set "${l.id}" at ${at}`);
    l.changes.push({ at, state: c.state });
  });
  for (const l of lifelines) {
    l.changes.sort((a, b) => a.at - b.at);
    if (!l.changes.length || l.changes[0].at !== time.from) fail(`the lifeline "${l.id}" has no state at ${time.from}; give it a change at the start of the time axis`);
    if (l.changes.some((c, k) => k && c.state === l.changes[k - 1].state)) fail(`the lifeline "${l.id}" changes to the state it is already in`);
  }
  if (data.messages != null && !Array.isArray(data.messages)) fail(`"messages" must be a list`);
  const messages = (data.messages || []).map((m, i) => {
    const what = `message ${i + 1}`;
    const from = lifeline(m?.from, what), to = lifeline(m.to, what);
    if (from === to) fail(`${what} goes from "${from.id}" to itself; a message in a timing diagram goes to another lifeline`);
    return { from, to, at: inTime(m.at, what), verb: words(m.verb, `the verb of ${what}`, MOST.verb) };
  });
  if (messages.length > MOST.messages) fail(`a timing diagram has at most ${MOST.messages} messages`);
  if (data.constraints != null && !Array.isArray(data.constraints)) fail(`"constraints" must be a list`);
  const constraints = (data.constraints || []).map((c, i) => {
    const what = `constraint ${i + 1}`;
    const l = lifeline(c?.lifeline, what);
    const from = inTime(c.from, `the start of ${what}`), to = inTime(c.to, `the end of ${what}`);
    if (!(to > from)) fail(`${what} ends before it starts`);
    const text = words(c.text, `the text of ${what}`, MOST.text);
    if (!/^\{.*\}$/.test(text)) fail(`the text of ${what} is a UML constraint, so it is written in braces, such as "{< 2 s}"`);
    return { l, from, to, text };
  });
  if (constraints.length > MOST.constraints) fail(`a timing diagram has at most ${MOST.constraints} constraints`);
  return { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), kind: "timing", time: { ...time, unit, count }, lifelines, messages, constraints };
}

// A time as written: twelve significant digits keep the input's precision and drop float noise such as 0.30000000000000004.
const fmt = (t) => String(Number(t.toPrecision(12)));
const at = (t, unit) => `${fmt(t)}${unit ? ` ${unit}` : ""}`;

/** The drawing: rows of lifelines, time from left to right. */
function layoutTiming(model) {
  const { time, lifelines, messages, constraints } = model;
  const nameW = Math.max(...lifelines.map((l) => textWidth(l.name, 14, 600))) + 24;
  const stateW = Math.max(...lifelines.flatMap((l) => l.states.map((s) => textWidth(s, 12)))) + 16;
  const tickLabel = (k) => fmt(time.from + k * time.step);
  const step = Math.max(48, ...Array.from({ length: time.count + 1 }, (_, k) => textWidth(tickLabel(k), 12) + 16), ...messages.map((m) => textWidth(m.verb, 12) / 2 + 24));
  const x0 = 16 + nameW + stateW + 8, x = (t) => x0 + ((t - time.from) / time.step) * step;
  const xEnd = x(time.to);
  const s = { form: "timing", uml: true, hideMarks: true, w: 0, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  // Constraints on one lifeline take slots from the top of its row: one that would meet another, by its line or its text, takes the next slot.
  const slots = new Map();
  for (const l of lifelines) {
    const ends = [];
    for (const c of constraints.filter((q) => q.l === l).sort((a, b) => a.from - b.from)) {
      const mid = (x(c.from) + x(c.to)) / 2, half = textWidth(c.text, 12) / 2;
      const from = Math.min(x(c.from), mid - half) - 8, to = Math.max(x(c.to), mid + half);
      let k = ends.findIndex((e) => e < from);
      if (k < 0) k = ends.length;
      ends[k] = to;
      slots.set(c, k);
    }
  }
  const slotsOf = (l) => Math.max(0, ...constraints.filter((c) => c.l === l).map((c) => slots.get(c) + 1));
  let y = 16;
  const rows = lifelines.map((l) => {
    const top = y, n = slotsOf(l), pad = n ? 16 + 24 * n : 20;
    const level = (st) => top + pad + ROW / 2 + ROW * l.states.indexOf(st);
    y = top + pad + ROW * l.states.length + 16;
    return { l, top, bottom: y, level };
  });
  const H = y + 40;
  // Row frames and names; the state names at the left of each row, beside their levels.
  for (const r of rows) {
    s.under.push(`<rect x="8" y="${num(r.top)}" width="${num(xEnd + 16 - 8)}" height="${num(r.bottom - r.top)}" class="u-frame is-filled"/>`);
    s.notes.push({ x: 20, y: r.top + 22, s: r.l.name, cls: "name", anchor: "start" });
    for (const st of r.l.states) {
      s.notes.push({ x: x0 - 12, y: r.level(st) + 4, s: st, cls: "sub", anchor: "end" });
      s.tracks.push([x0, r.level(st), xEnd, r.level(st)]);
    }
    // The state line: level while a state holds, an upright step where it changes.
    const pts = [];
    r.l.changes.forEach((c, k) => {
      const yy = r.level(c.state);
      if (k) pts.push([x(c.at), pts[pts.length - 1][1]]);
      pts.push([x(c.at), yy]);
    });
    pts.push([xEnd, pts[pts.length - 1][1]]);
    s.parts.push({ id: r.l.id, shape: "raw", svg: `<polyline points="${pts.map(([a, b]) => `${num(a)},${num(b)}`).join(" ")}" class="u-ln u-bold"/>`, texts: [] });
  }
  // Duration constraints: a line with a tick at each end, and the constraint above it.
  for (const c of constraints) {
    const r = rows.find((q) => q.l === c.l), cy = r.top + 30 + 24 * slots.get(c), a = x(c.from), b = x(c.to);
    s.under.push(`<path d="M${num(a)},${cy - 5} L${num(a)},${cy + 5} M${num(a)},${cy} L${num(b)},${cy} M${num(b)},${cy - 5} L${num(b)},${cy + 5}" class="u-ln"/>`);
    s.notes.push({ x: (a + b) / 2, y: cy - 8, s: c.text, cls: "sub", anchor: "middle" });
  }
  // Messages: an arrow from the sender's state line at its moment to the receiver's, leaning 12px (forward, or back at the end of the axis) so that it
  // never runs on an upright step of either line.
  const busy = []; // boxes of texts and lines that a verb must keep clear of
  for (const c of constraints) { const r = rows.find((q) => q.l === c.l); const dy = 24 * slots.get(c); busy.push({ x0: x(c.from) - 4, x1: x(c.to) + 4, y0: r.top + 14 + dy, y1: r.top + 36 + dy }); }
  for (const r of rows) { busy.push({ x0: 0, x1: s.w || 1e9, y0: r.top - 4, y1: r.top + 4 }, { x0: 0, x1: 1e9, y0: r.bottom - 4, y1: r.bottom + 4 }); for (const st of r.l.states) busy.push({ x0: x0, x1: xEnd, y0: r.level(st) - 3, y1: r.level(st) + 3 }); }
  messages.forEach((m, i) => {
    const ra = rows.find((q) => q.l === m.from), rb = rows.find((q) => q.l === m.to);
    const stateAt = (l) => [...l.changes].reverse().find((c) => c.at <= m.at).state;
    const lean = m.at === time.to ? -12 : 12; // at the end of the axis it leans back, to stay inside the frame
    const p = [x(m.at), ra.level(stateAt(m.from))], q = [x(m.at) + lean, rb.level(stateAt(m.to))];
    if (Math.abs(q[1] - p[1]) < uml.END.open.len + 28) fail(`message ${i + 1} is too short to draw: its two state lines are too close`);
    // The verb sits beside the arrow, where it meets no line and no other text; a knock-out in the page color stops the guide lines behind it.
    const tw = textWidth(m.verb, 12);
    let place = null;
    // Try spots from the middle of the arrow outward, first on its right, then on its left.
    const spots = [];
    for (let d = 0; d <= 0.4; d += 0.05) for (const f of d ? [0.5 - d, 0.5 + d] : [0.5]) spots.push(f);
    for (const left of [false, true]) {
      for (const f of spots) {
        const ax = p[0] + lean * f, ty = p[1] + (q[1] - p[1]) * f + 4, tx = left ? ax - 8 - tw : ax + 8, box = { x0: tx - 2, x1: tx + tw + 2, y0: ty - 11, y1: ty + 3 };
        if (tx - 4 >= 0 && tx + tw + 4 <= xEnd + 28 && !busy.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) { place = { tx, ty, box }; break; }
      }
      if (place) break;
    }
    if (!place) { const f = 0.5; place = { tx: p[0] + lean * f + 8, ty: p[1] + (q[1] - p[1]) * f + 4 }; place.box = { x0: place.tx - 2, x1: place.tx + tw + 2, y0: place.ty - 11, y1: place.ty + 3 }; }
    busy.push(place.box);
    s.notes.push({ x: place.tx, y: place.ty, s: m.verb, cls: "verb", anchor: "start", knock: { x: place.tx - 4, y: place.ty - 13, w: tw + 8, h: 18 } });
    s.legs.push({ n: i + 1, from: m.from.id, to: m.to.id, pts: [p, q], still: true, u: { end: "open", dashed: false }, texts: [], verb: { s: "" }, mark: p });
  });
  // The time axis, with a tick and a label at each step.
  const ay = H - 32;
  s.under.push(`<line x1="${x0}" y1="${ay}" x2="${num(xEnd)}" y2="${ay}" class="u-ln"/>` + Array.from({ length: time.count + 1 }, (_, k) => `<line x1="${num(x0 + k * step)}" y1="${ay}" x2="${num(x0 + k * step)}" y2="${ay + 5}" class="u-ln"/>`).join(""));
  for (let k = 0; k <= time.count; k++) s.notes.push({ x: x0 + k * step, y: ay + 20, s: tickLabel(k), cls: "sub", anchor: "middle" });
  if (time.unit) s.notes.push({ x: x0 - 12, y: ay + 20, s: `time (${time.unit})`, cls: "sub", anchor: "end" });
  s.w = Math.ceil(xEnd + 32);
  if (s.w % 2) s.w += 1;
  s.h = H;
  return s;
}

/** The phone form: a table with one row per change and per message, in time order. */
function tableOf(model) {
  const { time } = model;
  const events = [];
  for (const l of model.lifelines) for (const c of l.changes) events.push({ t: c.at, who: l.name, what: c.state, k: 1 });
  for (const m of model.messages) events.push({ t: m.at, who: `${m.from.name} → ${m.to.name}`, what: m.verb, k: 0 });
  events.sort((a, b) => a.t - b.t || a.k - b.k);
  const s = { form: "timing", uml: true, hideMarks: true, w: 264, h: 0, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], under: [] };
  const cx = [12, 76, 168];
  const head = [["Time", cx[0]], ["Lifeline", cx[1]], ["State", cx[2]]];
  let y = 28;
  for (const [t, xx] of head) s.notes.push({ x: xx, y: y - 8, s: t, cls: "sub", anchor: "start" });
  s.tracks.push([8, y, 256, y]);
  for (const e of events) {
    const who = wrap(e.who, "name", cx[2] - cx[1] - 8), what = wrap(e.k ? e.what : `“${e.what}”`, e.k ? "name" : "verb", 256 - cx[2]);
    const n = Math.max(who.length, what.length);
    s.notes.push({ x: cx[0], y: y + 20, s: at(e.t, time.unit), cls: "sub", anchor: "start" });
    who.forEach((w, k) => s.notes.push({ x: cx[1], y: y + 20 + 18 * k, s: w, cls: "name", anchor: "start" }));
    what.forEach((w, k) => s.notes.push({ x: cx[2], y: y + 20 + 18 * k, s: w, cls: e.k ? "name" : "verb", anchor: "start" }));
    y += 12 + 18 * n;
    s.tracks.push([8, y, 256, y]);
  }
  s.h = y + 8;
  return s;
}

/** The changes and messages in words, in time order, and the key. */
function wordsOf(model) {
  const { time } = model;
  const moments = [...new Set([...model.lifelines.flatMap((l) => l.changes.map((c) => c.at)), ...model.messages.map((m) => m.at)])].sort((a, b) => a - b);
  const lines = moments.map((t) => {
    const say = [];
    for (const m of model.messages.filter((q) => q.at === t)) say.push(`${esc(m.from.name)} sends “${esc(m.verb)}” to ${esc(m.to.name)}.`);
    for (const l of model.lifelines) for (const c of l.changes.filter((q) => q.at === t)) say.push(t === time.from ? `${esc(l.name)} is ${esc(c.state)}.` : `${esc(l.name)} becomes ${esc(c.state)}.`);
    return `<li>At ${esc(at(t, time.unit))}: ${say.join(" ")}</li>`;
  });
  const cons = model.constraints.map((c) => `<li>From ${esc(at(c.from, time.unit))} to ${esc(at(c.to, time.unit))}, ${esc(c.l.name)} keeps the constraint ${esc(c.text)}.</li>`);
  const used = ["timeline"];
  if (model.messages.length) used.push("message");
  if (model.constraints.length) used.push("duration");
  return `<ol>${lines.join("")}</ol>${cons.length ? `\n<ul>${cons.join("")}</ul>` : ""}\n${uml.keyHtml(used, OWN)}`;
}

const OWN = {
  timeline: "A thick line that steps up and down: the state of the lifeline over time, read against the state names at its left.",
  message: "A line with an open arrowhead, from one state line to another: a message from one lifeline to another at that moment.",
  duration: "A line with a tick at each end and a constraint in braces: how long that stretch may take.",
};

module.exports = { readTiming, layoutTiming, tableOf, wordsOf, MOST };
