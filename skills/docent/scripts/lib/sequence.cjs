// Sequence diagrams in UML 2.5.1 notation: lifelines stand at the top, each with a track, and messages run from top
// to bottom. A call that waits has a filled arrowhead, a message that does not wait an open one, and a reply is dashed.
// Activation bars, create and destroy, combined fragments (alt, opt, loop, par, break, critical) and ref frames follow
// the specification. The desktop form is a scene for svg.cjs and passes the spacing rules in geometry.cjs. The phone
// form is a script: one row for each message. Both come with the same steps in words, ending with a key to the marks.
const { check, HEAD } = require("./geometry.cjs");
const { textWidth } = require("./text.cjs");
const { fail, words, id } = require("./blocks.cjs");
const { keyHtml } = require("./uml.cjs");

const MOST = { participants: 6, messages: 30, operands: 3, depth: 2, name: 20, verb: 24, when: 32, ref: 32 };
const HEADER = { y: 16, h: 36 };
const ROW = 44; // between two messages
const LOOP = { w: 56, h: 26 }; // a call to itself: the loop to the right of the track, and half its height
const BAR = { half: 5, step: 6, short: 16 }; // an activation bar: half its width, the shift of a nested bar, the height of a bar with no reply
const TAB = { h: 20 }; // the tab of a frame, at its upper left, with the operator
const MANY = ["alt", "par"]; // operators with 2 or 3 operands; the others have one
const OPS = [...MANY, "opt", "loop", "break", "critical"];
const nameW = (s) => textWidth(s, 14, 600);
const noteW = (s) => textWidth(s, 12, 400);
const opW = (s) => textWidth(s, 12, 600);
const even = (n) => 2 * Math.ceil(n / 2);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const guard = (when) => (when ? `[${when}]` : "");

/** Checks sequence data. Returns a model: lifelines, a tree of items (message, fragment, ref) and the flat list of messages. */
function readSequence(data) {
  if (data.place != null && data.place !== "flow") fail(`a sequence diagram sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a sequence diagram has no "form"; the renderer picks the desktop form or the script`);
  if (!Array.isArray(data.participants)) fail(`"participants" must be a list`);
  if (data.participants.length < 2 || data.participants.length > MOST.participants) fail(`a sequence diagram has 2 to ${MOST.participants} participants; this one has ${data.participants.length}`);
  const model = { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), place: "flow", kind: "sequence", parts: [], chain: null };
  model.lanes = data.participants.map((p, i) => ({ id: id(p?.id, `the id of participant ${i + 1}`), name: words(p.name, `the name of participant ${i + 1}`, MOST.name) }));
  model.lanes.forEach((p, i) => { if (model.lanes.findIndex((o) => o.id === p.id) !== i) fail(`two participants have the id "${p.id}"`); });
  if (!Array.isArray(data.messages) || !data.messages.length) fail(`"messages" must be a list with at least one message`);
  const legs = [];
  const lane = (who, where) => { const i = model.lanes.findIndex((p) => p.id === who); return i < 0 ? fail(`${where} names "${who}", which is not a participant`) : i; };
  const flag = (m, key, where) => { if (m[key] != null && typeof m[key] !== "boolean") fail(`"${key}" of ${where} must be true or false`); return m[key] === true; };

  const message = (m, where, ctx) => {
    const from = model.lanes.findIndex((p) => p.id === m.from), to = model.lanes.findIndex((p) => p.id === m.to);
    if (from < 0 || to < 0) fail(`${where} goes from "${m.from}" to "${m.to}"; both must be ids of participants`);
    const reply = flag(m, "reply", where), async = flag(m, "async", where), create = flag(m, "create", where), destroy = flag(m, "destroy", where);
    if (reply && from === to) fail(`${where} is a reply to itself; a reply goes back to another participant`);
    if (reply && async) fail(`${where} is both a reply and "async"; a reply has its own line, so leave "async" out`);
    if ((create || destroy) && from === to) fail(`${where} ${create ? "creates" : "ends"} its own sender; it must go to another participant`);
    if (create && destroy) fail(`${where} both creates and ends "${m.to}"`);
    if ((create || destroy) && reply) fail(`${where} is a reply; a reply cannot create or end a participant`);
    const leg = { n: legs.length + 1, from, to, verb: words(m.verb, `the verb of ${where}`, MOST.verb), type: reply ? "reply" : async ? "async" : "sync", create, destroy, ctx };
    legs.push(leg);
    return { t: "msg", leg };
  };

  const items = (list, where, depth, ctx) => list.map((m, i) => {
    const what = `${where}message ${i + 1}`;
    if (!m || typeof m !== "object" || Array.isArray(m)) fail(`${what} must be an object with "from", "to" and "verb", a fragment or a "ref"`);
    if (m.ref != null) {
      const name = words(m.ref, `the "ref" of ${what}`, MOST.ref);
      if (!Array.isArray(m.over) || !m.over.length) fail(`the ref "${name}" needs "over": the ids of the participants it covers`);
      const over = m.over.map((who) => lane(who, `the ref "${name}"`)).sort((a, b) => a - b);
      if (over.at(-1) - over[0] !== over.length - 1) fail(`the ref "${name}" covers participants that do not stand side by side; name ones that do, in any order`);
      return { t: "ref", name, first: over[0], last: over.at(-1) };
    }
    const op = OPS.find((k) => m[k] != null);
    if (op) {
      if (depth >= MOST.depth) fail(`${what} is a fragment ${depth + 1} deep; fragments nest at most ${MOST.depth} deep`);
      const many = MANY.includes(op);
      const list = many ? m[op] : [m[op]];
      if (many && (!Array.isArray(list) || list.length < 2 || list.length > MOST.operands)) fail(`"${op}" has 2 to ${MOST.operands} cases`);
      if (!many && (!list[0] || typeof list[0] !== "object" || Array.isArray(list[0]))) fail(`"${op}" must be one object with "when" and "messages"`);
      const frag = { t: "frag", op, operands: [] };
      list.forEach((c, j) => {
        const needs = !["par", "critical"].includes(op);
        const when = words(c?.when, `the "when" of case ${j + 1} of "${op}"`, MOST.when, needs);
        if (!Array.isArray(c.messages) || !c.messages.length) fail(`case ${j + 1} of "${op}"${when ? ` ("${when}")` : ""} must have at least one message`);
        frag.operands.push({ when, items: items(c.messages, `${where}case ${j + 1} of "${op}", `, depth + 1, [...ctx, frag]) });
      });
      return frag;
    }
    return message(m, what, ctx);
  });
  model.items = items(data.messages, "", 0, []);
  if (legs.length > MOST.messages) fail(`a sequence diagram has at most ${MOST.messages} messages; this one has ${legs.length}`);
  // A participant made by a message is not in the drawing before it; one ended by a message is not in it after.
  model.lanes.forEach((p, i) => {
    const made = legs.find((l) => l.create && l.to === i), ended = legs.find((l) => l.destroy && l.to === i);
    if (legs.filter((l) => l.create && l.to === i).length > 1) fail(`"${p.id}" is created twice`);
    if (legs.filter((l) => l.destroy && l.to === i).length > 1) fail(`"${p.id}" is ended twice`);
    if (made) { const early = legs.find((l) => l.n < made.n && (l.from === i || l.to === i)); if (early) fail(`message ${early.n} uses "${p.id}" before message ${made.n} creates it`); }
    if (ended) { const late = legs.find((l) => l.n > ended.n && (l.from === i || l.to === i)); if (late) fail(`message ${late.n} uses "${p.id}" after message ${ended.n} ends it`); }
  });
  model.legs = legs;
  model.bars = activations(model);
  return model;
}

/**
 * Activation bars. A call (not a reply) to another participant starts a bar on the receiver; the first reply from the
 * receiver to the caller ends it (the last such reply before the caller calls it again). With no reply, the bar lasts while the receiver keeps taking part in the next
 * messages, or 16px when it does not. A call to itself gets a short bar beside the bar it sits on.
 */
function activations({ legs }) {
  const bars = [];
  legs.forEach((leg, i) => {
    if (leg.type === "reply" || leg.from === leg.to || leg.create || leg.destroy) return;
    // The last reply from the receiver to the caller before the caller calls the receiver again: a reply inside a
    // break or an alt is not the end of the call.
    let back = -1;
    for (let k = i + 1; k < legs.length; k++) {
      const l = legs[k];
      if (l.from === leg.from && l.to === leg.to && l.type !== "reply") break;
      if (l.type === "reply" && l.from === leg.to && l.to === leg.from) back = k;
    }
    let end = back;
    if (back < 0) {
      end = i;
      for (let k = i + 1; k < legs.length && (legs[k].from === leg.to || legs[k].to === leg.to) && !(legs[k].to === leg.to && legs[k].type !== "reply" && legs[k].from !== leg.to); k++) end = k;
    }
    bars.push({ lane: leg.to, start: i, end, short: back < 0 && end === i });
  });
  // The level of a bar: how many bars of the same lane it sits on.
  bars.forEach((b) => (b.level = bars.filter((o) => o !== b && o.lane === b.lane && o.start <= b.start && o.end >= b.end && (o.start < b.start || o.end > b.end || bars.indexOf(o) < bars.indexOf(b))).length));
  return bars;
}

/** How many bars cover lane at message i: its level there. */
const levelAt = (bars, lane, i) => bars.filter((b) => b.lane === lane && b.start <= i && i <= b.end).length;

/** The desktop form: a track for each lifeline, one row for each message, a frame for each fragment and ref. */
function desktop(model) {
  const { lanes, legs, bars } = model;
  // Every ref, so that its frame is wide enough for its name.
  const refs = [];
  const findRefs = (list) => list.forEach((it) => (it.t === "ref" ? refs.push(it) : it.t === "frag" && it.operands.forEach((o) => findRefs(o.items))));
  findRefs(model.items);
  const refNeed = (r) => nameW(r.name) + 32 - 16; // the frame is 8px wider than the heads on each side
  const headW = Math.max(96, ...lanes.map((p) => nameW(p.name) + 32), ...refs.filter((r) => r.first === r.last).map(refNeed));
  // Two tracks are far enough apart for each verb to sit in its first gap, for a call to itself with its verb, and for
  // a message that creates a lifeline to keep its mark and verb clear of the new head.
  const gapNeed = legs.map((l) => (l.from === l.to ? (l.from < lanes.length - 1 ? LOOP.w + 30 + noteW(l.verb) + 16 : 0) : l.create ? noteW(l.verb) + 40 + headW / 2 + 40 : noteW(l.verb) + 40 + 2 * BAR.half + 4 * BAR.step));
  const S = even(Math.max(headW + 24, 120, ...gapNeed, ...refs.filter((r) => r.last > r.first).map((r) => Math.ceil((refNeed(r) - headW) / (r.last - r.first)))));
  const x = lanes.map((_, i) => 16 + headW / 2 + i * S);
  const scene = { form: "sequence", uml: true, bands: [], gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes: [], bars: [], frames: [], crosses: [] };
  const legY = [], top = lanes.map(() => HEADER.y), end = lanes.map(() => null);
  const frames = [];
  // The edge of a lifeline at message i, on the side that faces dir: the bar's edge when a bar covers it, else the track.
  const edge = (lane, i, dir) => { const lv = levelAt(bars, lane, i); return x[lane] + (lv ? dir * BAR.half + (lv - 1) * BAR.step : 0); };

  let y = HEADER.y + HEADER.h + 34, bottom = y, fresh = false; // fresh: the row right under a guard, which already has room above it
  const place = (list, depth) => {
    for (const item of list) {
      if (item.t === "msg") {
        const leg = item.leg, i = leg.n - 1;
        const self = leg.from === leg.to;
        if ((self && !fresh) || leg.create) y += 20;
        fresh = false;
        legY[i] = y;
        const xa = x[leg.from], xb = x[leg.to], dir = Math.sign(xb - xa);
        let pts, mark, verb;
        if (self) {
          const lv = levelAt(bars, leg.from, i), start = xa + (lv ? BAR.half + (lv - 1) * BAR.step : 0), nest = xa - BAR.half + lv * BAR.step;
          pts = [[start, y - LOOP.h], [start + LOOP.w, y - LOOP.h], [start + LOOP.w, y + LOOP.h], [nest + 2 * BAR.half, y + LOOP.h]];
          mark = [start + LOOP.w, y];
          verb = { x: start + LOOP.w + 16, y: y + 4, s: leg.verb, cls: "verb", anchor: "start" };
          scene.bars.push({ x: nest, y: y + LOOP.h - 8, w: 2 * BAR.half, h: 20 });
          bottom = y + LOOP.h + 12;
        } else {
          const a = edge(leg.from, i, dir);
          let b;
          if (leg.create) { b = xb - dir * (headW / 2); top[leg.to] = y - HEADER.h / 2; }
          else if (leg.destroy) { b = xb - dir * 12; end[leg.to] = y; scene.crosses.push([xb, y]); }
          else b = edge(leg.to, i, -dir);
          pts = [[a, y], [b, y]];
          mark = leg.create ? [(a + b) / 2, y] : [(xa + x[leg.from + dir]) / 2, y]; // in the first gap after the sender
          verb = { x: mark[0], y: y - 16, s: leg.verb, cls: "verb", anchor: "middle" };
          bottom = y + (leg.create ? HEADER.h / 2 : 10);
        }
        scene.legs.push({ n: leg.n, from: lanes[leg.from].id, to: lanes[leg.to].id, sameLane: false, radius: 0, reply: leg.type === "reply", open: leg.type !== "sync", pts, mark, verb });
        y += ROW + (self ? 20 : 0) + (leg.create ? 20 : 0);
      } else if (item.t === "ref") {
        const fy = y - 22;
        frames.push({ ref: item, depth, y: fy, h: 44 });
        bottom = fy + 44;
        y = bottom + 32;
        fresh = false;
      } else {
        const frame = { frag: item, depth, y: y - ROW + 22, guards: [], dividers: [] };
        frames.push(frame);
        item.operands.forEach((o, k) => {
          let from = frame.y;
          if (k) { from = bottom + 12; frame.dividers.push(from); }
          frame.guards.push({ y: from, s: guard(o.when), first: !k });
          y = from + 54;
          fresh = true;
          place(o.items, depth + 1);
        });
        frame.h = bottom + 12 - frame.y;
        bottom = frame.y + frame.h;
        y = bottom + 32;
        fresh = false;
      }
    }
  };
  place(model.items, 0);
  const right = Math.max(x[x.length - 1] + headW / 2 + 16, ...scene.legs.map((l) => (l.verb.anchor === "start" ? l.verb.x + noteW(l.verb.s) + 16 : 0)));
  scene.w = even(right);
  scene.h = bottom + 22;
  for (const f of frames) {
    if (f.ref) {
      const x0 = x[f.ref.first] - headW / 2 - 8, x1 = x[f.ref.last] + headW / 2 + 8;
      scene.frames.push({ ref: true, x: x0, y: f.y, w: x1 - x0, h: f.h, op: "ref", tabW: opW("ref") + 20, guards: [], dividers: [], name: { x: (x0 + x1) / 2, y: f.y + 28, s: f.ref.name, cls: "name", anchor: "middle" } });
      continue;
    }
    const inset = 8 + 8 * f.depth, tabW = opW(f.frag.op) + 20;
    const guards = f.guards.filter((g) => g.s).map((g) => {
      const gx = g.first ? inset + tabW + 8 : inset + 12, gy = g.y + 15;
      return { x: gx, y: gy, s: g.s, cls: "sub", anchor: "start", knock: { x: gx - 6, y: g.y + 3, w: noteW(g.s) + 12, h: 18 } };
    });
    scene.frames.push({ x: inset, y: f.y, w: scene.w - 2 * inset, h: f.h, op: f.frag.op, tabW, guards, dividers: f.dividers });
  }
  // Activation bars, from the row where they start to the row where they end.
  for (const b of bars) {
    const y0 = legY[b.start], y1 = b.short ? y0 + BAR.short : legY[b.end];
    scene.bars.push({ x: x[b.lane] - BAR.half + b.level * BAR.step, y: y0, w: 2 * BAR.half, h: y1 - y0 });
  }
  lanes.forEach((p, i) => {
    scene.tracks.push([x[i], top[i] + HEADER.h, x[i], end[i] ?? scene.h - 12]);
    scene.parts.push({ id: p.id, shape: "card", sharp: true, x: x[i] - headW / 2, y: top[i], w: headW, h: HEADER.h, icon: null, end: false, texts: [{ x: x[i], y: top[i] + 23, s: p.name, cls: "name", anchor: "middle" }] });
  });
  return scene;
}

const note = (leg) => (leg.type === "reply" ? "reply" : leg.type === "async" ? "no wait" : leg.create ? "creates" : leg.destroy ? "ends" : "");

/** The phone form: a script with one row for each message; each case of a fragment is a band that holds its rows. */
function script(model) {
  const { lanes } = model;
  const room = 264 - 52 - 16; // what a line beside the mark may take
  const bands = [], notes = [], jumps = [];
  let y = 12, tail = 0;
  const rows = (list, depth) => {
    for (const item of list) {
      if (item.t === "msg") {
        const leg = item.leg;
        const who = leg.from === leg.to ? `${lanes[leg.from].name} → itself` : `${lanes[leg.from].name} → ${lanes[leg.to].name}`;
        const verb = note(leg) ? `${note(leg)}: ${leg.verb}` : leg.verb;
        // "From → To" on one line when it fits, else on two.
        const lines = nameW(who) <= room - 8 * depth ? [who] : [`${lanes[leg.from].name} →`, leg.from === leg.to ? "itself" : lanes[leg.to].name];
        const x = 52 + 8 * depth;
        const texts = lines.map((s, k) => ({ x, y: y + 14 + k * 18, s, cls: "name", anchor: "start" }));
        texts.push({ x, y: y + 14 + lines.length * 18 - 1, s: verb, cls: "verb", anchor: "start" });
        jumps.push({ n: leg.n, mark: [32 + 8 * depth, y + 16], verb: texts[0], target: texts[1], more: texts.slice(2) });
        y += 26 + lines.length * 18;
        tail = 0;
      } else if (item.t === "ref") {
        bands.push({ y, h: 48, depth, label: "ref", name: `${item.name}: ${lanes[item.first].name}${item.last > item.first ? ` to ${lanes[item.last].name}` : ""}` });
        y += 64;
        tail = 16;
      } else {
        item.operands.forEach((o) => {
          const band = { y, depth, label: `${item.op} ${guard(o.when)}`.trim() };
          bands.push(band); // before the bands inside it, so that it is painted under them
          y += 24;
          rows(o.items, depth + 1);
          band.h = y + 4 - band.y;
          y += 16;
          tail = 16;
        });
      }
    }
  };
  rows(model.items, 0);
  const w = even(Math.max(264, ...jumps.flatMap((j) => [j.verb, j.target, ...j.more]).map((t) => t.x + (t.cls === "name" ? nameW(t.s) : noteW(t.s)) + 16), ...bands.filter((b) => b.name).map((b) => 20 + 8 * b.depth + nameW(b.name) + 16)));
  for (const b of bands) {
    Object.assign(b, { x: 8 + 8 * b.depth, w: w - 16 - 16 * b.depth, inner: b.depth > 0 });
    notes.push({ x: b.x + 12, y: b.y + 16, s: b.label, cls: "sub", anchor: "start" });
    if (b.name) notes.push({ x: b.x + 12, y: b.y + 36, s: b.name, cls: "name", anchor: "start" });
  }
  return { form: "script", w, h: y + 4 - tail, bands, gaps: [], tracks: [], lanes: [], parts: [], legs: [], jumps, notes };
}

/** The opening line of each case of a fragment, in words. */
const intro = { alt: "One of these happens.", par: "These happen at the same time.", opt: null, loop: null, break: null, critical: "This runs as one step that nothing can interrupt." };
function caseLine(op, when) {
  if (op === "opt") return /^if /i.test(when) ? `Only ${when[0].toLowerCase()}${when.slice(1)}:` : `Only when ${when}:`;
  if (op === "loop") return `Repeated, ${when}:`;
  if (op === "break") return `${when}: this happens, and the rest is skipped:`;
  return when ? `${when}:` : op === "par" ? "At the same time:" : "As one step:";
}

/** The steps in words, in a closed section under the drawing, and a key to the marks it uses. */
function inWords(model) {
  const { lanes } = model;
  const suffix = (leg) => (leg.type === "reply" ? " (a reply)" : leg.type === "async" ? " (it does not wait for an answer)" : leg.create ? ` (this creates ${esc(lanes[leg.to].name)})` : leg.destroy ? ` (this ends ${esc(lanes[leg.to].name)})` : "");
  const line = (leg) => `<li value="${leg.n}">${esc(lanes[leg.from].name)} to ${leg.from === leg.to ? "itself" : esc(lanes[leg.to].name)}: ${esc(leg.verb)}${suffix(leg)}.</li>`;
  const out = [];
  let run = [];
  const flush = () => { if (run.length) out.push(`<ol>${run.map(line).join("")}</ol>`); run = []; };
  const walk = (list) => {
    for (const item of list) {
      if (item.t === "msg") run.push(item.leg);
      else if (item.t === "ref") { flush(); out.push(`<p>The steps of “${esc(item.name)}” happen here, between ${esc(lanes[item.first].name)}${item.last > item.first ? ` and ${esc(lanes[item.last].name)}` : ""}. They are drawn in their own diagram.</p>`); }
      else {
        flush();
        if (intro[item.op]) out.push(`<p>${intro[item.op]}</p>`);
        for (const o of item.operands) { out.push(`<p>${esc(caseLine(item.op, o.when))}</p>`); walk(o.items); flush(); }
      }
    }
  };
  walk(model.items);
  flush();
  // The key: only the marks and operators this drawing uses.
  const used = [];
  const legs = model.legs;
  if (legs.some((l) => l.type === "sync")) used.push("sync");
  if (legs.some((l) => l.type === "async")) used.push("async");
  if (legs.some((l) => l.type === "reply")) used.push("reply");
  if (model.bars.length || legs.some((l) => l.from === l.to)) used.push("activation");
  if (legs.some((l) => l.destroy)) used.push("cross");
  const ops = new Set();
  const opsOf = (list) => list.forEach((it) => { if (it.t === "frag") { ops.add(it.op); it.operands.forEach((o) => opsOf(o.items)); } else if (it.t === "ref") ops.add("ref"); });
  opsOf(model.items);
  used.push(...OPS.concat("ref").filter((op) => ops.has(op)));
  out.push(keyHtml(used, OWN));
  return out.join("\n");
}

/** Sentences of the key for the marks and operators that only a sequence diagram has. */
const OWN = {
  activation: "A thin bar on a lifeline: the participant is busy with a call.",
  cross: "A cross at the end of a lifeline: the participant is ended and takes no more messages.",
  alt: "alt: one of the cases happens, chosen by the condition in brackets.",
  opt: "opt: the messages happen only when the condition in brackets holds.",
  loop: "loop: the messages repeat while the condition in brackets holds.",
  par: "par: the cases happen at the same time.",
  break: "break: when the condition in brackets holds, these messages happen and the rest of the frame is skipped.",
  critical: "critical: these messages run as one step that nothing can interrupt.",
  ref: "ref: the steps are drawn in another diagram.",
};

/** Lays out both forms. Throws when a form cannot keep the spacing rules. */
function layoutSequence(model) {
  const scene = desktop(model);
  const problems = check(scene);
  if (problems.length) throw new Error(`the sequence diagram cannot be drawn within the spacing rules: ${problems[0].msg}`);
  const phone = script(model);
  const phoneProblems = check(phone);
  if (phoneProblems.length) throw new Error(`the script form cannot be drawn within the spacing rules: ${phoneProblems[0].msg}`);
  return { scene, phone, words: inWords(model) };
}

module.exports = { readSequence, layoutSequence, MOST, HEAD };
