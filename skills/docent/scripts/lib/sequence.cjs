// Sequence diagrams: participants stand at the top, each with a track, and messages run from top to bottom.
// The desktop form is a scene for svg.cjs and passes the spacing rules in geometry.cjs. The phone form is a script:
// one row for each message. Both come with the same steps in words, for a screen reader, a phone and paper.
const { check, HEAD } = require("./geometry.cjs");
const { textWidth } = require("./text.cjs");
const { fail, words, id } = require("./blocks.cjs");

const MOST = { participants: 6, messages: 24, cases: 3, name: 20, verb: 24, when: 32 };
const HEADER = { y: 16, h: 36 };
const ROW = 44; // between two messages
const LOOP = { w: 44, h: 26 }; // a call to itself: the loop to the right of the track, and half its height
const nameW = (s) => textWidth(s, 14, 600);
const noteW = (s) => textWidth(s, 12, 400);
const even = (n) => 2 * Math.ceil(n / 2);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Checks sequence data. Returns a model with participants, a flat list of messages (each with its case), and the cases. */
function readSequence(data) {
  if (data.place != null && data.place !== "flow") fail(`a sequence diagram sits in the text flow; "place" must be "flow"`);
  if (data.form != null) fail(`a sequence diagram has no "form"; the renderer picks the desktop form or the script`);
  if (!Array.isArray(data.participants)) fail(`"participants" must be a list`);
  if (data.participants.length < 2 || data.participants.length > MOST.participants) fail(`a sequence diagram has 2 to ${MOST.participants} participants; this one has ${data.participants.length}`);
  const model = { id: id(data.id, '"id"'), label: words(data.label, '"label"', 400), place: "flow", kind: "sequence", parts: [], chain: null };
  model.lanes = data.participants.map((p, i) => ({ id: id(p?.id, `the id of participant ${i + 1}`), name: words(p.name, `the name of participant ${i + 1}`, MOST.name) }));
  model.lanes.forEach((p, i) => { if (model.lanes.findIndex((o) => o.id === p.id) !== i) fail(`two participants have the id "${p.id}"`); });
  if (!Array.isArray(data.messages) || !data.messages.length) fail(`"messages" must be a list with at least one message`);
  const legs = [], cases = [];
  const message = (m, where) => {
    if (!m || typeof m !== "object" || Array.isArray(m)) fail(`${where} must be an object with "from", "to" and "verb"`);
    const from = model.lanes.findIndex((p) => p.id === m.from), to = model.lanes.findIndex((p) => p.id === m.to);
    if (from < 0 || to < 0) fail(`${where} goes from "${m.from}" to "${m.to}"; both must be ids of participants`);
    if (m.reply != null && typeof m.reply !== "boolean") fail(`"reply" of ${where} must be true or false`);
    if (m.reply && from === to) fail(`${where} is a reply to itself; a reply goes back to another participant`);
    return { n: legs.length + 1, from, to, verb: words(m.verb, `the verb of ${where}`, MOST.verb), reply: m.reply === true };
  };
  data.messages.forEach((m, i) => {
    if (m && m.alt != null) {
      if (cases.length) fail(`message ${i + 1} is a second group; a sequence diagram has one group of alternatives`);
      if (!Array.isArray(m.alt) || m.alt.length < 2 || m.alt.length > MOST.cases) fail(`the group of alternatives has 2 to ${MOST.cases} cases`);
      m.alt.forEach((c, j) => {
        const when = words(c?.when, `the "when" of case ${j + 1}`, MOST.when);
        if (!Array.isArray(c.messages) || !c.messages.length) fail(`case ${j + 1} ("${when}") must have at least one message`);
        const first = legs.length;
        c.messages.forEach((cm, k) => {
          if (cm && cm.alt != null) fail(`case ${j + 1} holds a group; a group cannot sit inside a group`);
          legs.push({ ...message(cm, `message ${k + 1} of case ${j + 1}`), case: j });
        });
        cases.push({ when, first, last: legs.length - 1 });
      });
    } else legs.push(message(m, `message ${i + 1}`));
  });
  if (legs.length > MOST.messages) fail(`a sequence diagram has at most ${MOST.messages} messages; this one has ${legs.length}`);
  model.legs = legs;
  model.cases = cases;
  return model;
}

/** The desktop form: a track for each participant, and one row for each message. */
function desktop(model) {
  const { lanes, legs, cases } = model;
  const headW = Math.max(96, ...lanes.map((p) => nameW(p.name) + 32));
  // Two tracks are far enough apart for each verb to sit in its first gap, and for a call to itself with its verb.
  const gapNeed = legs.map((l) => (l.from === l.to ? (l.from < lanes.length - 1 ? LOOP.w + 16 + noteW(l.verb) + 16 : 0) : noteW(l.verb) + 40));
  const S = even(Math.max(headW + 24, 120, ...gapNeed));
  const x = lanes.map((_, i) => 16 + headW / 2 + i * S);
  const bands = [], notes = [], scene = { form: "sequence", bands, gaps: [], tracks: [], lanes: [], parts: [], legs: [], notes };
  // y is the height of the current message. A case is a band in the page color: it starts 22px below the row before
  // it (or 8px below the band before it), its label sits at its top, and its first message sits 54px below its top.
  let y = HEADER.y + HEADER.h + 34, band = null;
  legs.forEach((leg, i) => {
    const c = leg.case == null ? null : cases[leg.case];
    if (c && c.first === i) {
      band = { y: band ? band.y + band.h + 8 : y - ROW + 22, when: c.when };
      y = band.y + 54;
    }
    const self = leg.from === leg.to;
    if (self) y += 20;
    const xa = x[leg.from], xb = x[leg.to], dir = Math.sign(xb - xa);
    let pts, mark, verb;
    if (self) {
      pts = [[xa, y - LOOP.h], [xa + LOOP.w, y - LOOP.h], [xa + LOOP.w, y + LOOP.h], [xa, y + LOOP.h]];
      mark = [xa + LOOP.w, y];
      verb = { x: xa + LOOP.w + 16, y: y + 4, s: leg.verb, cls: "verb", anchor: "start" };
    } else {
      pts = [[xa, y], [xb, y]];
      mark = [(xa + x[leg.from + dir]) / 2, y]; // in the first gap after the sender
      verb = { x: mark[0], y: y - 16, s: leg.verb, cls: "verb", anchor: "middle" };
    }
    scene.legs.push({ n: leg.n, from: lanes[leg.from].id, to: lanes[leg.to].id, sameLane: false, radius: 0, reply: leg.reply, pts, mark, verb });
    if (c && c.last === i) { band.h = y + (self ? LOOP.h : 10) + 12 - band.y; bands.push(band); }
    y += ROW + (self ? 20 : 0) + (c && c.last === i && cases.at(-1) === c ? 10 : 0); // the row after the group keeps clear of its last band
  });
  const right = Math.max(x[x.length - 1] + headW / 2 + 16, ...scene.legs.map((l) => (l.verb.anchor === "start" ? l.verb.x + noteW(l.verb.s) + 16 : 0)));
  scene.w = even(right);
  scene.h = y - ROW + 34;
  for (const b of bands) {
    Object.assign(b, { x: 8, w: scene.w - 16 });
    notes.push({ x: 20, y: b.y + 18, s: b.when, cls: "sub", anchor: "start", knock: { x: 14, y: b.y + 4, w: noteW(b.when) + 12, h: 20 } });
  }
  lanes.forEach((p, i) => {
    scene.tracks.push([x[i], HEADER.y + HEADER.h, x[i], scene.h - 12]);
    scene.parts.push({ id: p.id, shape: "card", x: x[i] - headW / 2, y: HEADER.y, w: headW, h: HEADER.h, icon: null, end: false, texts: [{ x: x[i], y: HEADER.y + 23, s: p.name, cls: "name", anchor: "middle" }] });
  });
  return scene;
}

/** The phone form: a script with one row for each message; a case is a band that holds its rows. */
function script(model) {
  const { lanes, legs, cases } = model;
  const room = 264 - 52 - 16; // what a line beside the mark may take
  const bands = [], notes = [], jumps = [];
  let y = 12, band = null;
  legs.forEach((leg, i) => {
    const c = leg.case == null ? null : cases[leg.case];
    if (c && c.first === i) { band = { y, when: c.when }; y += 24; }
    const who = leg.from === leg.to ? `${lanes[leg.from].name} → itself` : `${lanes[leg.from].name} → ${lanes[leg.to].name}`;
    const verb = leg.reply ? `reply: ${leg.verb}` : leg.verb;
    // "From → To" on one line when it fits, else on two.
    const lines = nameW(who) <= room ? [who] : [`${lanes[leg.from].name} →`, leg.from === leg.to ? "itself" : lanes[leg.to].name];
    const texts = lines.map((s, k) => ({ x: 52, y: y + 14 + k * 18, s, cls: "name", anchor: "start" }));
    texts.push({ x: 52, y: y + 14 + lines.length * 18 - 1, s: verb, cls: "verb", anchor: "start" });
    jumps.push({ n: leg.n, mark: [32, y + 16], verb: texts[0], target: texts[1], more: texts.slice(2) });
    y += 26 + lines.length * 18;
    if (c && c.last === i) { bands.push({ ...band, h: y + 4 - band.y }); y += 16; }
  });
  const w = even(Math.max(264, ...jumps.flatMap((j) => [j.verb, j.target, ...j.more]).map((t) => t.x + (t.cls === "name" ? nameW(t.s) : noteW(t.s)) + 16)));
  for (const b of bands) { Object.assign(b, { x: 8, w: w - 16 }); notes.push({ x: 20, y: b.y + 16, s: b.when, cls: "sub", anchor: "start" }); }
  return { form: "script", w, h: y + 4, bands, gaps: [], tracks: [], lanes: [], parts: [], legs: [], jumps, notes };
}

/** The steps in words, in a closed section under the drawing. */
function inWords(model) {
  const { lanes, legs, cases } = model;
  const line = (leg) => `<li value="${leg.n}">${esc(lanes[leg.from].name)} to ${leg.from === leg.to ? "itself" : esc(lanes[leg.to].name)}: ${esc(leg.verb)}${leg.reply ? " (a reply)" : ""}.</li>`;
  const out = [];
  let run = [];
  const flush = () => { if (run.length) out.push(`<ol>${run.map(line).join("")}</ol>`); run = []; };
  legs.forEach((leg, i) => {
    const c = leg.case == null ? null : cases[leg.case];
    if (c && c.first === i) { flush(); out.push(`<p>${esc(c.when)}:</p>`); }
    run.push(leg);
    if (c && c.last === i) flush();
  });
  flush();
  return out.join("\n");
}

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
